import { test, type Page } from "@playwright/test";

const out = "/tmp/claude-1001/-home-projects-medasin-app-medasin-fe/945bacb1-f24a-44ff-b745-50ea51cda263/scratchpad/shots/skeletons";
const routes = ["home", "projects", "areas", "resources", "archives", "board", "focus", "habits", "notes", "journal", "letters", "plans"];

async function hold(page: Page) {
  await page.context().addCookies([{ name: "auth_token", value: "x", url: "http://127.0.0.1:3107" }]);
  await page.route("**/api-test/v1/**", async () => { await new Promise(() => {}); });
}

for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 375, height: 812 }]] as const) {
  test.describe(name, () => {
    test.use({ viewport });
    test(`shots ${name}`, async ({ page }) => {
      test.setTimeout(240_000);
      await hold(page);
      for (const route of routes) {
        await page.goto(`/${route}`);
        await page.locator(`[data-page-skeleton="${route}"]`).first().waitFor();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${out}/${name}-${route}.png` });
      }
    });
  });
}

test("dark", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await hold(page);
  for (const route of ["habits", "board", "plans"]) {
    await page.goto(`/${route}`);
    await page.locator(`[data-page-skeleton="${route}"]`).first().waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/dark-${route}.png` });
  }
});
