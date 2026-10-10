import { expect, test, type Page } from "@playwright/test";
import type { Resource, ResourceTag } from "./type";

const tags: ResourceTag[] = [
  { uuid: "40000000-0000-4000-8000-000000000001", name: "Career" },
  { uuid: "40000000-0000-4000-8000-000000000002", name: "Learning" },
];

function resource(index: number, overrides: Partial<Resource> = {}): Resource {
  return {
    id: index, uuid: `20000000-0000-4000-8000-0000000000${String(index).padStart(2, "0")}`,
    title: `Resource ${index}`, icon: "BookOpen", background: "#3B82F6",
    type: "note", description: `Saved note ${index}`, url: null, author: null,
    source: null, is_favorite: false, content: null, types: ["note"],
    archived_at: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-09T10:00:00Z",
    attachments: [], tags: [], projects: [], areas: [],
    ...overrides,
  };
}

const resources = [
  resource(1, {
    title: "Building a Meaningful Career", types: ["note", "file"], tags,
    projects: [{ uuid: "50000000-0000-4000-8000-000000000001", name: "Portfolio Refresh" }],
    areas: [{ uuid: "60000000-0000-4000-8000-000000000001", name: "Career" }],
  }),
  resource(2, { title: "Design reading list", types: ["link"] }),
];

async function mockResources(page: Page, options: { delayMs?: number } = {}) {
  const requests: URL[] = [];
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api-test/v1", "");
    let data: unknown = null;

    if (path === "/auth/me") data = {
      id: 1, uuid: "10000000-0000-4000-8000-000000000001",
      first_name: "Ada", last_name: "Lovelace", email: "ada@example.com",
      username: "ada", status: "active", font_family: "manrope",
    };
    else if (path === "/subscription") data = {
      plan: { slug: "free", name: "Free" }, grant_type: "free", expires_at: null,
      enforcement_enabled: true, limits: { projects: 10, areas: 5, resources: 100 },
      usage: { projects: 0, areas: 0, resources: resources.length },
    };
    else if (path === "/resource/tags") data = tags;
    else if (["/area", "/project"].includes(path)) data = [];
    else if (path === "/notifications") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0, next_page_url: null };
    else if (path === "/resource" && request.method() === "GET") {
      requests.push(url);
      if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      const type = url.searchParams.get("type");
      const tag = url.searchParams.get("tag_uuid");
      const items = resources.filter((item) =>
        (!type || item.types.includes(type as Resource["types"][number])) &&
        (!tag || item.tags.some((value) => value.uuid === tag)));
      data = { current_page: 1, data: items, last_page: 1, per_page: 15, total: items.length, next_page_url: null };
    } else if (path.startsWith("/resource/") && request.method() === "GET") {
      if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      data = resources.find((item) => path === `/resource/${item.uuid}`) ?? null;
    }

    await route.fulfill({ json: { data, status: 200, message: "Request was successful." } });
  });
  return { requests };
}

test("shows a card-shaped skeleton while resources load", async ({ page }) => {
  await mockResources(page, { delayMs: 800 });
  await page.goto("/resources");
  const loading = page.getByRole("status", { name: "Loading resources", exact: true });
  await expect(loading).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Building a Meaningful Career", exact: true })).toBeVisible();
  await expect(loading).toHaveCount(0);
});

test("switches between grid and list views and remembers the choice", async ({ page }) => {
  await mockResources(page);
  await page.goto("/resources");
  const view = page.getByRole("group", { name: "Resource view", exact: true });
  await expect(view.getByRole("button", { name: "Grid view", exact: true })).toHaveAttribute("aria-pressed", "true");
  await view.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator("li").filter({ has: page.getByRole("button", { name: "Open Design reading list", exact: true }) })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Open Design reading list", exact: true })).toBeVisible();
});

test("filters by type and tag with removable chips", async ({ page }) => {
  const api = await mockResources(page);
  await page.goto("/resources");
  const filters = page.getByRole("complementary", { name: "Resource filters", exact: true });
  await filters.getByRole("button", { name: "Links", exact: true }).click();
  await expect.poll(() => api.requests.some((url) => url.searchParams.get("type") === "link")).toBe(true);
  await expect(page.getByRole("button", { name: "Open Design reading list", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Building a Meaningful Career", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove type filter: Links", exact: true }).click();

  await filters.getByRole("button", { name: "Career", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove tag filter: Career", exact: true })).toBeVisible();
  await expect(page.getByText("1 resource", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page.getByRole("group", { name: "Active filters", exact: true })).toHaveCount(0);
  await expect(page.getByText("2 resources", { exact: true })).toBeVisible();
});

test("card actions live in a menu and the card shows a compact summary", async ({ page }) => {
  await mockResources(page);
  await page.goto("/resources");
  await page.getByRole("button", { name: "Actions for Building a Meaningful Career", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Archive", exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "Open", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Resource details", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "Open project Portfolio Refresh", exact: true })).toBeVisible();
  await expect(page.getByText("+1 linked", { exact: true })).toBeVisible();
});

test("a deep-linked resource opens in a dialog-shaped skeleton", async ({ page }) => {
  await mockResources(page, { delayMs: 800 });
  await page.goto(`/resources?resource=${resources[0].uuid}`);
  const opening = page.getByRole("dialog", { name: "Opening resource", exact: true });
  await expect(opening.getByRole("status", { name: "Loading resource", exact: true })).toBeVisible();
  const details = page.getByRole("dialog", { name: "Resource details", exact: true });
  await expect(details.getByLabel(/^Title/)).toHaveValue(resources[0].title);
  await expect(opening).toHaveCount(0);
});
