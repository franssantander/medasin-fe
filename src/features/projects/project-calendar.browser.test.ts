import { expect, test, type Page } from "@playwright/test";
import { idleFocusDashboard } from "@/test-utils/focus-fixture";
import type { ProjectListCard } from "./type";

test.use({ actionTimeout: 15_000, locale: "en-US" });

const now = new Date();

function day(monthOffset: number, date: number) {
  const value = new Date(now.getFullYear(), now.getMonth() + monthOffset, date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function monthLabel(monthOffset: number) {
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function makeProject(index: number, overrides: Partial<ProjectListCard>): ProjectListCard {
  return {
    uuid: `20000000-0000-4000-8000-00000000000${index}`,
    name: `Project ${index}`,
    slug: `project-${index}`,
    description: null,
    icon: "Rocket",
    background: "#3B82F6",
    status: "not_started",
    progress_percentage: 0,
    start_date: null,
    due_date: null,
    is_overdue: false,
    days_overdue: null,
    archived_at: null,
    area: null,
    goals: { count: 0, url: null },
    ...overrides,
  };
}

const projects: ProjectListCard[] = [
  makeProject(1, { name: "Launch plan", status: "in_progress", progress_percentage: 40, start_date: day(0, 1), due_date: day(1, 15) }),
  makeProject(2, { name: "Tax filing", due_date: day(0, 20) }),
  makeProject(3, { name: "Garden refresh", status: "completed", progress_percentage: 100, start_date: day(0, 3), due_date: day(0, 10) }),
  makeProject(4, { name: "Reading list" }),
  makeProject(5, { name: "Website rebuild", start_date: day(0, 5), due_date: day(0, 12) }),
  makeProject(6, { name: "Sprint review", start_date: day(0, 8), due_date: day(0, 9) }),
  makeProject(7, { name: "Summer trip", start_date: day(4, 2), due_date: day(4, 9) }),
];

async function fixture(page: Page) {
  await page.context().addCookies([{ name: "auth_token", value: "project-calendar-test", url: "http://127.0.0.1:3107" }]);
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api-test/v1", "");
    let data: unknown = [];
    if (path === "/auth/me") data = { id: 1, uuid: "10000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace", username: "ada", email: "ada@example.com", font_family: "manrope" };
    else if (path === "/notifications") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    else if (path === "/focus") data = idleFocusDashboard();
    else if (path === "/subscription") data = { plan: { slug: "free", name: "Free" }, grant_type: "free", expires_at: null, enforcement_enabled: true, limits: { projects: 10, areas: 5, resources: 100 }, usage: { projects: 7, areas: 0, resources: 0 } };
    else if (path === "/project" && request.method() === "GET") data = projects;
    await route.fulfill({ status: 200, json: { data, status: 200, message: "OK" } });
  });
}

async function openCalendar(page: Page) {
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Project calendar", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("timeline view lists each scheduled project of the month once", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  const dialog = await openCalendar(page);

  await expect(dialog.getByRole("button", { name: "Timeline", exact: true })).toHaveAttribute("aria-pressed", "true");
  const rows = dialog.getByRole("list", { name: "Scheduled projects" }).getByRole("link");
  await expect(rows).toHaveCount(5);
  await expect(dialog.getByRole("link", { name: /^Launch plan, / })).toHaveCount(1);
  await expect(dialog.getByRole("link", { name: /^Launch plan, / })).toHaveAttribute("href", `/projects/${projects[0].uuid}`);
  await expect(dialog.getByRole("link", { name: /^Tax filing is due / })).toHaveCount(1);
  await expect(dialog.getByRole("link", { name: /^Summer trip/ })).toHaveCount(0);
  await expect(dialog.getByText("1 project has no dates", { exact: true })).toBeVisible();
});

test("month navigation, Today, and jumping out of an empty month", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  const dialog = await openCalendar(page);
  const today = dialog.getByRole("button", { name: "Today", exact: true });

  await expect(dialog.getByText(monthLabel(0), { exact: true })).toBeVisible();
  await expect(today).toBeDisabled();

  await dialog.getByRole("button", { name: "Next month", exact: true }).click();
  await dialog.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(dialog.getByText(monthLabel(2), { exact: true })).toBeVisible();
  await expect(dialog.getByText(/^Nothing scheduled in /)).toBeVisible();

  await dialog.getByRole("button", { name: /^Next: / }).click();
  await expect(dialog.getByText(monthLabel(4), { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /^Summer trip, / })).toHaveCount(1);

  await today.click();
  await expect(dialog.getByText(monthLabel(0), { exact: true })).toBeVisible();
});

test("month view is remembered and collapses busy days behind +N more", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  let dialog = await openCalendar(page);

  await dialog.getByRole("button", { name: "Month", exact: true }).click();
  await expect(dialog.getByRole("region", { name: "Project month calendar" })).toBeVisible();

  await page.reload();
  dialog = await openCalendar(page);
  await expect(dialog.getByRole("button", { name: "Month", exact: true })).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("button", { name: /^Show all 4 projects on / }).first().click();
  const popover = page.locator('[data-slot="popover-content"]');
  await expect(popover.getByRole("link")).toHaveCount(4);
  await expect(popover.getByRole("link", { name: /^Sprint review, / })).toBeVisible();
});
