import { expect, test, type Page } from "@playwright/test";

import { planCatalogFixture as catalog } from "@/test-utils/plan-catalog-fixture";

async function fixture(page: Page) {
  let failure = 0;
  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    if (path === "/plan") {
      if (failure) {
        await route.fulfill({ status: failure, json: { data: null, status: failure, message: "Plans are temporarily unavailable." } });
        return;
      }
      await route.fulfill({ json: { data: catalog, status: 200, message: "OK" } });
      return;
    }
    await route.fulfill({ status: 401, json: { data: null, status: 401, message: "Unauthenticated" } });
  });

  return {
    fail: (status = 500) => { failure = status; },
    recover: () => { failure = 0; },
  };
}

test("Landing pricing lists every plan from the catalog", async ({ page }, testInfo) => {
  await fixture(page);
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page).toHaveURL(/#pricing$/);
  const pricing = page.locator("#pricing");
  await expect(pricing.getByRole("heading", { name: "Every plan includes every tool." })).toBeVisible();
  await expect(pricing.getByRole("listitem", { name: "Focus", exact: true }).getByText("₱99 / month", { exact: true })).toBeVisible();
  await expect(pricing.getByText("₱149 / month", { exact: true })).toBeVisible();
  await expect(pricing.getByText("Up to 1,000 resources", { exact: true })).toBeVisible();
  await expect(pricing.getByText("100 GB storage", { exact: true })).toBeVisible();
  const limits = pricing.getByRole("table", { name: "Plan limits" });
  await expect(limits.getByRole("row", { name: /^Projects/ })).toHaveText(/Projects\s*10\s*50\s*Unlimited/);
  await expect(limits.getByRole("row", { name: /^Storage/ })).toHaveText(/Storage\s*1 GB\s*10 GB\s*100 GB/);
  await expect(pricing.getByRole("link", { name: "Get started free" })).toHaveAttribute("href", "/register");
  for (const plan of catalog) {
    await expect(pricing.getByRole("listitem", { name: plan.name, exact: true }).locator("[data-slot=plan-icon]")).toHaveAttribute("data-plan", plan.slug);
  }
  await expect(pricing.getByText("Paid plans are coming soon.", { exact: true })).toHaveCount(2);
  await expect(pricing.getByRole("link", { name: "Contact us to upgrade" })).toHaveCount(0);
  await pricing.screenshot({ path: testInfo.outputPath("landing-pricing-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator("body").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await pricing.screenshot({ path: testInfo.outputPath("landing-pricing-mobile-390.png") });
});

test("Landing pricing recovers from a catalog failure", async ({ page }) => {
  const controls = await fixture(page);
  controls.fail();
  await page.goto("/#pricing");
  const pricing = page.locator("#pricing");
  await expect(pricing.getByText("Plans could not be loaded", { exact: true })).toBeVisible();
  controls.recover();
  await pricing.getByRole("button", { name: "Try again" }).click();
  await expect(pricing.getByText("₱99 / month", { exact: true })).toBeVisible();
});

test("Landing pricing rejects a malformed catalog instead of showing wrong prices", async ({ page }) => {
  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    if (path === "/plan") {
      await route.fulfill({ json: { data: [{ ...catalog[1], price_minor: "99" }], status: 200, message: "OK" } });
      return;
    }
    await route.fulfill({ status: 401, json: { data: null, status: 401, message: "Unauthenticated" } });
  });
  await page.goto("/#pricing");
  await expect(page.getByText("The server returned incomplete plan pricing. Please try again.", { exact: true })).toBeVisible();
  await expect(page.getByText(/₱/)).toHaveCount(0);
});
