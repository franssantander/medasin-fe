import { expect, test, type Page } from "@playwright/test";
import { idleFocusDashboard } from "@/test-utils/focus-fixture";
import type { ProjectListCard } from "./type";

test.use({ actionTimeout: 15_000 });

const work = { uuid: "30000000-0000-4000-8000-000000000001", name: "Work", slug: "work", icon: "Briefcase" };
const finance = { uuid: "30000000-0000-4000-8000-000000000002", name: "Finance", slug: "finance", icon: "Wallet" };

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
    area: work,
    goals: { count: 0, url: null },
    ...overrides,
  };
}

const projects: ProjectListCard[] = [
  makeProject(1, { name: "Product launch", status: "in_progress", progress_percentage: 40, due_date: "2099-01-10", goals: { count: 2, url: null } }),
  makeProject(2, { name: "Website redesign", description: "Refresh the marketing site" }),
  makeProject(3, { name: "Tax filing", area: finance, status: "in_progress", progress_percentage: 70, due_date: "2026-01-01", is_overdue: true, days_overdue: 3 }),
  makeProject(4, { name: "Reading list", area: null, status: "completed", progress_percentage: 100 }),
];

type ProjectReply = { status: number; data?: unknown; message?: string };

async function fixture(page: Page) {
  let projectReply: ProjectReply | undefined;
  let hold: Promise<void> | undefined;
  await page.context().addCookies([{ name: "auth_token", value: "project-list-test", url: "http://127.0.0.1:3107" }]);
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api-test/v1", "");
    let data: unknown = [];
    if (path === "/auth/me") data = { id: 1, uuid: "10000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace", username: "ada", email: "ada@example.com", font_family: "manrope" };
    else if (path === "/notifications") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    else if (path === "/focus") data = idleFocusDashboard();
    else if (path === "/subscription") data = { plan: { slug: "free", name: "Free" }, grant_type: "free", expires_at: null, enforcement_enabled: true, limits: { projects: 10, areas: 5, resources: 100 }, usage: { projects: 4, areas: 2, resources: 0 } };
    else if (path === "/project" && request.method() === "GET") {
      if (hold) await hold;
      if (projectReply) {
        await route.fulfill({ status: projectReply.status, json: { data: projectReply.data ?? null, status: projectReply.status, message: projectReply.message ?? "" } });
        return;
      }
      data = projects;
    }
    await route.fulfill({ status: 200, json: { data, status: 200, message: "OK" } });
  });

  return {
    failProjects: () => { projectReply = { status: 500, message: "Server error." }; },
    restoreProjects: () => { projectReply = undefined; },
    holdProjects: () => {
      let release!: () => void;
      hold = new Promise<void>((resolve) => { release = resolve; });
      return () => { hold = undefined; release(); };
    },
  };
}

function projectLinks(page: Page) {
  return page.getByRole("link", { name: /^Open / });
}

async function visibleProjectNames(page: Page) {
  return projectLinks(page).evaluateAll((links) =>
    links.map((link) => link.getAttribute("aria-label")?.replace(/^Open /, "")),
  );
}

test("splits projects into Active and Inbox tabs with counts", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  await expect(page.getByRole("tab", { name: "Active 3" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Inbox 1" })).toBeVisible();
  await expect(projectLinks(page)).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Open Reading list" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Inbox 1" }).click();
  await expect(projectLinks(page)).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Open Reading list" })).toBeVisible();
});

test("area labels link to their area in grid and list views, Inbox stays plain", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  const workLinks = page.getByRole("link", { name: "View area Work", exact: true });
  await expect(workLinks).toHaveCount(2);
  await expect(workLinks.first()).toHaveAttribute("href", `/projects/areas/${work.uuid}`);
  await expect(page.getByRole("link", { name: "View area Finance", exact: true })).toHaveAttribute("href", `/projects/areas/${finance.uuid}`);

  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(workLinks).toHaveCount(2);

  await page.getByRole("tab", { name: "Inbox 1" }).click();
  await expect(page.getByRole("link", { name: /^View area / })).toHaveCount(0);
  await expect(page.getByRole("list").getByText("Inbox", { exact: true })).toBeVisible();
});

test("search matches project and area names and can be cleared", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  const search = page.getByRole("searchbox", { name: "Search projects" });

  await search.fill("finance");
  await expect.poll(() => visibleProjectNames(page)).toEqual(["Tax filing"]);

  await search.fill("launch");
  await expect.poll(() => visibleProjectNames(page)).toEqual(["Product launch"]);

  await search.fill("nothing like this");
  await expect(page.getByText("No matching projects", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(projectLinks(page)).toHaveCount(3);
});

test("status filter narrows the list and only offers Overdue when it applies", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  const filters = page.getByRole("group", { name: "Filter by status" });

  await filters.getByRole("button", { name: /^Overdue 1$/ }).click();
  await expect.poll(() => visibleProjectNames(page)).toEqual(["Tax filing"]);

  await filters.getByRole("button", { name: /^Not started 1$/ }).click();
  await expect.poll(() => visibleProjectNames(page)).toEqual(["Website redesign"]);

  await filters.getByRole("button", { name: /^All 3$/ }).click();
  await expect(projectLinks(page)).toHaveCount(3);

  await page.getByRole("tab", { name: "Inbox 1" }).click();
  await expect(page.getByRole("group", { name: "Filter by status" }).getByRole("button", { name: /^Overdue/ })).toHaveCount(0);
});

test("sorts by due date with undated projects last, and by name", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  await expect.poll(() => visibleProjectNames(page)).toEqual(["Product launch", "Website redesign", "Tax filing"]);

  await page.getByRole("combobox", { name: "Sort projects" }).click();
  await page.getByRole("option", { name: "Due date", exact: true }).click();
  await expect.poll(() => visibleProjectNames(page)).toEqual(["Tax filing", "Product launch", "Website redesign"]);

  await page.getByRole("combobox", { name: "Sort projects" }).click();
  await page.getByRole("option", { name: "Name", exact: true }).click();
  await expect.poll(() => visibleProjectNames(page)).toEqual(["Product launch", "Tax filing", "Website redesign"]);
});

test("remembers the chosen list view after a reload", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  const listView = page.getByRole("button", { name: "List view", exact: true });

  await expect(page.getByRole("button", { name: "Grid view", exact: true })).toHaveAttribute("aria-pressed", "true");
  await listView.click();
  await expect(listView).toHaveAttribute("aria-pressed", "true");
  await expect(projectLinks(page)).toHaveCount(3);

  await page.reload();
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(projectLinks(page)).toHaveCount(3);
});

test("shows a loading state, then an error with a working retry", async ({ page }) => {
  const api = await fixture(page);
  const release = api.holdProjects();
  await page.goto("/projects");
  await expect(page.getByRole("status", { name: "Loading projects" })).toBeVisible();
  api.failProjects();
  release();

  await expect(page.getByText("Projects could not be loaded", { exact: true })).toBeVisible();
  api.restoreProjects();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(projectLinks(page)).toHaveCount(3);
});

test("project dialog previews the draft and switches area and appearance options", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create project", exact: true });

  await expect(dialog.getByText("Untitled project", { exact: true })).toBeVisible();
  await dialog.getByLabel("Name", { exact: true }).fill("Garden makeover");
  await expect(dialog.getByText("Garden makeover", { exact: true })).toBeVisible();

  const areaSource = dialog.getByRole("group", { name: "Area source" });
  await expect(areaSource.getByRole("button", { name: "Inbox", exact: true })).toHaveAttribute("aria-pressed", "true");
  await areaSource.getByRole("button", { name: "New area", exact: true }).click();
  await dialog.getByLabel("New area name", { exact: true }).fill("Home");
  await expect(dialog.getByText("Home", { exact: true })).toBeVisible();

  await dialog.getByRole("tab", { name: "Color", exact: true }).click();
  const blue = dialog.getByRole("button", { name: "Use Blue (#3B82F6)", exact: true });
  await blue.click();
  await expect(blue).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByLabel("Custom hex color", { exact: true })).toHaveValue("#3B82F6");
});

test("card actions still open the edit and archive dialogs", async ({ page }) => {
  await fixture(page);
  await page.goto("/projects");

  await page.getByRole("button", { name: "Actions for Product launch", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit project", exact: true });
  await expect(editDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(editDialog).toBeHidden();

  await page.getByRole("button", { name: "Actions for Product launch", exact: true }).click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Archive project?", exact: true })).toBeVisible();
});
