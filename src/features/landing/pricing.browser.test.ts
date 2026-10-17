import { expect, test, type Page } from "@playwright/test";

const catalog = [
  {
    uuid: "plan-free", slug: "free", name: "Free", description: "Every Medasin tool, with room to set up your system.",
    price_minor: 0, currency: "PHP", billing_interval: null,
    limits: { projects: 10, areas: 5, resources: 100, storage_mb: 1024 },
    features: ["Up to 10 projects", "Up to 5 areas", "Up to 100 resources", "1 GB storage", "Every tool: Boards, Focus, Habits, Notes, Journal, Letters, and Calendar"],
  },
  {
    uuid: "plan-focus", slug: "focus", name: "Focus", description: "Every tool, with more room for projects, areas, resources, and files.",
    price_minor: 9900, currency: "PHP", billing_interval: "month",
    limits: { projects: 50, areas: 20, resources: 1000, storage_mb: 10240 },
    features: ["Up to 50 projects", "Up to 20 areas", "Up to 1,000 resources", "10 GB storage", "Every tool: Boards, Focus, Habits, Notes, Journal, Letters, and Calendar"],
  },
  {
    uuid: "plan-clarity", slug: "clarity", name: "Clarity", description: "Every tool, with unlimited projects, areas, and resources and the most storage.",
    price_minor: 14900, currency: "PHP", billing_interval: "month",
    limits: { projects: null, areas: null, resources: null, storage_mb: 102400 },
    features: ["Unlimited projects", "Unlimited areas", "Unlimited resources", "100 GB storage", "Every tool: Boards, Focus, Habits, Notes, Journal, Letters, and Calendar"],
  },
];

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
  await page.getByRole("navigation").getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page).toHaveURL(/#pricing$/);
  const pricing = page.locator("#pricing");
  await expect(pricing.getByRole("heading", { name: "Simple pricing" })).toBeVisible();
  await expect(pricing.getByRole("listitem", { name: "Focus", exact: true }).getByText("₱99 / month", { exact: true })).toBeVisible();
  await expect(pricing.getByText("₱149 / month", { exact: true })).toBeVisible();
  await expect(pricing.getByText("Up to 1,000 resources", { exact: true })).toBeVisible();
  await expect(pricing.getByText("100 GB storage", { exact: true })).toBeVisible();
  await expect(pricing.getByRole("link", { name: "Get started free" })).toHaveAttribute("href", "/register");
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
