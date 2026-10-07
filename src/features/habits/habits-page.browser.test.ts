import { expect, test, type Page } from "@playwright/test";
import { idleFocusDashboard } from "@/test-utils/focus-fixture";
import type { Habit, HabitCheckIn, HabitInput } from "./type";

test.use({ timezoneId: "Asia/Manila", locale: "en-US", actionTimeout: 15_000 });
const today = "2026-10-08";
const health = {
  uuid: "20000000-0000-4000-8000-000000000001",
  name: "Wellbeing",
  icon: "Heart",
  archived_at: null,
};
const work = {
  uuid: "20000000-0000-4000-8000-000000000002",
  name: "Work",
  icon: "Briefcase",
  archived_at: null,
};
const makeHabit = (
  id: number,
  name: string,
  extra: Partial<Habit> = {},
): Habit => ({
  id,
  uuid: "10000000-0000-4000-8000-" + String(id).padStart(12, "0"),
  area_id: null,
  name,
  icon: "Repeat2",
  description: null,
  frequency: "daily",
  schedule: null,
  is_active: true,
  created_at: "2026-08-01T04:00:00Z",
  updated_at: "2026-08-01T04:00:00Z",
  area: null,
  ...extra,
});
const initialHabits = [
  makeHabit(1, "Read for 20 minutes"),
  makeHabit(2, "Go for a walk", {
    frequency: "weekly",
    schedule: { days: ["monday", "thursday"] },
    area: health,
  }),
  makeHabit(3, "Reflect on the month", {
    frequency: "monthly",
    schedule: { dates: [8, 31] },
    area: work,
  }),
  makeHabit(4, "Meditate", { is_active: false, area: health }),
];
type Request = {
  path: string;
  method: string;
  body: Record<string, unknown> | null;
  params: Record<string, string>;
};
type Options = {
  habits?: Habit[];
  dark?: boolean;
  focus?: boolean;
  linked?: boolean;
  failList?: boolean;
  failCalendar?: boolean;
  holdCalendar?: boolean;
};

async function fixture(page: Page, options: Options = {}) {
  await page.clock.install({ time: new Date("2026-10-08T04:00:00Z") });
  await page
    .context()
    .addCookies([
      {
        name: "auth_token",
        value: "habits-test",
        url: "http://127.0.0.1:3107",
      },
    ]);
  await page.addInitScript(
    (dark) => localStorage.setItem("theme", dark ? "dark" : "light"),
    Boolean(options.dark),
  );
  let habits = structuredClone(options.habits ?? initialHabits);
  const checkIns: Record<string, HabitCheckIn[]> = {
    [initialHabits[0].uuid]: [
      { date: "2026-10-04", completed: true },
      { date: "2026-10-05", completed: false },
      { date: "2026-10-06", completed: true },
    ],
    [initialHabits[1].uuid]: [{ date: "2026-10-05", completed: true }],
    [initialHabits[3].uuid]: [{ date: "2026-10-04", completed: true }],
  };
  const requests: Request[] = [];
  const failures = new Map<string, number>();
  if (options.failList) failures.set("GET /habits", 99);
  if (options.failCalendar) failures.set("GET /habits/calendar", 99);
  const holds = new Map<string, Promise<void>>();
  const hold = (key: string) => {
    let release!: () => void;
    holds.set(
      key,
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    return release;
  };
  const releaseCalendar = options.holdCalendar
    ? hold("GET /habits/calendar")
    : () => {};
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api-test/v1", "");
    const method = request.method();
    const body = request.postData()
      ? (request.postDataJSON() as Record<string, unknown>)
      : null;
    const key = method + " " + path;
    requests.push({
      path,
      method,
      body,
      params: Object.fromEntries(url.searchParams),
    });
    const wait = holds.get(key);
    holds.delete(key);
    if (wait) await wait;
    if ((failures.get(key) ?? 0) > 0) {
      failures.set(key, failures.get(key)! - 1);
      await route.fulfill({
        status: 500,
        json: {
          data: null,
          status: 500,
          message: "Request failed. Try again.",
        },
      });
      return;
    }
    let data: unknown = [];
    if (path === "/auth/me")
      data = {
        id: 1,
        first_name: "Ada",
        last_name: "Lovelace",
        full_name: "Ada Lovelace",
        username: "ada",
        email: "ada@example.com",
        font_family: "manrope",
      };
    else if (path === "/notifications")
      data = {
        current_page: 1,
        data: [],
        last_page: 1,
        per_page: 15,
        total: 0,
      };
    else if (path === "/focus") {
      const dashboard = idleFocusDashboard();
      if (options.focus)
        dashboard.active_session = {
          uuid: "30000000-0000-4000-8000-000000000001",
          type: "focus",
          status: "running",
          duration_seconds: 1500,
          remaining_seconds: 1500,
          started_at: "2026-10-08T04:00:00Z",
          ends_at: "2026-10-08T04:25:00Z",
          server_now: "2026-10-08T04:00:00Z",
          completed_at: null,
          task: {
            uuid: "40000000-0000-4000-8000-000000000001",
            title: "Study the design",
          },
          mood: null,
          reflection_note: null,
        };
      data = dashboard;
    } else if (path === "/habits/calendar") {
      const start = url.searchParams.get("start_date")!;
      const end = url.searchParams.get("end_date")!;
      data = {
        habits,
        start_date: start,
        end_date: end,
        check_ins: Object.fromEntries(
          Object.entries(checkIns).map(([uuid, entries]) => [
            uuid,
            entries.filter((entry) => entry.date >= start && entry.date <= end),
          ]),
        ),
      };
    } else if (path === "/habits" && method === "GET") data = habits;
    else if (path === "/habits" && method === "POST") {
      const input = body as unknown as HabitInput;
      const habit = makeHabit(100 + habits.length, input.name, {
        ...input,
        created_at: "2026-10-08T04:00:00Z",
        area:
          [health, work].find((area) => area.uuid === input.area_uuid) ?? null,
      });
      habits.push(habit);
      data = habit;
    } else if (path.startsWith("/habits/") && path.includes("/check-ins/")) {
      const [, , uuid, , date] = path.split("/");
      const entries = (checkIns[uuid] ??= []);
      const entry = { date, completed: Boolean(body?.completed) };
      checkIns[uuid] = [...entries.filter((item) => item.date !== date), entry];
      data = entry;
    } else if (path.startsWith("/habits/")) {
      const uuid = path.split("/")[2];
      if (method === "DELETE") {
        habits = habits.filter((habit) => habit.uuid !== uuid);
        data = null;
      } else {
        habits = habits.map((habit) =>
          habit.uuid === uuid ? ({ ...habit, ...body } as Habit) : habit,
        );
        data = habits.find((habit) => habit.uuid === uuid);
      }
    } else if (path === "/area") data = [health, work];
    else if (path.endsWith("/habits/link")) {
      const area = [health, work].find((item) => path.includes(item.uuid))!;
      habits = habits.map((habit) =>
        habit.uuid === body?.habit_uuid ? { ...habit, area } : habit,
      );
      data = habits.find((habit) => habit.uuid === body?.habit_uuid);
    }
    await route.fulfill({ json: { data, status: 200, message: "Saved." } });
  });
  await page.goto(
    options.linked ? "/habits?habit=" + initialHabits[0].uuid : "/habits",
  );
  if (options.linked)
    await expect(
      page.getByRole("dialog", { name: "Edit habit", exact: true }),
    ).toBeVisible();
  else
    await expect(
      page.getByRole("heading", { name: "Habits", exact: true }),
    ).toBeVisible();
  if (
    !options.linked &&
    !options.holdCalendar &&
    !options.failList &&
    !options.failCalendar &&
    habits.length
  )
    await expect(
      page.getByRole("region", { name: "Habit calendar", exact: true }),
    ).toBeVisible();
  return {
    requests,
    hold,
    fail: (key: string, count = 1) => failures.set(key, count),
    recover: (key: string) => failures.delete(key),
    releaseCalendar,
  };
}

const calendar = (page: Page) =>
  page.getByRole("region", { name: "Habit calendar", exact: true });
const rows = (page: Page) => page.locator(".habit-calendar-row");
const selectView = (page: Page, name: string) =>
  page
    .locator('[aria-label="Calendar view"]')
    .getByRole("button", { name, exact: true })
    .click();
const todayButton = (page: Page, habit = "Read for 20 minutes") =>
  calendar(page).getByRole("button", {
    name: new RegExp("^" + habit + ", Thursday, Oct 8:"),
  });
const formDialog = (page: Page) =>
  page.getByRole("dialog", { name: /^(Add|Edit) habit$/ });

test("search, status and Area filters combine and reset without another calendar fetch", async ({
  page,
}) => {
  const state = await fixture(page);
  const calls = state.requests.filter(
    (request) => request.path === "/habits/calendar",
  ).length;
  await page
    .getByRole("textbox", { name: "Search habits", exact: true })
    .fill("wellbeing");
  await expect(rows(page)).toHaveCount(2);
  await page
    .locator('[aria-label="Habit status"]')
    .getByRole("button", { name: "Active", exact: true })
    .click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Go for a walk");
  await page.getByRole("combobox", { name: "Filter by Area" }).click();
  await page.getByRole("option", { name: "Work", exact: true }).click();
  await expect(
    page.getByText("No matching habits", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await expect(rows(page)).toHaveCount(4);
  expect(
    state.requests.filter((request) => request.path === "/habits/calendar"),
  ).toHaveLength(calls);
});

test("range summary excludes future dates and paused habits, and follows filters", async ({
  page,
}) => {
  await fixture(page);
  await expect(
    page.getByText("3 of 8 check-ins completed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Filter by Area" }).click();
  await page.getByRole("option", { name: "Unassigned", exact: true }).click();
  await expect(
    page.getByText("2 of 5 check-ins completed", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .locator('[aria-label="Habit status"]')
    .getByRole("button", { name: "Paused", exact: true })
    .click();
  await expect(
    page.getByText("No scheduled check-ins", { exact: true }),
  ).toBeVisible();
});

test("date navigation, month drill-down and Today work in every view", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Previous range" }).click();
  await expect(page.locator("#habit-range-title")).toContainText("Sep 27");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator("#habit-range-title")).toContainText("Oct 4");
  await selectView(page, "Year");
  await expect(calendar(page).getByRole("columnheader")).toHaveCount(13);
  await calendar(page)
    .getByRole("button", {
      name: /^Read for 20 minutes, October:.*Open month$/,
    })
    .click();
  await expect(page.locator("#habit-range-title")).toHaveText("October 2026");
  await expect(calendar(page).getByRole("columnheader")).toHaveCount(32);
  await selectView(page, "All time");
  await expect(
    page.getByRole("button", { name: "Previous range" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(
    page
      .locator('[aria-label="Calendar view"]')
      .getByRole("button", { name: "Week", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    state.requests
      .filter((request) => request.path === "/habits/calendar")
      .every((request) => request.params.timezone === "Asia/Manila"),
  ).toBe(true);
});

test("check-in shows saving feedback, blocks duplicate clicks and preserves scroll through refresh", async ({
  page,
}) => {
  const state = await fixture(page, {
    habits: Array.from({ length: 35 }, (_, index) =>
      makeHabit(
        index + 1,
        index ? "Routine " + (index + 1) : "Read for 20 minutes",
      ),
    ),
  });
  await calendar(page).evaluate((element) => {
    element.scrollTop = 180;
  });
  const position = await calendar(page).evaluate(
    (element) => element.scrollTop,
  );
  const release = state.hold(
    "PUT /habits/" + initialHabits[0].uuid + "/check-ins/" + today,
  );
  await todayButton(page).evaluate((element: HTMLButtonElement) =>
    element.click(),
  );
  await expect(
    calendar(page).getByRole("button", {
      name: /Read for 20 minutes, Thursday, Oct 8: saving check-in/,
    }),
  ).toBeDisabled();
  await todayButton(page).evaluate((element: HTMLButtonElement) => {
    element.click();
    element.click();
  });
  expect(
    state.requests.filter((request) => request.method === "PUT"),
  ).toHaveLength(1);
  release();
  await expect(todayButton(page)).toHaveAttribute("aria-pressed", "true");
  expect(await calendar(page).evaluate((element) => element.scrollTop)).toBe(
    position,
  );
  await todayButton(page).evaluate((element: HTMLButtonElement) =>
    element.click(),
  );
  await expect(todayButton(page)).toHaveAttribute("aria-pressed", "false");
  expect(
    state.requests
      .filter((request) => request.method === "PUT")
      .map((request) => request.body?.completed),
  ).toEqual([true, false]);
});

test("failed check-in preserves data and can be retried", async ({ page }) => {
  const state = await fixture(page);
  state.fail("PUT /habits/" + initialHabits[0].uuid + "/check-ins/" + today);
  await todayButton(page).click();
  await expect(
    page.getByText("Request failed. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(todayButton(page)).toBeEnabled();
  await expect(todayButton(page)).toHaveAttribute("aria-pressed", "false");
  await todayButton(page).click();
  await expect(todayButton(page)).toHaveAttribute("aria-pressed", "true");
});

test("future, off-schedule and paused check-ins are unavailable", async ({
  page,
}) => {
  await fixture(page);
  await expect(
    calendar(page).getByRole("button", {
      name: "Read for 20 minutes, Friday, Oct 9: upcoming",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    calendar(page).getByRole("button", {
      name: "Go for a walk, Wednesday, Oct 7: not scheduled",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(todayButton(page, "Meditate")).toBeDisabled();
});

test("the empty workspace still offers habit creation", async ({ page }) => {
  await fixture(page, { habits: [] });
  await expect(
    page.getByText("A small habit is a good start", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add your first habit" }).click();
  await expect(formDialog(page)).toBeVisible();
});

for (const kind of ["list", "calendar"] as const) {
  test(kind + " loading failure offers a working retry", async ({ page }) => {
    const state = await fixture(page, {
      failList: kind === "list",
      failCalendar: kind === "calendar",
    });
    await expect(
      page.getByText(
        kind === "list"
          ? "Habits could not be loaded"
          : "Habit history could not be loaded",
        { exact: true },
      ),
    ).toBeVisible();
    state.recover("GET " + (kind === "list" ? "/habits" : "/habits/calendar"));
    await page
      .getByRole("button", {
        name: kind === "list" ? "Try again" : "Refresh range",
        exact: true,
      })
      .click();
    await expect(rows(page)).toHaveCount(4);
  });
}

test("loading keeps the card and controls stable until history arrives", async ({
  page,
}) => {
  const state = await fixture(page, { holdCalendar: true });
  await expect(
    page.getByLabel("Loading habit calendar", { exact: true }),
  ).toBeVisible();
  const bounds = await page.locator(".habits-workspace-card").boundingBox();
  state.releaseCalendar();
  await expect(rows(page)).toHaveCount(4);
  const loaded = await page.locator(".habits-workspace-card").boundingBox();
  expect(loaded!.height).toBeCloseTo(bounds!.height, 0);
});

test("keyboard check-in and edit closing restore the row action focus", async ({
  page,
}) => {
  await fixture(page);
  const cell = todayButton(page);
  await cell.focus();
  await page.keyboard.press("Space");
  await expect(cell).toHaveAttribute("aria-pressed", "true");
  const trigger = page.getByRole("button", {
    name: "Read for 20 minutes actions",
    exact: true,
  });
  await trigger.click();
  await page.getByRole("menuitem", { name: "Edit habit", exact: true }).click();
  await expect(
    formDialog(page).getByRole("textbox", { name: "Habit name", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(formDialog(page)).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("form validation, schedule choices and create payload work", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  const dialog = formDialog(page);
  await dialog.getByRole("button", { name: "Add habit", exact: true }).click();
  await expect(
    dialog.getByText("Name is required.", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Habit name", exact: true })
    .fill("Practice guitar");
  await dialog.getByRole("combobox", { name: "Repeat", exact: true }).click();
  await page
    .getByRole("option", { name: "Selected weekdays", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Add habit", exact: true }).click();
  await expect(
    dialog.getByText("Choose at least one day.", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Monday", exact: true }).click();
  await dialog.getByRole("button", { name: "Thursday", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: /Description/ })
    .fill("Enjoy a little music");
  await dialog
    .getByRole("switch", { name: "Active habit", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Add habit", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const created = state.requests.find(
    (request) => request.path === "/habits" && request.method === "POST",
  )!;
  expect(created.body).toMatchObject({
    name: "Practice guitar",
    frequency: "custom",
    schedule: { days: ["monday", "thursday"] },
    is_active: false,
    area_uuid: null,
    description: "Enjoy a little music",
  });
  await expect(rows(page)).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "Add habit", exact: true }),
  ).toBeFocused();
});

test("monthly dates and expandable icon picker save selected values", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  const dialog = formDialog(page);
  await expect(
    dialog.getByRole("textbox", { name: "Search habit icons" }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Change icon" }).click();
  await dialog
    .getByRole("textbox", { name: "Search habit icons" })
    .fill("zzzz-no-icon");
  await expect(dialog.getByText("No icons match your search.")).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Search habit icons" })
    .fill("BookOpen");
  await dialog
    .getByRole("button", { name: "Use BookOpen icon", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Change icon" }).click();
  await dialog
    .getByRole("textbox", { name: "Habit name", exact: true })
    .fill("Review goals");
  await dialog.getByRole("combobox", { name: "Repeat", exact: true }).click();
  await page
    .getByRole("option", { name: "Selected dates monthly", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Day 31", exact: true }).click();
  await dialog.getByRole("button", { name: "Day 8", exact: true }).click();
  await dialog.getByRole("button", { name: "Add habit", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(
    state.requests.find(
      (request) => request.method === "POST" && request.path === "/habits",
    )?.body,
  ).toMatchObject({
    icon: "BookOpen",
    frequency: "monthly",
    schedule: { dates: [8, 31] },
  });
});

test("failed save stays open; pending save blocks dismissal and duplicates", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  const dialog = formDialog(page);
  await dialog
    .getByRole("textbox", { name: "Habit name", exact: true })
    .fill("Stretch");
  state.fail("POST /habits");
  await dialog.getByRole("button", { name: "Add habit", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Request failed. Try again.",
  );
  const release = state.hold("POST /habits");
  await dialog.getByRole("button", { name: "Add habit", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("textbox", { name: "Habit name", exact: true }),
  ).toBeDisabled();
  release();
  await expect(dialog).not.toBeVisible();
  expect(
    state.requests.filter(
      (request) => request.path === "/habits" && request.method === "POST",
    ),
  ).toHaveLength(2);
});

test("deep-linked edit survives reload and removes its link after closing", async ({
  page,
}) => {
  const state = await fixture(page, { linked: true });
  await expect(formDialog(page)).toBeVisible();
  await page.reload();
  const dialog = formDialog(page);
  await expect(
    dialog.getByRole("textbox", { name: "Habit name", exact: true }),
  ).toHaveValue("Read for 20 minutes");
  await dialog
    .getByRole("textbox", { name: "Habit name", exact: true })
    .fill("Read a chapter");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/habits$/);
  expect(
    state.requests.find((request) => request.method === "PATCH")?.body?.name,
  ).toBe("Read a chapter");
  await expect(rows(page).first()).toContainText("Read a chapter");
});

test("failed deletion keeps its confirmation and supports retry", async ({
  page,
}) => {
  const state = await fixture(page);
  const trigger = page.getByRole("button", {
    name: "Read for 20 minutes actions",
    exact: true,
  });
  await trigger.click();
  await page
    .getByRole("menuitem", { name: "Move to Trash", exact: true })
    .click();
  const dialog = page.getByRole("alertdialog", {
    name: "Move habit to Trash?",
  });
  state.fail("DELETE /habits/" + initialHabits[0].uuid);
  await dialog
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Request failed. Try again.",
  );
  await expect(rows(page)).toHaveCount(4);
  await dialog
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(rows(page)).toHaveCount(3);
});

for (const viewport of [
  { width: 768, height: 700 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  for (const dark of [false, true]) {
    test(
      "desktop workspace fits " +
        viewport.width +
        "x" +
        viewport.height +
        (dark ? " dark" : " light"),
      async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await fixture(page, {
          dark,
          focus: true,
          habits: Array.from({ length: 30 }, (_, index) =>
            makeHabit(
              index + 1,
              index
                ? "A long daily routine with enough text to wrap " + (index + 1)
                : "Read for 20 minutes",
            ),
          ),
        });
        const main = page.locator("main");
        const card = await page.locator(".habits-workspace-card").boundingBox();
        expect(card!.y + card!.height).toBeLessThanOrEqual(
          viewport.height - 20,
        );
        expect(
          await main.evaluate(
            (element) => element.scrollHeight - element.clientHeight,
          ),
        ).toBeLessThanOrEqual(2);
        expect(
          await calendar(page).evaluate(
            (element) => element.scrollHeight - element.clientHeight,
          ),
        ).toBeGreaterThan(500);
        await calendar(page).evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        await expect(rows(page).last()).toBeInViewport();
        const header = await page
          .locator(".habit-calendar-header")
          .boundingBox();
        const region = await calendar(page).boundingBox();
        expect(header!.y).toBeCloseTo(region!.y, 0);
        await calendar(page).evaluate((element) => {
          element.scrollTop = 0;
        });
        await page.screenshot({
          path: testInfo.outputPath("habits-desktop.png"),
        });
      },
    );
  }
}

for (const width of [320, 390]) {
  for (const dark of [false, true]) {
    test(
      "phone Week strips and history table stay inside " +
        width +
        "px" +
        (dark ? " dark" : " light"),
      async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await fixture(page, { dark });
        const row = rows(page).first();
        const identity = await row.getByRole("rowheader").boundingBox();
        const cell = await row.getByRole("cell").first().boundingBox();
        expect(cell!.y).toBeGreaterThan(identity!.y);
        await expect(row.getByText("Sun", { exact: true })).toBeVisible();
        expect(
          await row
            .getByRole("cell")
            .first()
            .getByRole("button")
            .evaluate((element) => element.getBoundingClientRect().width),
        ).toBeGreaterThanOrEqual(44);
        expect(
          await page
            .locator("main")
            .evaluate((element) => element.scrollWidth - element.clientWidth),
        ).toBeLessThanOrEqual(2);
        await page.screenshot({
          path: testInfo.outputPath("habits-mobile.png"),
        });
        for (const view of ["Month", "Year", "All time"]) {
          await selectView(page, view);
          await expect(calendar(page)).toBeVisible();
          expect(
            await page
              .locator("main")
              .evaluate((element) => element.scrollWidth - element.clientWidth),
          ).toBeLessThanOrEqual(2);
        }
        await selectView(page, "Month");
        expect(
          await calendar(page).evaluate((element) => element.scrollWidth),
        ).toBeGreaterThan(width);
        const current = await calendar(page)
          .locator('[aria-current="date"]')
          .boundingBox();
        const region = await calendar(page).boundingBox();
        expect(current!.x).toBeGreaterThanOrEqual(region!.x + 155);
        expect(current!.x + current!.width).toBeLessThanOrEqual(
          region!.x + region!.width + 1,
        );
      },
    );
  }
}

test("short desktop lets the page scroll and the dialog footer stays accessible", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 568 });
  await fixture(page, {
    habits: Array.from({ length: 20 }, (_, index) =>
      makeHabit(index + 1, "Routine " + (index + 1)),
    ),
  });
  expect(
    await page
      .locator("main")
      .evaluate((element) => element.scrollHeight - element.clientHeight),
  ).toBeGreaterThan(500);
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  const dialog = formDialog(page);
  const bounds = await dialog.boundingBox();
  expect(bounds!.height).toBeLessThanOrEqual(568 * 0.92 + 1);
  await dialog.getByRole("combobox", { name: "Repeat", exact: true }).click();
  await page
    .getByRole("option", { name: "Selected dates monthly", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Add habit", exact: true }),
  ).toBeInViewport();
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("habits-dialog.png") });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test("sidebar collapse and viewport resize keep the card within the available height", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fixture(page, { focus: true });
  const original = await page.locator(".habits-workspace-card").boundingBox();
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Expand sidebar", exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.locator(".habits-workspace-card").boundingBox())!.width,
    )
    .toBeGreaterThan(original!.width);
  await page.setViewportSize({ width: 768, height: 700 });
  await expect
    .poll(async () =>
      page
        .locator("main")
        .evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(2);
  await page.setViewportSize({ width: 390, height: 568 });
  await expect(
    rows(page).first().getByText("Sun", { exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator("main")
      .evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBeLessThanOrEqual(2);
});

test("canceling keeps closing animation and a reopened create form starts fresh", async ({
  page,
}) => {
  await fixture(page);
  const trigger = page.getByRole("button", { name: "Add habit", exact: true });
  await trigger.click();
  let dialog = formDialog(page);
  await dialog
    .getByRole("textbox", { name: "Habit name", exact: true })
    .fill("An unsaved draft");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.locator('[data-slot="dialog-content"][data-ending-style]'),
  ).toBeAttached();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  dialog = formDialog(page);
  await expect(
    dialog.getByRole("textbox", { name: "Habit name", exact: true }),
  ).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("delete cancellation restores focus and pending deletion cannot be dismissed", async ({
  page,
}) => {
  const state = await fixture(page);
  const trigger = page.getByRole("button", {
    name: "Read for 20 minutes actions",
    exact: true,
  });
  const openDelete = async () => {
    await trigger.click();
    await page
      .getByRole("menuitem", { name: "Move to Trash", exact: true })
      .click();
  };
  await openDelete();
  let dialog = page.getByRole("alertdialog", { name: "Move habit to Trash?" });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(rows(page)).toHaveCount(4);
  await openDelete();
  dialog = page.getByRole("alertdialog", { name: "Move habit to Trash?" });
  const release = state.hold("DELETE /habits/" + initialHabits[0].uuid);
  await dialog
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await expect(dialog.getByRole("button", { name: "Moving…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  release();
  await expect(dialog).not.toBeVisible();
  await expect(rows(page)).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Add habit", exact: true }),
  ).toBeFocused();
});
