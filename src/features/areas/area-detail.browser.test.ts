import { expect, test, type Page } from "@playwright/test";
import type { Area, Goal, Habit, Project } from "./type";

test.use({ actionTimeout: 15_000 });

const areaUuid = "60000000-0000-4000-8000-000000000001";
const projects: Project[] = [
  {
    id: 1, uuid: "50000000-0000-4000-8000-000000000001", name: "Emergency Fund Plan",
    description: "Build a dependable emergency fund.", status: "in_progress", area_id: 1,
    icon: "PiggyBank", background: "#10B981", due_date: "2099-01-15T00:00:00.000000Z", completed_at: null,
  },
  {
    id: 2, uuid: "50000000-0000-4000-8000-000000000002", name: "Pay off card",
    description: null, status: "completed", area_id: 1,
    icon: null, background: null, due_date: null, completed_at: "2026-09-01T10:00:00.000000Z",
  },
];
const resources = [
  {
    id: 1, uuid: "70000000-0000-4000-8000-000000000001", title: "Budget template", icon: "Sheet", background: "#000000",
    type: null, description: null, url: "https://example.com/budget", author: null, source: null, is_favorite: false,
    types: ["link"], tags: [{ uuid: "t1", name: "Money" }],
  },
];

function goal(index: number, title: string, overrides: Partial<Goal>): Goal {
  return {
    id: index, uuid: `80000000-0000-4000-8000-${String(index).padStart(12, "0")}`, area_id: 1, title, icon: "Target",
    description: null, status: "pending", start_date: null, due_date: null, completed_at: null,
    created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z", ...overrides,
  };
}

const goals = [
  goal(1, "Save emergency fund", { status: "in_progress", start_date: "2026-01-01T00:00:00.000000Z", due_date: "2099-12-31T00:00:00.000000Z" }),
  goal(2, "Pay off credit card", { status: "completed", completed_at: "2026-09-01T10:00:00.000000Z" }),
  goal(3, "File taxes", { status: "pending", due_date: "2020-01-15T00:00:00.000000Z" }),
];

const dateKey = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function habit(index: number, name: string, overrides: Partial<Habit> = {}): Habit {
  return {
    id: index, uuid: `90000000-0000-4000-8000-${String(index).padStart(12, "0")}`, area_id: 1, name, icon: "Footprints",
    description: null, frequency: "daily", schedule: null, is_active: true,
    created_at: "2026-01-01T10:00:00Z", updated_at: "2026-01-01T10:00:00Z", ...overrides,
  };
}

const habits = [habit(1, "Evening walk"), habit(2, "Budget review", { is_active: false })];
const habitHistory = {
  check_ins: [{ date: dateKey(-1), completed: true }],
  current_streak: 1, best_streak: 3, scheduled_count: 30, completed_count: 1, completion_rate: 3,
};

function buildArea(overrides: Partial<Area> = {}): Area {
  return {
    id: 1, uuid: areaUuid, name: "Finances", slug: "finances", icon: "Wallet", background: "#000000",
    background_image: null, background_image_url: null,
    description: "Financial stewardship and thoughtful long-term decisions.",
    archived_at: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-08T10:00:00Z",
    projects: projects as Project[], resources: resources as unknown as Area["resources"], ...overrides,
  };
}

const noteDocument = JSON.stringify([{ type: "paragraph", content: [{ type: "text", text: "Track every expense.", styles: {} }] }]);

function note(index: number, title: string, parentUuid: string | null = null) {
  return {
    id: index, uuid: `a0000000-0000-4000-8000-${String(index).padStart(12, "0")}`, area_id: 1, parent_uuid: parentUuid,
    title, content: noteDocument, is_pinned: false, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z",
  };
}

const parentNote = note(1, "Budget plan");
const childNote = note(2, "Monthly review", parentNote.uuid);
const otherNote = note(3, "Tax notes");

const page1 = <T,>(data: T[]) => ({ current_page: 1, data, last_page: 1, per_page: 15, total: data.length });

async function mockArea(page: Page, overrides: Partial<Area> = {}, options: { habitCreateErrors?: Record<string, string[]>; sectionDelayMs?: number } = {}) {
  const area = buildArea(overrides);
  const notes = [parentNote, childNote, otherNote];
  const noteTree = (parentUuid: string | null): unknown[] =>
    notes.filter((item) => item.parent_uuid === parentUuid).map((item) => ({ ...item, children: noteTree(item.uuid) }));
  const writes: { method: string; path: string }[] = [];
  const bodies: { method: string; path: string; body: Record<string, unknown> | null }[] = [];
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace("/api-test/v1", "");
    let data: unknown = null;
    if (options.sectionDelayMs && method === "GET" && /\/(goals|habits)$/.test(path)) {
      await new Promise((resolve) => setTimeout(resolve, options.sectionDelayMs));
    }
    if (method !== "GET") {
      writes.push({ method, path });
      bodies.push({ method, path, body: request.postData() ? request.postDataJSON() as Record<string, unknown> : null });
    }
    if (path === "/auth/me") data = { id: 1, uuid: "10000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", username: "ada", status: "active", font_family: "manrope" };
    else if (path === "/notifications") data = page1([]);
    else if (path === `/area/${areaUuid}`) data = area;
    else if (path === `/area/${areaUuid}/projects`) data = page1(projects);
    else if (path === `/area/${areaUuid}/resources`) data = page1(resources);
    else if (path === `/area/${areaUuid}/habits` && method === "GET") data = page1(habits);
    else if (path.startsWith(`/area/${areaUuid}/habits/`)) data = habitHistory;
    else if (path === `/area/${areaUuid}/notes/tree`) data = noteTree(null);
    else if (path === `/area/${areaUuid}/notes` && method === "POST") {
      const body = request.postDataJSON() as { title: string; parent_uuid?: string | null };
      const created = { ...note(notes.length + 1, body.title, body.parent_uuid ?? null), content: "[]" };
      notes.push(created);
      data = created;
    } else if (path.startsWith(`/area/${areaUuid}/notes/`)) {
      const found = notes.find((item) => path.endsWith(item.uuid));
      if (found && method === "PUT") Object.assign(found, request.postDataJSON());
      data = found ?? null;
    }
    else if (path === `/area/${areaUuid}/goals` && method === "GET") data = { items: page1(goals), counts: { all: 3, active: 2, completed: 1, cancelled: 0 } };
    if (options.habitCreateErrors && method === "POST" && path === `/area/${areaUuid}/habits`) {
      await route.fulfill({ status: 422, json: { message: "The submitted data is invalid.", errors: options.habitCreateErrors } });
      return;
    }
    await route.fulfill({ json: { data, status: 200, message: "OK" } });
  });
  return { writes, bodies };
}

test("area detail shows breadcrumb, header meta, and project rows", async ({ page }) => {
  await mockArea(page);
  await page.goto(`/areas/${areaUuid}`);

  await expect(page.getByRole("link", { name: "Back to areas", exact: true })).toHaveAttribute("href", "/areas");
  await expect(page.getByRole("heading", { level: 1, name: "Finances" })).toBeVisible();
  await expect(page.getByText("2 projects")).toBeVisible();
  await expect(page.getByText("1 resource", { exact: true })).toBeVisible();

  const rows = page.getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Due");
  await expect(rows.nth(1)).toContainText("Completed");
  await expect(rows.nth(1)).toContainText("No description.");
  await expect(page.getByRole("link", { name: "Open Emergency Fund Plan" })).toHaveAttribute(
    "href", `/areas/${areaUuid}/projects/${projects[0].uuid}`,
  );
});

test("detaching a project asks for confirmation first", async ({ page }) => {
  const api = await mockArea(page);
  await page.goto(`/areas/${areaUuid}`);
  await page.getByRole("button", { name: "Actions for Emergency Fund Plan" }).click();
  await page.getByRole("menuitem", { name: "Detach from area" }).click();
  const dialog = page.getByRole("dialog", { name: "Detach project?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Detach project" }).click();
  await expect.poll(() => api.writes).toContainEqual({ method: "DELETE", path: `/area/${areaUuid}/projects/${projects[0].uuid}` });
});

test("switching to resources updates the URL and lists resources", async ({ page }) => {
  await mockArea(page);
  await page.goto(`/areas/${areaUuid}`);
  await page.getByRole("tab", { name: "Resources" }).click();
  await expect(page).toHaveURL(/\?tab=resources$/);
  await expect(page.getByRole("button", { name: "Open Budget template" })).toBeVisible();
  await expect(page.getByRole("listitem").first()).toContainText("Money");
});

test("archived areas are read-only with a restore action", async ({ page }) => {
  await mockArea(page, { archived_at: "2026-10-09T10:00:00Z" });
  await page.goto(`/areas/${areaUuid}`);
  await expect(page.getByRole("link", { name: "Back to archives", exact: true })).toHaveAttribute("href", "/archives");
  await expect(page.getByText("This area is archived")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Link projects" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Actions for / })).toHaveCount(0);
});

test("goals tab shows progress, grouped goals, and timeline states", async ({ page }) => {
  await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=goals`);

  await expect(page.getByRole("img", { name: "1 of 3 goals achieved" })).toBeVisible();
  await expect(page.getByText("33%")).toBeVisible();
  await expect(page.getByRole("region", { name: "In progress" })).toContainText("Save emergency fund");
  await expect(page.getByRole("region", { name: "Up next" })).toContainText("File taxes");
  await expect(page.getByRole("region", { name: "Achieved" })).toContainText("Achieved Sep 1, 2026");
  await expect(page.getByRole("region", { name: "Up next" })).toContainText(/Overdue by \d+ days/);
});

test("quick action completes an in-progress goal", async ({ page }) => {
  const api = await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=goals`);
  await page.getByRole("button", { name: "Complete Save emergency fund" }).click();
  await expect.poll(() => api.bodies.find((item) => item.method === "PUT")).toEqual({
    method: "PUT", path: `/area/${areaUuid}/goals/${goals[0].uuid}`, body: { status: "completed" },
  });
});

test("add goal dialog submits status and a quick due date", async ({ page }) => {
  const api = await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=goals`);
  await page.getByRole("button", { name: "Add goal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add goal", exact: true });
  await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("Build investing habit");
  await dialog.getByRole("button", { name: "In progress", exact: true }).click();
  await dialog.getByRole("button", { name: "In 1 month", exact: true }).click();
  await expect(dialog.getByText(/^Due in \d+ days$/)).toBeVisible();
  await dialog.getByRole("button", { name: "Add goal", exact: true }).click();

  await expect.poll(() => api.bodies.find((item) => item.method === "POST" && item.path.endsWith("/goals"))?.body).toMatchObject({
    title: "Build investing habit", status: "in_progress", due_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  });
});

test("habits tab shows today's summary, streaks, and paused habits", async ({ page }) => {
  await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=habits`);

  await expect(page.getByRole("img", { name: "0 of 1 habits done today" })).toBeVisible();
  await expect(page.getByText("1-day streak").first()).toBeVisible();
  await expect(page.getByText("1 days")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check in Budget review for today" })).toBeDisabled();
});

test("checking in today and un-marking yesterday send check-ins", async ({ page }) => {
  test.skip(new Date().getDay() === 0, "Yesterday falls outside this week's strip on Sundays.");
  const api = await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=habits`);

  await page.getByRole("button", { name: "Check in Evening walk for today" }).click();
  await expect.poll(() => api.bodies.find((item) => item.path.endsWith(`/check-ins/${dateKey(0)}`))?.body).toMatchObject({ completed: true });

  const yesterday = page.getByRole("button", { name: /: done\. Tap to mark not done$/ }).first();
  await yesterday.click();
  await expect.poll(() => api.bodies.find((item) => item.path.endsWith(`/check-ins/${dateKey(-1)}`))?.body).toMatchObject({ completed: false });
});

test("habit starter idea fills the form and submits a daily habit", async ({ page }) => {
  const api = await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=habits`);
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add habit", exact: true });
  await dialog.getByRole("button", { name: "Read 20 minutes" }).click();
  await expect(dialog.getByRole("textbox", { name: "Habit name" })).toHaveValue("Read 20 minutes");
  await expect(dialog.getByText("Every day · 7 times a week")).toBeVisible();
  await dialog.getByRole("button", { name: "Add habit", exact: true }).click();

  await expect.poll(() => api.bodies.find((item) => item.method === "POST" && item.path === `/area/${areaUuid}/habits`)?.body).toMatchObject({
    name: "Read 20 minutes", icon: "BookOpen", frequency: "daily", schedule: null,
  });
});

test("specific days preset builds a weekday schedule", async ({ page }) => {
  const api = await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=habits`);
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add habit", exact: true });
  await dialog.getByRole("textbox", { name: "Habit name" }).fill("Deep work block");
  await dialog.getByRole("button", { name: "Specific days", exact: true }).click();
  await dialog.getByRole("button", { name: "Weekdays", exact: true }).click();
  await expect(dialog.getByText("Mon, Tue, Wed, Thu, Fri · 5 times a week")).toBeVisible();
  await dialog.getByRole("button", { name: "Add habit", exact: true }).click();

  await expect.poll(() => api.bodies.find((item) => item.method === "POST" && item.path === `/area/${areaUuid}/habits`)?.body).toMatchObject({
    frequency: "custom", schedule: { days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
  });
});

test("server schedule errors appear under the day picker", async ({ page }) => {
  await mockArea(page, {}, { habitCreateErrors: { "schedule.days": ["Choose at least one weekday."] } });
  await page.goto(`/areas/${areaUuid}?tab=habits`);
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add habit", exact: true });
  await dialog.getByRole("textbox", { name: "Habit name" }).fill("Stretch");
  await dialog.getByRole("button", { name: "Specific days", exact: true }).click();
  await dialog.getByRole("button", { name: "Monday", exact: true }).click();
  await dialog.getByRole("button", { name: "Add habit", exact: true }).click();
  await expect(dialog.getByText("Choose at least one weekday.")).toBeVisible();
});

test("notes tab shows nested pages with a page breadcrumb", async ({ page }) => {
  await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=notes&note=${childNote.uuid}`);

  const pages = page.getByRole("navigation", { name: "Pages" });
  await expect(pages.getByRole("button", { name: "Collapse Budget plan" })).toHaveAttribute("aria-expanded", "true");
  await expect(pages.getByRole("button", { name: "Monthly review" })).toHaveAttribute("aria-current", "page");
  const breadcrumb = page.getByRole("navigation", { name: "Note breadcrumb" });
  await expect(breadcrumb).toContainText("Area notes");
  await expect(breadcrumb.getByRole("button", { name: "Budget plan" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Note title" })).toHaveValue("Monthly review");
});

test("adding a page inside a parent creates a sub-page and opens it", async ({ page }) => {
  const api = await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=notes`);

  const pages = page.getByRole("navigation", { name: "Pages" });
  await pages.getByRole("button", { name: "Add a page inside Tax notes" }).click();
  await expect.poll(() => api.bodies.find((item) => item.method === "POST")?.body).toMatchObject({
    title: "Untitled", parent_uuid: otherNote.uuid,
  });
  await expect(page.getByRole("textbox", { name: "Note title" })).toBeFocused();
  await expect(pages.getByRole("button", { name: "Untitled" })).toHaveAttribute("aria-current", "page");
});

test("searching pages and renaming a page saves it", async ({ page }) => {
  const api = await mockArea(page);
  await page.goto(`/areas/${areaUuid}?tab=notes`);

  const pages = page.getByRole("navigation", { name: "Pages" });
  await page.getByRole("searchbox", { name: "Search pages" }).fill("monthly");
  await expect(pages.getByText("1 result")).toBeVisible();
  await pages.getByRole("button", { name: /Monthly review/ }).click();
  await expect(page.getByRole("textbox", { name: "Note title" })).toHaveValue("Monthly review");

  await page.getByRole("textbox", { name: "Note title" }).fill("Monthly money review");
  await expect.poll(() => api.bodies.find((item) => item.method === "PUT")?.body).toMatchObject({
    title: "Monthly money review",
  });
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
});

test("archived area notes are read-only", async ({ page }) => {
  await mockArea(page, { archived_at: "2026-10-09T10:00:00Z" });
  await page.goto(`/areas/${areaUuid}?tab=notes`);

  await expect(page.getByText("Read only")).toBeVisible();
  await expect(page.getByRole("button", { name: "New page" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Add a page inside/ })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Note title" })).toHaveAttribute("readonly", "");
});

test("goals and habits tabs show content-shaped skeletons while loading", async ({ page }) => {
  await mockArea(page, {}, { sectionDelayMs: 1_500 });
  await page.goto(`/areas/${areaUuid}?tab=goals`);

  await expect(page.getByRole("status", { name: "Loading goals" })).toBeVisible();
  await expect(page.getByRole("img", { name: "1 of 3 goals achieved" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading goals" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Habits" }).click();
  await expect(page.getByRole("status", { name: "Loading habits" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add habit", exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading habits" })).toHaveCount(0);
});
