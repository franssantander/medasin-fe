import { expect, test, type Page } from "@playwright/test";

import type { TrashItem } from "./types";

function deletedItems(count = 35): TrashItem[] {
  return Array.from({ length: count }, (_, index) => ({
    uuid: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    subject_uuid: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    type: index % 2 === 0 ? "project" : "note",
    title: index === 0 ? "A very long deleted project title ".repeat(8) : `Deleted item ${index}`,
    context: "Workspace / ".repeat(10),
    deleted_at: "2026-09-25T10:00:00Z",
    expires_at: "2026-10-25T10:00:00Z",
    days_remaining: 25,
    group_size: 1,
    can_restore: index !== 0,
    restore_block_reason: index === 0 ? "Restore the parent workspace before restoring this item." : null,
  }));
}

async function fixture(
  page: Page,
  options: { items?: TrashItem[]; failTrash?: boolean; deferTrash?: boolean } = {},
) {
  let items = options.items ?? deletedItems();
  let failTrash = options.failTrash ?? false;
  let releaseTrash = () => {};
  const ready = options.deferTrash
    ? new Promise<void>((resolve) => { releaseTrash = resolve; })
    : Promise.resolve();
  const actions: string[] = [];

  await page.context().addCookies([{
    name: "auth_token",
    value: "settings-layout-session",
    url: "http://127.0.0.1:3107",
  }]);
  await page.addInitScript(() => window.localStorage.setItem("theme", "light"));
  await page.route("**/api-test/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api-test/v1", "");
    let data: unknown = [];

    if (path === "/auth/me") {
      data = {
        id: 7,
        first_name: "Test",
        last_name: "User",
        full_name: "Test User",
        username: "tester",
        email: "tester@example.com",
      };
    } else if (path === "/notifications") {
      data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    } else if (path === "/trash") {
      await ready;
      if (failTrash) {
        await route.fulfill({ status: 500, json: { data: null, status: 500, message: "Unable to load deleted items." } });
        return;
      }
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const type = url.searchParams.get("type");
      const filtered = items.filter((item) =>
        item.title.toLowerCase().includes(search) && (!type || item.type === type),
      );
      const currentPage = Number(url.searchParams.get("page") ?? 1);
      data = {
        current_page: currentPage,
        data: filtered.slice((currentPage - 1) * 20, currentPage * 20),
        last_page: Math.max(1, Math.ceil(filtered.length / 20)),
        per_page: 20,
        total: filtered.length,
      };
    } else if (path.startsWith("/trash/")) {
      actions.push(`${route.request().method()} ${path}`);
      items = items.filter((item) => item.uuid !== path.split("/")[2]);
      data = null;
    }

    await route.fulfill({ json: { data, status: 200, message: "OK" } });
  });

  return {
    actions,
    releaseTrash: () => releaseTrash(),
    allowTrash: () => { failTrash = false; },
  };
}

function settingsCards(page: Page) {
  return {
    left: page.getByRole("complementary", { name: "Settings sidebar" }).locator('[data-slot="card"]'),
    right: page.getByRole("region", { name: "Settings content" }).locator('[data-slot="card"]').first(),
  };
}

async function expectCardsToFillHeight(page: Page) {
  const { left, right } = settingsCards(page);
  const leftBox = await left.boundingBox();
  const rightBox = await right.boundingBox();
  const availableBottom = await page.locator("#app-shell > div > main").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.bottom - parseFloat(getComputedStyle(element).paddingBottom);
  });
  expect(leftBox).not.toBeNull();
  expect(rightBox).not.toBeNull();
  expect(Math.abs(leftBox!.y - rightBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(leftBox!.height - rightBox!.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(rightBox!.y + rightBox!.height - availableBottom)).toBeLessThanOrEqual(1);
}

async function expectNoHorizontalOverflow(page: Page) {
  const { right } = settingsCards(page);
  expect(await right.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const body = page.getByRole("region", { name: "Deleted items" });
  if (await body.count()) {
    expect(await body.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  }
}

test("Settings redirects before rendering and opens from app navigation without runtime errors", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await fixture(page, { items: [] });

  const response = await page.request.get("/settings", {
    headers: { RSC: "1" },
  });
  expect(response.ok()).toBe(true);
  expect(new URL(response.url()).pathname).toBe("/settings/preferences");

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/settings\/preferences$/);
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();

  await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Trash" }).click();
  await expect(page.getByRole("heading", { name: "Trash", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/preferences$/);
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("Preferences cards fill the available height with expanded and collapsed app navigation", async ({ page }, testInfo) => {
  await fixture(page);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/settings\/preferences$/);
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await expectCardsToFillHeight(page);
  await page.screenshot({ path: testInfo.outputPath("preferences-desktop.png") });
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await expectCardsToFillHeight(page);
});

test("theme tiles support keyboard selection, persistence, and a required selection", async ({ page }) => {
  await fixture(page);
  await page.goto("/settings/preferences");
  const light = page.getByRole("button", { name: /^Light/ });
  const dark = page.getByRole("button", { name: /^Dark/ });
  const system = page.getByRole("button", { name: /^System/ });
  await expect(light).toHaveAttribute("aria-pressed", "true");
  await light.focus();
  await page.keyboard.press("ArrowRight");
  await expect(dark).toBeFocused();
  await page.keyboard.press("Space");
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await dark.click();
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await system.click();
  await expect(system).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.localStorage.getItem("theme"))).toBe("system");
  await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Trash" }).click();
  await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Preferences" }).click();
  await expect(system).toHaveAttribute("aria-pressed", "true");
});

test("long Trash lists scroll inside the card while header and pagination stay visible", async ({ page }, testInfo) => {
  await fixture(page);
  await page.goto("/settings/trash");
  const body = page.getByRole("region", { name: "Deleted items" });
  await expect(body.locator("article")).toHaveCount(20);
  await expectCardsToFillHeight(page);
  await page.screenshot({ path: testInfo.outputPath("trash-desktop.png") });
  const next = page.getByRole("button", { name: "Next", exact: true });
  const footerBefore = await next.boundingBox();
  await body.hover();
  await page.mouse.wheel(0, 1500);
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await next.boundingBox()).toEqual(footerBefore);
  await expect(page.getByRole("heading", { name: "Trash", exact: true })).toBeInViewport();
  expect(await page.locator("#app-shell > div > main").evaluate((element) => element.scrollTop)).toBe(0);
  await next.click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(body.locator("article")).toHaveCount(15);
  await expectNoHorizontalOverflow(page);
});

for (const viewport of [{ width: 768, height: 700 }, { width: 1024, height: 768 }]) {
  test(`narrow desktop panels fit at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await fixture(page);
    await page.goto("/settings/trash");
    await expect(page.getByRole("region", { name: "Deleted items" }).locator("article")).toHaveCount(20);
    await expectCardsToFillHeight(page);
    await expectNoHorizontalOverflow(page);
    const search = await page.getByRole("searchbox", { name: "Search Trash" }).boundingBox();
    const filter = await page.getByRole("combobox", { name: "Filter by type" }).boundingBox();
    expect(filter!.y).toBeGreaterThan(search!.y);
    await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Preferences" }).click();
    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
    await expectCardsToFillHeight(page);
    await expectNoHorizontalOverflow(page);
    const light = await page.getByRole("button", { name: /^Light/ }).boundingBox();
    const dark = await page.getByRole("button", { name: /^Dark/ }).boundingBox();
    expect(dark!.y).toBeGreaterThan(light!.y);
  });
}

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
  test(`mobile Settings stack and remain usable at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await fixture(page, { items: deletedItems(2) });
    await page.goto("/settings/trash");
    await expect(page.getByRole("region", { name: "Deleted items" }).locator("article")).toHaveCount(2);
    const { left, right } = settingsCards(page);
    const leftBox = await left.boundingBox();
    const rightBox = await right.boundingBox();
    expect(rightBox!.y).toBeGreaterThan(leftBox!.y + leftBox!.height);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("trash-mobile.png") });
    await page.getByRole("button", { name: "Delete forever" }).last().scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Delete forever" }).last()).toBeInViewport();
    await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Preferences" }).click();
    await page.getByRole("button", { name: /^System/ }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: /^System/ })).toBeInViewport();
    await expectNoHorizontalOverflow(page);
  });
}

test("short desktop screens can reach the list and pagination", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 450 });
  await fixture(page);
  await page.goto("/settings/trash");
  await expect(page.getByRole("region", { name: "Deleted items" }).locator("article")).toHaveCount(20);
  await page.getByRole("button", { name: "Next", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeInViewport();
  await expectNoHorizontalOverflow(page);
});

test("empty and filtered Trash feedback fills the content body", async ({ page }) => {
  await fixture(page, { items: [] });
  await page.goto("/settings/trash");
  await expect(page.getByText("Trash is empty", { exact: true })).toBeVisible();
  await expectCardsToFillHeight(page);
  const bodyBox = await page.getByRole("region", { name: "Deleted items" }).boundingBox();
  const emptyBox = await page.locator('[data-slot="empty"]').boundingBox();
  expect(Math.abs(bodyBox!.height - emptyBox!.height)).toBeLessThanOrEqual(1);
  await page.getByRole("searchbox", { name: "Search Trash" }).fill("missing item");
  await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
});

test("Trash keeps its card height during loading and can recover from an error", async ({ page }) => {
  const controls = await fixture(page, { deferTrash: true, failTrash: true });
  await page.goto("/settings/trash");
  await expect(page.getByRole("region", { name: "Deleted items" }).locator('[data-slot="skeleton"]')).toHaveCount(12);
  await expectCardsToFillHeight(page);
  controls.releaseTrash();
  await expect(page.getByText("Trash could not be loaded", { exact: true })).toBeVisible();
  await expectCardsToFillHeight(page);
  controls.allowTrash();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("region", { name: "Deleted items" }).locator("article")).toHaveCount(20);
});

test("Trash filters and confirmation actions remain usable", async ({ page }) => {
  const controls = await fixture(page, { items: deletedItems(4) });
  await page.goto("/settings/trash");
  const body = page.getByRole("region", { name: "Deleted items" });
  await expect(body.locator("article")).toHaveCount(4);
  await expect(page.getByRole("combobox", { name: "Filter by type" })).toContainText("All content types");
  await expect(body.getByRole("button", { name: "Restore", exact: true }).first()).toBeDisabled();
  await page.getByRole("combobox", { name: "Filter by type" }).click();
  await page.getByRole("option", { name: "Notes", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Filter by type" })).toContainText("Notes");
  await expect(body.locator("article")).toHaveCount(2);
  await body.getByRole("button", { name: "Restore", exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Restore", exact: true }).click();
  await expect(body.locator("article")).toHaveCount(1);
  await body.getByRole("button", { name: "Delete forever", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete forever", exact: true }).click();
  await expect(page.getByText("No matching items", { exact: true })).toBeVisible();
  expect(controls.actions.map((action) => action.split(" ")[0])).toEqual(["POST", "DELETE"]);
});
