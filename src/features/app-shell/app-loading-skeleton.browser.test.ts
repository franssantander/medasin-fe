import { expect, test, type Page } from "@playwright/test";

const routes = [
  "home",
  "projects",
  "areas",
  "resources",
  "archives",
  "board",
  "focus",
  "habits",
  "notes",
  "journal",
  "letters",
  "plans",
];

// Holds /auth/me until released; every other request stays pending so only
// the loading states are rendered.
async function holdCurrentUser(page: Page) {
  let release = () => {};
  const userResponse = new Promise<void>((resolve) => { release = resolve; });

  await page.context().addCookies([{
    name: "auth_token",
    value: "playwright-session",
    url: "http://127.0.0.1:3107",
  }]);

  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    if (path !== "/auth/me") return;
    await userResponse;
    await route.fulfill({
      json: {
        status: 200,
        message: "OK",
        data: {
          id: 1,
          first_name: "Test",
          last_name: "User",
          full_name: "Test User",
          username: "tester",
          email: "tester@example.com",
        },
      },
    }).catch(() => {});
  });

  return release;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test.describe(`workspace loader at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const route of routes) {
      test(`mirrors the ${route} page while the user loads`, async ({ page }) => {
        const release = await holdCurrentUser(page);
        await page.goto(`/${route}`);

        const loader = page.getByRole("status", { name: "Loading your workspace" });
        await expect(loader).toBeVisible();
        await expect(loader.locator(`[data-page-skeleton="${route}"]`)).toBeVisible();
        await expectNoHorizontalOverflow(page);

        release();
        await expect(loader).toHaveCount(0);
      });
    }
  });
}

test("detail routes fall back to the generic page skeleton", async ({ page }) => {
  const release = await holdCurrentUser(page);
  await page.goto("/projects/9a5f7c88-3707-4979-a422-e54dd475d140");

  const loader = page.getByRole("status", { name: "Loading your workspace" });
  await expect(loader).toBeVisible();
  await expect(loader.locator("[data-page-skeleton]")).toHaveCount(0);
  release();
});
