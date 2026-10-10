import { expect, test, type Page } from "@playwright/test";
import { idleFocusDashboard } from "@/test-utils/focus-fixture";
import type { Board, BoardTask, ProjectDetail } from "./type";

test.use({ actionTimeout: 15_000 });

const projectUuid = "20000000-0000-4000-8000-000000000001";
const boardUuid = "40000000-0000-4000-8000-000000000001";
const career = { uuid: "30000000-0000-4000-8000-000000000001", name: "Career", slug: "career", icon: "Briefcase" };

function resource(index: number, title: string) {
  return {
    id: index, uuid: `50000000-0000-4000-8000-00000000000${index}`, title, description: `About ${title}`, url: null, icon: "BookOpen", background: "#000000",
    archived_at: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z", content: null,
    types: ["note"], attachments: [], tags: [], projects: [], areas: [],
  };
}

const linkedResource = resource(1, "Building a Meaningful Career");
const otherResources = [resource(2, "Portfolio inspiration"), resource(3, "Interview prep checklist")];

function task(index: number, overrides: Partial<BoardTask>): BoardTask {
  return {
    uuid: `60000000-0000-4000-8000-00000000000${index}`, title: `Task ${index}`, description: null, priority: "medium", stage: "todos", position: 0,
    labels: [], resources: [], notes: [], created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z", ...overrides,
  };
}

const tasks = {
  todos: [task(1, { title: "Rewrite profile summary", priority: "high", labels: [{ uuid: "70000000-0000-4000-8000-000000000001", name: "Writing", color: "blue", hex: "#3B82F6" }] })],
  in_progress: [task(2, { title: "Draft release case study", priority: "high", stage: "in_progress" })],
  done: [
    task(3, { title: "Collect testimonials", priority: "low", stage: "done" }),
    task(4, { title: "Select featured projects", stage: "done", position: 1 }),
  ],
};

const board: Board = {
  uuid: boardUuid, name: "Board 1", position: 0, task_count: 4,
  stage_counts: { backlog: 0, todos: 1, in_progress: 1, done: 2 },
  labels: [{ uuid: "70000000-0000-4000-8000-000000000001", name: "Writing", color: "blue", hex: "#3B82F6" }],
  stages: (["backlog", "todos", "in_progress", "done"] as const).map((key, position) => ({
    uuid: `80000000-0000-4000-8000-00000000000${position}`, key, position,
    name: { backlog: "Backlog", todos: "Todos", in_progress: "In Progress", done: "Done" }[key],
    task_count: key === "backlog" ? 0 : tasks[key].length,
    tasks: key === "backlog" ? [] : tasks[key],
  })),
};

const project: ProjectDetail = {
  uuid: projectUuid, name: "Portfolio Refresh", slug: "portfolio-refresh", description: "Update case studies, profile copy, and selected work.",
  icon: "LayoutTemplate", background: "#000000", status: "in_progress", progress_percentage: 50, start_date: null, due_date: "2099-11-09",
  is_overdue: false, days_overdue: null, archived_at: null, area: career, goals: { count: 2, url: null },
  boards: [{ uuid: boardUuid, name: "Board 1", position: 0, task_count: 4, stage_counts: board.stage_counts }],
  resources: [linkedResource] as unknown as ProjectDetail["resources"],
};

async function fixture(page: Page, options: { delayMs?: number } = {}) {
  let deleted = false;
  await page.context().addCookies([{ name: "auth_token", value: "project-detail-test", url: "http://127.0.0.1:3107" }]);
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace("/api-test/v1", "");
    let data: unknown = [];
    let status = 200;
    if (options.delayMs && method === "GET" && path.startsWith(`/project/${projectUuid}`)) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
    if (path === "/auth/me") data = { id: 1, uuid: "10000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace", username: "ada", email: "ada@example.com", font_family: "manrope" };
    else if (path === "/notifications") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    else if (path === "/focus") data = idleFocusDashboard();
    else if (path === "/subscription") data = { plan: { slug: "free", name: "Free" }, grant_type: "free", expires_at: null, enforcement_enabled: true, limits: { projects: 10, areas: 5, resources: 100 }, usage: { projects: 1, areas: 1, resources: 3 } };
    else if (path === "/resource" && method === "GET") data = { current_page: 1, data: [linkedResource, ...otherResources], last_page: 1, per_page: 15, total: 3, next_page_url: null };
    else if (path === `/project/${projectUuid}` && method === "DELETE") { deleted = true; data = null; }
    else if (path === `/project/${projectUuid}` && method === "GET") {
      if (deleted) status = 404;
      data = deleted ? null : project;
    }
    else if (path === `/project/${projectUuid}/boards/${boardUuid}`) data = board;
    else if (path === "/project" && method === "GET") data = [];
    await route.fulfill({ status, json: { data, status, message: status === 200 ? "OK" : "Not found" } });
  });
}

test("header shows project details and the Edit action opens the edit dialog", async ({ page }) => {
  await fixture(page);
  await page.goto(`/projects/${projectUuid}`);

  await expect(page.getByRole("heading", { level: 1, name: "Portfolio Refresh" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to projects", exact: true })).toHaveAttribute("href", "/projects");
  await expect(page.getByRole("link", { name: "View area Career", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage goals for Portfolio Refresh", exact: true })).toContainText("2 goals");
  await expect(page.getByText("2 of 4 tasks done", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit project", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue("Portfolio Refresh");
});

test("deleting the project from the header menu returns to the project list", async ({ page }) => {
  await fixture(page);
  await page.goto(`/projects/${projectUuid}`);

  await page.getByRole("button", { name: "Actions for Portfolio Refresh", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete project?", exact: true }).getByRole("button", { name: "Delete project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
});

test("board search filters cards and the column Add task button opens a draft", async ({ page }) => {
  await fixture(page);
  await page.goto(`/projects/${projectUuid}`);

  for (const name of ["Backlog", "Todos", "In Progress", "Done"]) {
    await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('[data-slot="task-card"]')).toHaveCount(4);

  await page.getByRole("searchbox", { name: "Search tasks" }).fill("writing");
  await expect(page.locator('[data-slot="task-card"]')).toHaveCount(1);
  await expect(page.getByText("Clear the search to drag tasks", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Clear task search", exact: true }).click();
  await expect(page.locator('[data-slot="task-card"]')).toHaveCount(4);

  await page.getByRole("region", { name: "Backlog", exact: true }).getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Task title", exact: true })).toBeFocused();
});

test("opening a card shows the task drawer with property rows", async ({ page }) => {
  await fixture(page);
  await page.goto(`/projects/${projectUuid}`);

  await page.getByRole("button", { name: /Rewrite profile summary/ }).click();
  await expect(page.getByRole("button", { name: "Close task details", exact: true })).toBeVisible();
  await expect(page.getByText("Status", { exact: true })).toBeVisible();
  await expect(page.getByText("Priority", { exact: true })).toBeVisible();
  await expect(page.getByText("Label", { exact: true })).toBeVisible();
});

test("link resources dialog searches and counts the selection", async ({ page }) => {
  await fixture(page);
  await page.goto(`/projects/${projectUuid}`);

  await page.getByRole("button", { name: "Add resource", exact: true }).click();
  await page.getByRole("menuitem", { name: "Link existing", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Link existing resources", exact: true });
  await expect(dialog.getByRole("checkbox")).toHaveCount(2);

  await dialog.getByRole("textbox", { name: "Search resources" }).fill("interview");
  await expect(dialog.getByRole("checkbox")).toHaveCount(1);
  await dialog.getByText("Interview prep checklist", { exact: true }).click();
  await expect(dialog.getByText("1 selected", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Link resource", exact: true })).toBeEnabled();
});

test("shows a page-shaped skeleton while the project and board load", async ({ page }) => {
  await fixture(page, { delayMs: 1_500 });
  await page.goto(`/projects/${projectUuid}`);

  await expect(page.getByRole("status", { name: "Loading project" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading project" })).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Loading board" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading board" })).toHaveCount(0);
});
