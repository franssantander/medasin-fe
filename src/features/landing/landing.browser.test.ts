import { expect, test, type Page } from "@playwright/test";

import { planCatalogFixture } from "@/test-utils/plan-catalog-fixture";

async function fixture(page: Page) {
  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    if (path === "/plan") {
      await route.fulfill({ json: { data: planCatalogFixture, status: 200, message: "OK" } });
      return;
    }
    await route.fulfill({ status: 401, json: { data: null, status: 401, message: "Unauthenticated" } });
  });
}

async function settlePreview(page: Page) {
  await page.evaluate(() => {
    const top = document.querySelector('[data-slot="product-preview-settle"]')!.getBoundingClientRect().top;
    window.scrollBy(0, top - window.innerHeight * 0.2);
  });
  await expect
    .poll(() => page.locator('[data-slot="product-preview-settle"]').evaluate((element) => getComputedStyle(element).transform), { timeout: 5_000 })
    .toBe("none");
}

test("Landing navbar links land on real sections", async ({ page }) => {
  await fixture(page);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });

  for (const [label, id] of [["Product", "product"], ["How it works", "how-it-works"], ["Pricing", "pricing"]]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }

  const hero = page.locator("#hero");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Projects, notes, habits, and focus in one calm workspace.");
  await expect(hero.getByRole("link", { name: "Get started free" })).toHaveAttribute("href", "/register");
});

test("Landing product preview switches screens from the sidebar", async ({ page }, testInfo) => {
  await fixture(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const preview = page.getByRole("tablist", { name: "Preview a Medasin screen" });
  await expect(preview.getByRole("tab")).toHaveText([
    "Home",
    "Projects",
    "Areas",
    "Resources",
    "Archives",
    "Board",
    "Focus",
    "Habits",
    "Notes",
    "Journal",
    "Letters",
    "Plans",
  ]);
  await expect(page.getByRole("tabpanel", { name: "Projects" })).toContainText("Spring newsletter");
  await expect(page.locator('[data-slot="product-preview"] [data-slot="avatar-image"]')).toHaveAttribute(
    "src",
    "/images/preview-avatar.svg",
  );

  // The 1280px app canvas is scaled down to fit the frame (measured once the window has settled flat).
  await settlePreview(page);
  const frame = await page.locator('[data-slot="product-preview"]').boundingBox();
  const canvas = await page.locator('[data-slot="product-preview-canvas"]').boundingBox();
  expect(Math.abs(frame!.width - canvas!.width)).toBeLessThanOrEqual(3);
  expect(Math.abs(frame!.height - canvas!.height)).toBeLessThanOrEqual(3);
  // The project's board fits the frame's width, Done column included, with no sideways scrolling.
  const outlineTask = (await page.getByRole("tabpanel", { name: "Projects" }).getByText("Outline the issue").boundingBox())!;
  expect(outlineTask.x + outlineTask.width).toBeLessThanOrEqual(frame!.x + frame!.width);
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("preview-projects.png") });

  await preview.getByRole("tab", { name: "Focus" }).click();
  await expect(preview.getByRole("tab", { name: "Focus" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Focus" })).toContainText("Focus Timer");
  await expect(page.getByRole("tabpanel", { name: "Focus" })).toContainText("18:42");
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("preview-focus.png") });

  await page.keyboard.press("ArrowDown");
  await expect(preview.getByRole("tab", { name: "Habits" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tabpanel", { name: "Habits" })).toContainText("Morning pages");
  await page.waitForTimeout(400);
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("preview-habits.png") });

  await preview.getByRole("tab", { name: "Notes" }).click();
  await expect(page.getByRole("tabpanel", { name: "Notes" })).toContainText("Spring issue");
  await page.waitForTimeout(400);
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("preview-notes.png") });

  await preview.getByRole("tab", { name: "Journal" }).click();
  await expect(page.getByRole("tabpanel", { name: "Journal" })).toContainText("Focus reflection");
  await page.waitForTimeout(400);
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("preview-journal.png") });

  const lazyScreens = [
    { label: "Home", text: "Welcome, Sofia." },
    { label: "Areas", text: "Garden" },
    { label: "Resources", text: "Raised bed guide" },
    { label: "Archives", text: "Winter newsletter" },
    { label: "Board", text: "Give your ideas somewhere to move" },
    { label: "Letters", text: "What the frost taught me" },
    { label: "Plans", text: "Upcoming" },
  ];
  for (const { label, text } of lazyScreens) {
    await preview.getByRole("tab", { name: label }).click();
    await expect(preview.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: label })).toContainText(text);
    await page.waitForTimeout(400);
    await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath(`preview-${label.toLowerCase()}.png`) });
  }

  // Like the real Board page, all four columns fit across the frame and stretch to its bottom.
  await preview.getByRole("tab", { name: "Board" }).click();
  const boardPanel = page.getByRole("tabpanel", { name: "Board" });
  const frameBox = (await page.locator('[data-slot="product-preview"]').boundingBox())!;
  const doneTask = (await boardPanel.getByText("Order compost").boundingBox())!;
  expect(doneTask.x + doneTask.width).toBeLessThanOrEqual(frameBox.x + frameBox.width);
  const addTask = (await boardPanel.getByText("Add task").last().boundingBox())!;
  expect(frameBox.y + frameBox.height - (addTask.y + addTask.height)).toBeLessThan(frameBox.height * 0.08);

  // Scaled screens stay readable on a small laptop too.
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("preview-plans-1024.png") });
});

test("Landing fits a phone screen without sideways scrolling", async ({ page }, testInfo) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#pricing").getByRole("listitem", { name: "Clarity", exact: true })).toBeVisible();
  await page.getByRole("group", { name: "Preview a Medasin screen" }).getByRole("button", { name: "Journal" }).click();
  await expect(page.getByRole("tabpanel", { name: "Journal" })).toContainText("Focus reflection");
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("preview-mobile-journal.png") });
  await page.getByRole("group", { name: "Preview a Medasin screen" }).getByRole("button", { name: "Plans" }).click();
  await expect(page.getByRole("tabpanel", { name: "Plans" })).toContainText("Upcoming");
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("preview-mobile-plans.png") });
  await page.getByRole("group", { name: "Preview a Medasin screen" }).getByRole("button", { name: "Habits" }).click();
  await expect(page.getByRole("tabpanel", { name: "Habits" })).toContainText("Morning pages");
  expect(await page.locator("body").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("landing-mobile-390.png"), fullPage: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("#pricing").getByRole("listitem", { name: "Clarity", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("landing-desktop-dark.png"), fullPage: true });
});

test("Landing preview settles flat as it scrolls into view, and the sidebar highlight follows the tab", async ({ page }, testInfo) => {
  await fixture(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const settle = page.locator('[data-slot="product-preview-settle"]');
  const transform = () => settle.evaluate((element) => getComputedStyle(element).transform);

  // Still partly below the fold, so the window is tilted back.
  await expect.poll(transform).not.toBe("none");
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("motion-tilted.png") });

  await settlePreview(page);
  await page.locator('[data-slot="product-preview"]').screenshot({ path: testInfo.outputPath("motion-settled.png") });

  const tabs = page.getByRole("tablist", { name: "Preview a Medasin screen" });
  const highlightY = () =>
    page.locator('[data-slot="preview-nav-highlight"]').evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42);
  const tabTop = (name: string) => tabs.getByRole("tab", { name }).evaluate((element) => (element as HTMLElement).offsetTop);

  await expect.poll(highlightY).toBeCloseTo(await tabTop("Projects"), 0);
  await tabs.getByRole("tab", { name: "Focus" }).click();
  await expect.poll(highlightY).toBeCloseTo(await tabTop("Focus"), 0);
});

test("Landing shows everything at rest for viewers who prefer reduced motion", async ({ page }) => {
  await fixture(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const opacity = (selector: string) =>
    page.locator(selector).first().evaluate((element) => getComputedStyle(element).opacity);
  await expect(page.locator("#hero h1 span").first()).toHaveCSS("opacity", "1");
  // Below the fold and never scrolled to, yet already visible.
  expect(await opacity("#how-it-works li > div")).toBe("1");
  expect(await opacity("#product li")).toBe("1");
  await expect(page.locator('[data-slot="product-preview-settle"]')).toHaveCSS("transform", "none");
});
