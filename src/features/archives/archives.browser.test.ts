import { expect, test, type Page } from "@playwright/test";
import type { Area } from "@/features/areas/type";
import type { ProjectListCard } from "@/features/projects/type";
import type { Resource } from "@/features/resources/type";

const areas: Area[] = [
  {
    id: 1, uuid: "60000000-0000-4000-8000-000000000001", name: "Finances", slug: "finances",
    icon: "Wallet", background: "#000000", background_image: null, background_image_url: null,
    description: "Financial stewardship and long-term decisions.",
    archived_at: "2026-10-08T10:00:00Z", created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-08T10:00:00Z",
  },
  {
    id: 2, uuid: "60000000-0000-4000-8000-000000000002", name: "Business", slug: "business",
    icon: "ChartLine", background: "#000000", background_image: null, background_image_url: null,
    description: null,
    archived_at: "2026-10-09T10:00:00Z", created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-09T10:00:00Z",
  },
];

const projects: ProjectListCard[] = [
  {
    uuid: "50000000-0000-4000-8000-000000000001", name: "Budget overhaul", slug: "budget-overhaul",
    description: "Rework the household budget.", icon: "Target", background: "#000000",
    status: "in_progress", progress_percentage: 40, start_date: null, due_date: null,
    is_overdue: false, days_overdue: null, archived_at: "2026-10-09T12:00:00Z",
    area: { uuid: areas[0].uuid, name: "Finances", slug: "finances", icon: "Wallet" },
    goals: { count: 0, url: null },
  },
];

const resources: Resource[] = [
  {
    id: 11, uuid: "20000000-0000-4000-8000-000000000011", title: "Tax checklist", icon: "BookOpen",
    background: "#000000", type: "note", description: "Documents to gather each spring.", url: null,
    author: null, source: null, is_favorite: false, content: null, types: ["note"],
    archived_at: "2026-10-07T10:00:00Z", created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-07T10:00:00Z",
    attachments: [], tags: [], projects: [], areas: [],
  },
];

async function mockArchives(page: Page, options: { delayMs?: number } = {}) {
  let archivedProjects = structuredClone(projects);
  const writes: { method: string; path: string }[] = [];
  const resourceSearches: (string | null)[] = [];
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api-test/v1", "");
    const method = request.method();
    let data: unknown = null;
    if (method !== "GET") writes.push({ method, path });

    if (path === "/auth/me") data = {
      id: 1, uuid: "10000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace",
      email: "ada@example.com", username: "ada", status: "active", font_family: "manrope",
    };
    else if (path === "/subscription") data = {
      plan: { slug: "free", name: "Free" }, grant_type: "free", expires_at: null, enforcement_enabled: true,
      limits: { projects: 10, areas: 5, resources: 100 }, usage: { projects: 1, areas: 2, resources: 1 },
    };
    else if (path === "/notifications") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0, next_page_url: null };
    else if (path === "/area") {
      if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      data = url.searchParams.get("status") === "archived" ? areas : [];
    } else if (path === "/project") {
      data = url.searchParams.get("status") === "archived" ? archivedProjects : [];
    } else if (path === `/project/${projects[0].uuid}/restore`) {
      archivedProjects = [];
      data = { ...projects[0], archived_at: null, area: null };
    } else if (path === "/resource" && method === "GET") {
      const search = url.searchParams.get("search");
      if (url.searchParams.get("status") === "archived") resourceSearches.push(search);
      const items = url.searchParams.get("status") === "archived"
        ? resources.filter((item) => !search || item.title.toLowerCase().includes(search.toLowerCase()))
        : [];
      data = { current_page: 1, data: items, last_page: 1, per_page: 15, total: items.length, next_page_url: null };
    } else if (path === "/resource/tags") data = [];

    await route.fulfill({ json: { data, status: 200, message: "Request was successful." } });
  });
  return { writes, resourceSearches };
}

test("shows every archived kind on one page and switches tabs through the URL", async ({ page }) => {
  await mockArchives(page);
  await page.goto("/archives");
  await expect(page.getByRole("heading", { level: 1, name: "Archives", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Areas\s*2$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Finances", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Budget overhaul", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Tax checklist", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: /^Projects/ }).click();
  await expect(page).toHaveURL(/\/archives\?tab=projects$/);
  await expect(page.getByRole("link", { name: "Open Budget overhaul", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Finances", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("tab", { name: /^Projects/ })).toHaveAttribute("aria-selected", "true");
});

test("search narrows archived items and is sent to the resource list", async ({ page }) => {
  const api = await mockArchives(page);
  await page.goto("/archives");
  await page.getByRole("searchbox", { name: "Search archives", exact: true }).fill("tax");
  await expect(page.getByRole("button", { name: "Open Tax checklist", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Finances", exact: true })).toHaveCount(0);
  await expect.poll(() => api.resourceSearches.includes("tax")).toBe(true);
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open Finances", exact: true })).toBeVisible();
});

test("restoring asks for confirmation and explains where a project goes", async ({ page }) => {
  const api = await mockArchives(page);
  await page.goto("/archives?tab=projects");
  await page.getByRole("button", { name: "Restore Budget overhaul", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Restore project?", exact: true });
  await expect(dialog).toContainText("is still archived, so this project will move to Inbox");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(api.writes).toHaveLength(0);

  await page.getByRole("button", { name: "Restore Budget overhaul", exact: true }).click();
  await dialog.getByRole("button", { name: "Restore project", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(api.writes).toContainEqual({ method: "POST", path: `/project/${projects[0].uuid}/restore` });
  await expect(page.getByRole("link", { name: "Open Budget overhaul", exact: true })).toHaveCount(0);
});

test("resource restore explains that removed links stay removed", async ({ page }) => {
  await mockArchives(page);
  await page.goto("/archives?tab=resources");
  await page.getByRole("button", { name: "Restore Tax checklist", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Restore resource?", exact: true })).toContainText("won’t be reconnected");
});

test("shows row skeletons while archives load", async ({ page }) => {
  await mockArchives(page, { delayMs: 800 });
  await page.goto("/archives");
  const loading = page.getByRole("status", { name: "Loading archived areas", exact: true });
  await expect(loading).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Finances", exact: true })).toBeVisible();
  await expect(loading).toHaveCount(0);
});
