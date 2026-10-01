import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import type { AppFontFamily } from "./types";

const appUrl = "http://127.0.0.1:3107";

function preferenceStore(font: string | undefined = "manrope") {
  return {
    activeUserId: 7,
    users: [
      { id: 7, username: "tester", font_family: font },
      { id: 42, username: "other", font_family: "inter" },
    ],
    saves: [] as { userId: number; font: AppFontFamily }[],
    failSave: false,
    saveGate: Promise.resolve(),
  };
}

async function mockPreferences(context: BrowserContext, store: ReturnType<typeof preferenceStore>) {
  await context.addCookies([{ name: "auth_token", value: "font-preferences-session", url: appUrl }]);
  await context.addInitScript(() => window.localStorage.setItem("theme", "light"));
  await context.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    let data: unknown = null;

    if (path === "/auth/login") {
      const { username } = route.request().postDataJSON();
      store.activeUserId = store.users.find((user) => user.username === username)!.id;
    } else if (path === "/auth/me") {
      data = {
        ...store.users.find((user) => user.id === store.activeUserId),
        first_name: "Test",
        last_name: "User",
        full_name: "Test User",
        email: "tester@example.com",
      };
    } else if (path === "/settings/preferences") {
      const { font_family } = route.request().postDataJSON();
      const userId = store.activeUserId;
      store.saves.push({ userId, font: font_family });
      await store.saveGate;
      if (store.failSave) {
        await route.fulfill({ status: 500, json: { data: null, status: 500, message: "Unable to save your font." } });
        return;
      }
      store.users.find((user) => user.id === userId)!.font_family = font_family;
      data = { font_family };
    } else if (path === "/notifications" || path === "/trash") {
      data = { current_page: 1, data: [], last_page: 1, per_page: 20, total: 0 };
    } else if (path === "/home") {
      data = {
        stats: { active_projects: 0, areas: 0, resources_saved: 0, habit_streak: 0 },
        projects: [], areas: [], recent_resources: [],
        archives: { projects: 0, areas: 0, resources: 0 },
      };
    }

    await route.fulfill({ json: { data, status: 200, message: "OK" } });
  });
}

function deferSave(store: ReturnType<typeof preferenceStore>) {
  let release = () => {};
  store.saveGate = new Promise<void>((resolve) => { release = resolve; });
  return release;
}

async function expectAppFont(page: Page, font: AppFontFamily) {
  await expect(page.locator("html")).toHaveAttribute("data-app-font", font);
  const name = new RegExp(font, "i");
  await expect(page.getByRole("heading", { name: "Appearance" })).toHaveCSS("font-family", name);
  await expect(page.getByRole("button", { name: "Open account menu for Test User" })).toHaveCSS("font-family", name);
}

test("font tiles preview each family and default to Manrope", async ({ page }, testInfo) => {
  const store = preferenceStore();
  await mockPreferences(page.context(), store);
  await page.goto("/settings/preferences");
  await expectAppFont(page, "manrope");
  await expect(page.getByRole("button", { name: "Manrope", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Default", { exact: true })).toBeVisible();
  for (const font of ["Manrope", "Geist", "Inter"]) {
    await expect(page.getByRole("button", { name: font, exact: true }).getByText("Plan your day with clarity.")).toHaveCSS("font-family", new RegExp(font, "i"));
  }
  await page.getByRole("button", { name: "Manrope", exact: true }).click();
  expect(store.saves).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath("font-preferences-desktop.png") });
});

test("fonts save immediately, survive navigation and reload, and load in a fresh browser", async ({ page, browser }) => {
  const store = preferenceStore();
  await mockPreferences(page.context(), store);
  await page.goto("/settings/preferences");
  const release = deferSave(store);
  await page.getByRole("button", { name: "Geist", exact: true }).click();
  await expectAppFont(page, "geist");
  await expect(page.locator("#app-font-status")).toHaveText("Saving font…");
  await expect(page.getByRole("button", { name: "Inter", exact: true })).toBeDisabled();
  await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Trash" }).click();
  await expect(page.getByRole("heading", { name: "Trash", exact: true })).toHaveCSS("font-family", /geist/i);
  await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Preferences" }).click();
  await expect(page.getByRole("button", { name: "Inter", exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole("button", { name: "Inter", exact: true })).toBeEnabled();
  expect(store.saves).toEqual([{ userId: 7, font: "geist" }]);
  await page.reload();
  await expectAppFont(page, "geist");
  await page.getByRole("button", { name: "Inter", exact: true }).click();
  await expect(page.locator("#app-font-status")).toHaveText("Saved to your account.");
  await expectAppFont(page, "inter");
  await page.getByRole("button", { name: "Open account menu for Test User" }).click();
  await expect(page.getByRole("menuitem", { name: "Log out" })).toHaveCSS("font-family", /inter/i);
  await page.keyboard.press("Escape");

  const fresh = await browser.newContext();
  try {
    await mockPreferences(fresh, store);
    const secondPage = await fresh.newPage();
    await secondPage.goto(`${appUrl}/settings/preferences`);
    await expectAppFont(secondPage, "inter");
    await expect(secondPage.getByRole("button", { name: "Inter", exact: true })).toHaveAttribute("aria-pressed", "true");
  } finally {
    await fresh.close();
  }
});

test("failed saves restore the previous font and allow retry", async ({ page }) => {
  const store = preferenceStore("geist");
  store.failSave = true;
  await mockPreferences(page.context(), store);
  await page.goto("/settings/preferences");
  await expectAppFont(page, "geist");
  const release = deferSave(store);
  await page.getByRole("button", { name: "Inter", exact: true }).click();
  await expectAppFont(page, "inter");
  release();
  await expect(page.locator("#app-font-status")).toContainText("Your previous font was restored.");
  await expectAppFont(page, "geist");
  await expect(page.getByRole("button", { name: "Inter", exact: true })).toBeEnabled();
  store.failSave = false;
  await page.getByRole("button", { name: "Inter", exact: true }).click();
  await expect(page.locator("#app-font-status")).toHaveText("Saved to your account.");
  await expectAppFont(page, "inter");
});

test("font tiles support keyboard selection and keep the active selection", async ({ page }) => {
  const store = preferenceStore();
  await mockPreferences(page.context(), store);
  await page.goto("/settings/preferences");
  await expectAppFont(page, "manrope");
  const manrope = page.getByRole("button", { name: "Manrope", exact: true });
  const geist = page.getByRole("button", { name: "Geist", exact: true });
  await manrope.focus();
  await page.keyboard.press("ArrowRight");
  await expect(geist).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.locator("#app-font-status")).toHaveText("Saved to your account.");
  await geist.click();
  await expect(geist).toHaveAttribute("aria-pressed", "true");
  expect(store.saves).toHaveLength(1);
});

for (const failSave of [false, true]) {
  test(`late ${failSave ? "failed" : "successful"} font saves cannot affect a different account`, async ({ page }) => {
    const store = preferenceStore();
    store.failSave = failSave;
    await mockPreferences(page.context(), store);
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
    await page.goto("/settings/preferences");
    await expectAppFont(page, "manrope");
    const release = deferSave(store);
    await page.getByRole("button", { name: "Geist", exact: true }).click();
    await expectAppFont(page, "geist");
    await expect.poll(() => store.saves.length).toBe(1);
    await page.getByRole("button", { name: "Open account menu for Test User" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("html")).not.toHaveAttribute("data-app-font");
    await expect(page.getByLabel("Username", { exact: true })).toHaveCSS("font-family", /manrope/i);
    await page.getByLabel("Username", { exact: true }).fill("other");
    await page.getByLabel("Password", { exact: true }).fill("password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/, { timeout: 60_000 });
    await page.getByRole("button", { name: "Open account menu for Test User" }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    await expectAppFont(page, "inter");
    const response = page.waitForResponse((result) => result.url().endsWith("/settings/preferences") && result.request().method() === "PATCH");
    release();
    await response;
    await expectAppFont(page, "inter");
    await expect(page.getByRole("button", { name: "Inter", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(store.users[1].font_family).toBe("inter");
  });
}

test("unsupported profile font values safely fall back to Manrope", async ({ page }) => {
  const store = preferenceStore("unknown-font");
  await mockPreferences(page.context(), store);
  await page.goto("/settings/preferences");
  await expectAppFont(page, "manrope");
});

for (const viewport of [{ width: 320, height: 568 }, { width: 768, height: 700 }, { width: 1440, height: 600 }]) {
  test(`font preferences fit and scroll at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockPreferences(page.context(), preferenceStore());
    await page.goto("/settings/preferences");
    const inter = page.getByRole("button", { name: "Inter", exact: true });
    await inter.scrollIntoViewIfNeeded();
    await expect(inter).toBeInViewport();
    await inter.click();
    await expect(page.locator("#app-font-status")).toHaveText("Saved to your account.");
    const card = page.getByRole("region", { name: "Settings content" }).locator('[data-slot="card"]');
    expect(await card.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    if (viewport.width >= 768) {
      const body = card.locator('[data-slot="card-content"]');
      expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await expect(page.getByRole("heading", { name: "Appearance" })).toBeInViewport();
      expect(await page.locator("#app-shell > div > main").evaluate((element) => element.scrollTop)).toBe(0);
    }
    await page.screenshot({ path: testInfo.outputPath("font-preferences-responsive.png") });
  });
}
