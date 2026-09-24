import { expect, test, type Page } from "@playwright/test";
import type { CalendarPlan, PlanInput } from "./type";

test.use({ timezoneId: "Asia/Manila" });

const nextDate = new Date(Date.now() + 86_400_000).toLocaleDateString("sv-SE", {
  timeZone: "Asia/Manila",
});
const planUuid = "eb0c597d-76a4-49d5-a47f-65b7c815c519";

function makePlan(overrides: Partial<CalendarPlan> = {}): CalendarPlan {
  const start = new Date(`${nextDate}T14:30:00+08:00`).toISOString();
  return {
    uuid: planUuid,
    title: "Meet the team",
    notes: "Bring the agenda",
    date: nextDate,
    time: "14:30",
    timezone: "Asia/Manila",
    starts_at: start,
    is_all_day: false,
    project: { uuid: "28b19e4a-3fea-41bc-a84d-9a2b7812d3d4", name: "Launch" },
    area: null,
    reminder_offset_minutes: 180,
    remind_at: new Date(new Date(start).getTime() - 180 * 60_000).toISOString(),
    notified_at: null,
    email_sent_at: null,
    reminder_status: "scheduled",
    ...overrides,
  };
}

async function fixture(page: Page, options?: { rejectCreate?: boolean }) {
  let plan = makePlan();
  let deleted = false;
  let noticeRead = false;
  const writes: { method: string; path: string; input?: PlanInput }[] = [];
  const calendarRequests: URL[] = [];

  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api-test/v1", "");
    const method = request.method();
    let data: unknown = null;
    let status = 200;
    let errors: Record<string, string[]> | undefined;

    if (path === "/auth/me") {
      data = { first_name: "Test", last_name: "User", username: "tester", roles: [] };
    } else if (path === "/calendar/plans" && method === "GET") {
      calendarRequests.push(url);
      data = deleted ? [] : [plan];
    } else if (path === "/calendar/plans/upcoming" && method === "GET") {
      data = deleted ? [] : [plan];
    } else if (path === `/calendar/plans/${planUuid}` && method === "GET") {
      if (deleted) status = 404;
      data = deleted ? null : plan;
    } else if (path === "/calendar/plans" && method === "POST") {
      const input = request.postDataJSON() as PlanInput;
      writes.push({ method, path, input });
      if (options?.rejectCreate) {
        status = 422;
        errors = { time: ["This local time is missing or ambiguous in the selected timezone."] };
      } else {
        status = 201;
        data = { ...plan, ...input, uuid: "b937b467-d1a2-413c-afcb-8371b618df27" };
      }
    } else if (path === `/calendar/plans/${planUuid}` && method === "PUT") {
      const input = request.postDataJSON() as PlanInput;
      writes.push({ method, path, input });
      plan = { ...plan, title: input.title, notes: input.notes };
      data = plan;
    } else if (path === `/calendar/plans/${planUuid}` && method === "DELETE") {
      writes.push({ method, path });
      deleted = true;
    } else if (path === "/project") {
      data = [{ uuid: plan.project?.uuid, name: "Launch" }];
    } else if (path === "/area") {
      data = [{ uuid: "8e7e4b70-7820-4702-b2cf-9746e02f7dd6", name: "Work" }];
    } else if (path === "/notifications" && method === "GET") {
      const unreadOnly = url.searchParams.get("unread_only") === "1";
      const notice = {
        id: "b86b941b-f609-4e33-91ed-95bfb3c49b09",
        type: "App\\Notifications\\CalendarPlanReminder",
        data: { plan_uuid: planUuid, title: plan.title, date: plan.date, time: plan.time, timezone: plan.timezone },
        read_at: noticeRead ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      };
      const items = unreadOnly && noticeRead ? [] : [notice];
      data = { current_page: 1, data: items, last_page: 1, per_page: 15, total: items.length };
    } else if (path.endsWith("/read") && method === "PATCH") {
      noticeRead = true;
      data = { id: path.split("/")[2], read_at: new Date().toISOString() };
    } else if (path === "/trash") {
      data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    } else {
      data = [];
    }

    await route.fulfill({ status, json: { data, status, message: status === 422 ? "Invalid plan" : "Saved", errors } });
  });

  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: "Plans" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Plans calendar" })).toBeVisible();
  return { writes, calendarRequests, getPlan: () => plan, wasDeleted: () => deleted, noticeRead: () => noticeRead };
}

test("month, week, and day views request the displayed local range", async ({ page }) => {
  const state = await fixture(page);
  await expect(page.getByRole("region", { name: "Plans calendar" }).getByText("Meet the team")).toBeVisible();
  await expect(page.getByText("Upcoming")).toBeVisible();
  await page.getByRole("tab", { name: "Week" }).click();
  await page.getByRole("tab", { name: "Day" }).click();
  await expect.poll(() => state.calendarRequests.length).toBeGreaterThanOrEqual(3);
  for (const request of state.calendarRequests) {
    expect(request.searchParams.get("timezone")).toBe("Asia/Manila");
    expect(request.searchParams.get("start_date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(request.searchParams.get("end_date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
  const dayRange = state.calendarRequests.at(-1)!;
  expect(dayRange.searchParams.get("start_date")).toBe(dayRange.searchParams.get("end_date"));
});

test("create form sends all-day and custom reminder data without a time", async ({ page }) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "New plan" }).click();
  await page.getByPlaceholder("What are you planning?").fill("Conference");
  await page.getByRole("switch", { name: "All-day plan" }).click();
  await page.getByRole("combobox", { name: "Reminder" }).click();
  await page.getByRole("option", { name: "Custom" }).click();
  await page.getByRole("spinbutton", { name: "Custom reminder amount" }).fill("2");
  await page.getByRole("combobox", { name: "Custom reminder unit" }).click();
  await page.getByRole("option", { name: "Days" }).click();
  await page.getByRole("button", { name: "Create plan" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].input).toMatchObject({
    title: "Conference",
    is_all_day: true,
    timezone: "Asia/Manila",
    reminder_offset_minutes: 2880,
  });
  expect(state.writes[0].input).not.toHaveProperty("time");
});

test("plan details edit the stored timezone and delete to Trash", async ({ page }) => {
  const state = await fixture(page);
  await page.getByRole("region", { name: "Plans calendar" }).getByText("Meet the team").click();
  await expect(page.getByRole("dialog").getByText("Bring the agenda")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByPlaceholder("What are you planning?").fill("Meet the whole team");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toMatchObject({ method: "PUT", input: { timezone: "Asia/Manila", time: "14:30" } });

  await page.getByRole("region", { name: "Plans calendar" }).getByText("Meet the whole team").click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Move to Trash" }).click();
  await expect.poll(state.wasDeleted).toBe(true);
  await expect(page.getByText("No plans in this view")).toBeVisible();
});

test("the bell marks a reminder read and opens its plan", async ({ page }) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: /Notifications, 1 unread/ }).click();
  await expect(page.getByRole("dialog").getByText("Meet the team")).toBeVisible();
  await page.getByRole("button", { name: "View plan" }).click();
  await expect.poll(state.noticeRead).toBe(true);
  await expect(page).toHaveURL(new RegExp(`/plans\\?plan=${planUuid}`));
  await expect(page.getByRole("dialog").getByText("Bring the agenda")).toBeVisible();
});

test("the calendar and upcoming list fit a narrow dark screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await fixture(page);
  await expect(page.getByRole("region", { name: "Plans calendar" })).toBeVisible();
  await expect(page.getByText("Upcoming")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("a backend time validation error stays beside the form field", async ({ page }) => {
  await fixture(page, { rejectCreate: true });
  await page.getByRole("button", { name: "New plan" }).click();
  await page.getByPlaceholder("What are you planning?").fill("Early appointment");
  await page.getByRole("button", { name: "Create plan" }).click();
  await expect(page.getByText("This local time is missing or ambiguous in the selected timezone.")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "New plan" })).toBeVisible();
});
