import { expect, test, type Page } from "@playwright/test";

type SearchType =
  | "project"
  | "area"
  | "resource"
  | "note"
  | "journal"
  | "letter"
  | "plan"
  | "habit"
  | "goal";

type SearchItem = {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string | null;
  snippet: string | null;
  match_field: string;
  archived: boolean;
  updated_at: string;
  area_uuid?: string;
};

type SearchGroup = {
  type: SearchType;
  label: string;
  total: number;
  items: SearchItem[];
};

const projectUuid = "d6aa595e-8ff1-4f9e-adb7-a46c1e4e8990";
const noteUuid = "02c237eb-9785-4914-892e-d72711c40119";
const habitUuid = "79fccdb7-963a-40f0-a5be-b7bfb124eafc";
const goalUuid = "ad897dcb-a05e-4145-83d7-6af582249aba";
const areaUuid = "483bc58c-80cf-4ea3-bfef-4baf5d6245bb";

function item(type: SearchType, id: string, title: string, extra: Partial<SearchItem> = {}): SearchItem {
  return {
    id,
    type,
    title,
    subtitle: null,
    snippet: null,
    match_field: "title",
    archived: false,
    updated_at: "2026-09-25T10:00:00Z",
    ...extra,
  };
}

function group(type: SearchType, label: string, items: SearchItem[]): SearchGroup {
  return { type, label, total: items.length, items };
}

const defaultGroups: SearchGroup[] = [
  group("project", "Projects", [item("project", projectUuid, "Atlas project", { subtitle: "Area · Work" })]),
  group("note", "Notes", [item("note", noteUuid, "Atlas research note", { snippet: "Researching the Atlas launch" })]),
];

async function fixture(page: Page, initialGroups: SearchGroup[] = defaultGroups) {
  const searches: URL[] = [];
  let groups = initialGroups;
  let malformed = false;
  let searchStatus = 200;
  let userId = 7;

  await page.context().addCookies([{
    name: "auth_token",
    value: "playwright-session",
    url: "http://127.0.0.1:3107",
  }]);

  await page.route("**/api-test/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api-test/v1", "");
    let data: unknown = [];

    if (path === "/auth/me") {
      data = {
        id: userId,
        first_name: "Test",
        last_name: "User",
        full_name: "Test User",
        username: `tester-${userId}`,
        email: `tester-${userId}@example.com`,
      };
    } else if (path === "/notifications") {
      data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    } else if (path === `/project/${projectUuid}`) {
      data = {
        uuid: projectUuid,
        name: "Atlas project",
        slug: "atlas-project",
        description: null,
        icon: "FolderKanban",
        background: null,
        status: "in_progress",
        progress_percentage: 0,
        start_date: null,
        due_date: null,
        is_overdue: false,
        days_overdue: null,
        archived_at: null,
        area: null,
        goals: { count: 0, url: null },
        boards: [],
        resources: [],
      };
    } else if (path === "/search") {
      searches.push(url);
      if (searchStatus !== 200) {
        await route.fulfill({
          status: searchStatus,
          json: { data: null, status: searchStatus, message: "Too many requests" },
        });
        return;
      }
      data = malformed
        ? { query: url.searchParams.get("q"), groups: [{ type: "invalid" }] }
        : {
            query: url.searchParams.get("q"),
            groups: groups.filter((entry) => !url.searchParams.get("type") || entry.type === url.searchParams.get("type")),
          };
    } else if (path === "/habits") {
      data = [
        {
          id: 1,
          uuid: habitUuid,
          area_id: null,
          name: "Atlas habit",
          icon: "Repeat2",
          description: null,
          frequency: "daily",
          schedule: null,
          is_active: true,
          created_at: "2026-09-25T10:00:00Z",
          updated_at: "2026-09-25T10:00:00Z",
          area: null,
        },
      ];
    } else if (path === "/habits/calendar") {
      data = { habits: [], check_ins: {}, start_date: "2026-09-21", end_date: "2026-09-27" };
    } else if (path === `/area/${areaUuid}`) {
      data = {
        id: 1,
        uuid: areaUuid,
        name: "Work",
        slug: "work",
        icon: "Briefcase",
        background: null,
        background_image: null,
        background_image_url: null,
        description: null,
        archived_at: null,
        created_at: "2026-09-25T10:00:00Z",
        updated_at: "2026-09-25T10:00:00Z",
      };
    } else if (path === `/area/${areaUuid}/goals/${goalUuid}`) {
      data = {
        id: 8,
        uuid: goalUuid,
        area_id: 1,
        title: "Atlas goal",
        icon: "Star",
        description: null,
        status: "in_progress",
        start_date: null,
        due_date: null,
        completed_at: null,
        created_at: "2026-09-25T10:00:00Z",
        updated_at: "2026-09-25T10:00:00Z",
      };
    } else if (path === `/area/${areaUuid}/goals`) {
      data = { items: { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 }, counts: { all: 0, active: 0, completed: 0, cancelled: 0 } };
    } else if (path === "/area") {
      data = [];
    }

    await route.fulfill({ json: { data, status: 200, message: "OK" } });
  });

  await page.goto("/settings/preferences");
  await expect(page.getByText("Appearance", { exact: true })).toBeVisible();

  return {
    searches,
    setGroups: (next: SearchGroup[]) => { groups = next; },
    setMalformed: (next: boolean) => { malformed = next; },
    setSearchStatus: (next: number) => { searchStatus = next; },
    setUserId: (next: number) => { userId = next; },
  };
}

test("shortcut focuses search, short input stays local, and a filter scopes the request", async ({ page }) => {
  const state = await fixture(page);
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", { name: "Search everything" });
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-expanded", "true");

  await input.fill("a");
  await page.waitForTimeout(400);
  expect(state.searches).toHaveLength(0);

  await input.fill("at");
  await input.fill("atlas");
  await expect.poll(() => state.searches.length).toBe(1);
  expect(state.searches[0].searchParams.get("q")).toBe("atlas");
  await expect(page.getByRole("option", { name: /Atlas project/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Atlas research note/ })).toBeVisible();

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect.poll(() => state.searches.length).toBe(2);
  expect(state.searches[1].searchParams.get("type")).toBe("project");
  await expect(page.getByRole("option", { name: /Atlas project/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Atlas research note/ })).toHaveCount(0);
});

test("search stays at the left of the header and above Notes content", async ({ page }) => {
  await fixture(page);

  for (const width of [1440, 900, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/notes");
    await expect(page.getByRole("heading", { name: "Notes", exact: true }).first()).toBeVisible();

    const input = page.getByRole("combobox", { name: "Search everything" });
    const header = page.locator("#app-shell > div > header");
    const headerBounds = await header.boundingBox();
    const inputBounds = await input.boundingBox();
    expect(headerBounds).not.toBeNull();
    expect(inputBounds).not.toBeNull();
    expect(inputBounds!.x - headerBounds!.x).toBeLessThan(80);

    await input.click();
    const placeholder = page.getByText("Find anything in your workspace");
    await expect(placeholder).toBeVisible();
    expect(await placeholder.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      ));
    })).toBe(true);
    await input.fill("a");
    await expect(page.getByText("Keep typing to search")).toBeVisible();

    await input.fill("atlas");
    const option = page.getByRole("option", { name: /Atlas research note/ });
    await expect(option).toBeVisible();
    expect(await option.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      ));
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("arrow keys move across groups and Enter opens the active record", async ({ page }) => {
  await fixture(page);
  const input = page.getByRole("combobox", { name: "Search everything" });
  await input.fill("atlas");
  await expect(page.getByRole("option", { name: /Atlas research note/ })).toBeVisible();

  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", await page.getByRole("option", { name: /Atlas project/ }).getAttribute("id") || "missing");
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", await page.getByRole("option", { name: /Atlas research note/ }).getAttribute("id") || "missing");
  await input.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/notes\\?note=${noteUuid}$`));
});

test("Escape and outside click close search while preserving the query", async ({ page }) => {
  await fixture(page);
  const input = page.getByRole("combobox", { name: "Search everything" });
  await input.fill("atlas");
  await expect(page.getByRole("option", { name: /Atlas project/ })).toBeVisible();
  await input.press("Escape");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(input).toHaveValue("atlas");

  await input.click();
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await page.mouse.click(1200, 900);
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(input).toHaveValue("atlas");
});

test("opening a result saves the query in recent searches for that user", async ({ page }) => {
  const state = await fixture(page);
  const input = page.getByRole("combobox", { name: "Search everything" });
  await input.fill("atlas");
  await page.getByRole("option", { name: /Atlas project/ }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${projectUuid}$`));

  await page.goto("/settings/preferences");
  await input.click();
  await expect(page.getByText("Recent searches")).toBeVisible();
  await expect(page.getByRole("button", { name: "atlas", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "atlas", exact: true }).click();
  await expect(input).toHaveValue("atlas");
  await expect(page.getByRole("option", { name: /Atlas project/ })).toBeVisible();

  state.setUserId(8);
  await page.reload();
  await input.click();
  await expect(page.getByRole("button", { name: "atlas", exact: true })).toHaveCount(0);
});

test("malformed search data shows retry and recovers without crashing", async ({ page }) => {
  const state = await fixture(page);
  state.setMalformed(true);
  const input = page.getByRole("combobox", { name: "Search everything" });
  await input.fill("atlas");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  state.setMalformed(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("option", { name: /Atlas project/ })).toBeVisible();
});

test("empty results and a throttled request each show a useful state", async ({ page }) => {
  const state = await fixture(page, []);
  const input = page.getByRole("combobox", { name: "Search everything" });
  await input.fill("atlas");
  await expect(page.getByText("No results for “atlas”")).toBeVisible();

  state.setSearchStatus(429);
  await input.fill("atlas2");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  state.setSearchStatus(200);
  state.setGroups(defaultGroups);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("option", { name: /Atlas project/ })).toBeVisible();
});

test("HTML-like titles and snippets render as inert text", async ({ page }) => {
  const state = await fixture(page, [
    group("note", "Notes", [item("note", noteUuid, '<img src=x onerror="window.__searchInjected=true">', {
      snippet: '<svg onload="window.__searchInjected=true">Evil text</svg>',
    })]),
  ]);
  const input = page.getByRole("combobox", { name: "Search everything" });
  await input.fill("evil");
  const option = page.getByRole("option");
  await expect(option).toContainText("<img src=x onerror=");
  await expect(option).toContainText("<svg onload=");
  await expect(option.locator("img, svg[onload]")).toHaveCount(0);
  await expect(option.locator("mark")).toContainText("Evil");
  expect(await page.evaluate(() => Reflect.get(window, "__searchInjected"))).toBeUndefined();
  expect(state.searches).toHaveLength(1);

  state.setGroups([group("note", "Notes", [item("note", noteUuid, "Atlas (v1)+ release")])]);
  await input.fill("(v1)+");
  await expect(option).toContainText("Atlas (v1)+ release");
  await expect(option.locator("mark")).toHaveText("(v1)+");
});

test("mobile search opens in a sheet and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.getByRole("button", { name: "Open search" }).click();
  const sheet = page.getByRole("dialog", { name: "Search" });
  await expect(sheet).toBeVisible();
  const input = sheet.getByRole("combobox", { name: "Search everything" });
  await input.fill("atlas");
  await expect(page.getByRole("option", { name: /Atlas project/ })).toBeVisible();
  await input.press("Escape");
  await expect(sheet).not.toBeVisible();
});

test("habit results open their UUID deep link and edit dialog", async ({ page }) => {
  await fixture(page, [group("habit", "Habits", [item("habit", habitUuid, "Atlas habit")])]);
  await page.getByRole("combobox", { name: "Search everything" }).fill("atlas");
  await page.getByRole("option", { name: /Atlas habit/ }).click();
  await expect(page).toHaveURL(new RegExp(`/habits\\?habit=${habitUuid}$`));
  await expect(page.getByRole("dialog", { name: "Edit habit" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Edit habit" })).toBeVisible();
});

test("goal results open their Area and fetch a goal beyond the list page", async ({ page }) => {
  await fixture(page, [group("goal", "Goals", [item("goal", goalUuid, "Atlas goal", { area_uuid: areaUuid })])]);
  await page.getByRole("combobox", { name: "Search everything" }).fill("atlas");
  await page.getByRole("option", { name: /Atlas goal/ }).click();
  await expect(page).toHaveURL(new RegExp(`/areas/${areaUuid}\\?tab=goals&goal=${goalUuid}$`));
  await expect(page.getByRole("dialog", { name: "Edit goal" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Edit goal" })).toBeVisible();
});
