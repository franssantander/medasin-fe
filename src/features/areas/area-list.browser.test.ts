import { expect, test, type Page } from "@playwright/test";
import type { Area } from "./type";

test.use({ actionTimeout: 15_000 });

function area(index: number, name: string, description: string | null, updatedAt: string): Area {
  return {
    id: index, uuid: `60000000-0000-4000-8000-${String(index).padStart(12, "0")}`, name, slug: name.toLowerCase(),
    icon: "Leaf", background: "#000000", background_image: null, background_image_url: null, description,
    archived_at: null, created_at: "2026-10-01T10:00:00Z", updated_at: updatedAt,
  };
}

const seed = [
  area(1, "Health", "Physical health, energy, and fitness.", "2026-10-02T10:00:00Z"),
  area(2, "Career", "Professional growth and meaningful work.", "2026-10-08T10:00:00Z"),
  area(3, "Finances", null, "2026-10-05T10:00:00Z"),
];

async function mockAreas(page: Page, initial: Area[] = seed) {
  let areas = structuredClone(initial);
  const writes: { method: string; path: string }[] = [];
  const bodies: { path: string; body: string }[] = [];
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace("/api-test/v1", "");
    let data: unknown = null;
    if (method !== "GET") {
      writes.push({ method, path });
      bodies.push({ path, body: request.postData() ?? "" });
    }
    if (path === "/auth/me") data = { id: 1, uuid: "10000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", username: "ada", status: "active", font_family: "manrope" };
    else if (path === "/notifications") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    else if (path === "/subscription") data = { plan: { slug: "free", name: "Free" }, grant_type: "free", expires_at: null, enforcement_enabled: true, limits: { projects: 10, areas: 5, resources: 100 }, usage: { projects: 0, areas: areas.length, resources: 0 } };
    else if (path === "/area" && method === "POST") {
      const field = (key: string) => new RegExp(`name="${key}"\\r\\n\\r\\n([^\\r\\n]*)`).exec(request.postData() ?? "")?.[1] ?? null;
      const created = { ...area(areas.length + 10, field("name") ?? "", field("description") || null, "2026-10-10T10:00:00Z"), icon: field("icon"), background: field("background") };
      areas = [created, ...areas];
      data = created;
    } else if (path === "/area") data = areas;
    else if (path.endsWith("/archive") && method === "POST") {
      const uuid = path.split("/")[2];
      areas = areas.filter((item) => item.uuid !== uuid);
    }
    await route.fulfill({ json: { data, status: 200, message: "OK" } });
  });
  return { writes, bodies };
}

const cardTitles = (page: Page) => page.getByRole("link", { name: /^Open / });

test("areas list shows cards with plan usage", async ({ page }) => {
  await mockAreas(page);
  await page.goto("/areas");
  await expect(cardTitles(page)).toHaveCount(3);
  await expect(page.getByText("3 of 5 areas")).toBeVisible();
  await expect(page.getByText("No description yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add another area" })).toBeVisible();
});

test("search filters areas and can be cleared", async ({ page }) => {
  await mockAreas(page);
  await page.goto("/areas");
  const search = page.getByRole("searchbox", { name: "Search areas" });
  await search.fill("growth");
  await expect(cardTitles(page)).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Open Career" })).toBeVisible();

  await search.fill("zzz");
  await expect(page.getByText("No areas match “zzz”")).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).first().click();
  await expect(cardTitles(page)).toHaveCount(3);
});

test("sorting by name and by last updated reorders areas", async ({ page }) => {
  await mockAreas(page);
  await page.goto("/areas");
  await expect(cardTitles(page)).toHaveCount(3);

  await page.getByRole("combobox", { name: "Sort areas" }).click();
  await page.getByRole("option", { name: "Name" }).click();
  await expect(cardTitles(page).first()).toHaveAccessibleName("Open Career");
  await expect(cardTitles(page).last()).toHaveAccessibleName("Open Health");

  await page.getByRole("combobox", { name: "Sort areas" }).click();
  await page.getByRole("option", { name: "Last updated" }).click();
  await expect(cardTitles(page).first()).toHaveAccessibleName("Open Career");
  await expect(cardTitles(page).nth(1)).toHaveAccessibleName("Open Finances");
});

test("list view is remembered across reloads", async ({ page }) => {
  await mockAreas(page);
  await page.goto("/areas");
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
});

test("empty state invites creating the first area", async ({ page }) => {
  await mockAreas(page, []);
  await page.goto("/areas");
  await expect(page.getByText("Create your first area")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search areas" })).toHaveCount(0);
  await page.getByRole("button", { name: "New area" }).last().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("archiving from the actions menu removes the area", async ({ page }) => {
  const api = await mockAreas(page);
  await page.goto("/areas");
  await page.getByRole("button", { name: "Actions for Health" }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Archive area" }).click();
  await expect(page.getByRole("link", { name: "Open Health" })).toHaveCount(0);
  expect(api.writes).toContainEqual({ method: "POST", path: `/area/${seed[0].uuid}/archive` });
});

const formField = (body: string, key: string) =>
  new RegExp(`name="${key}"\\r\\n\\r\\n([^\\r\\n]*)`).exec(body)?.[1];

test("create dialog previews the area and submits icon and color", async ({ page }) => {
  const api = await mockAreas(page);
  await page.goto("/areas");
  await page.getByRole("button", { name: "New area", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create area", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Untitled area")).toBeVisible();

  await dialog.getByRole("textbox", { name: "Name", exact: true }).fill("Family");
  await expect(dialog.getByText("Family", { exact: true })).toBeVisible();
  await expect(dialog.getByText("6/120")).toBeVisible();
  await dialog.getByLabel("Description", { exact: true }).fill("Time with the people I love.");

  await dialog.getByRole("button", { name: "Icon", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search icons" }).fill("briefcase");
  await page.getByRole("button", { name: "Use Briefcase icon", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Icon", exact: true })).toContainText("Briefcase");

  await dialog.getByRole("button", { name: "Emerald (#10B981)" }).click();
  await expect(dialog.getByRole("textbox", { name: "Custom hex color" })).toHaveValue("#10B981");

  await dialog.getByRole("button", { name: "Create area", exact: true }).click();
  await expect(dialog).toBeHidden();
  const body = api.bodies.find((item) => item.path === "/area")?.body ?? "";
  expect(formField(body, "name")).toBe("Family");
  expect(formField(body, "icon")).toBe("Briefcase");
  expect(formField(body, "background")).toBe("#10B981");
  await expect(page.getByRole("link", { name: "Open Family" })).toBeVisible();
});

test("edit dialog is prefilled and invalid hex colors are rejected", async ({ page }) => {
  await mockAreas(page);
  await page.goto("/areas");
  await page.getByRole("button", { name: "Actions for Career" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit area", exact: true });
  await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Career");
  await expect(dialog.getByRole("button", { name: "Black (#000000)" })).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("textbox", { name: "Custom hex color" }).fill("#12");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog.getByText("Enter a valid 6-digit hex color.")).toBeVisible();
});
