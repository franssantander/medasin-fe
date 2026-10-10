import { expect, test, type Page, type TestInfo } from "@playwright/test";

import type { HomeData } from "./type";
import type { Area } from "@/features/areas/type";
import type { ProjectDetail } from "@/features/projects/type";
import type { Resource } from "@/features/resources/type";

test.use({ timezoneId: "Asia/Manila" });

const projectUuid = "9a5f7c88-3707-4979-a422-e54dd475d140";
const completedProjectUuid = "6f15b8b7-c46d-490b-8141-470e456ea86b";
const waitingProjectUuid = "5d4e8974-1ceb-4b31-948b-9288873c7c19";
const unknownIconProjectUuid = "4aa19b9e-55a4-451d-b6bf-9175239e90a1";
const areaUuid = "c43e0592-81e0-4d70-9477-c06aceaa082e";
const learningAreaUuid = "ae5fd74a-3ceb-4e20-b28e-9305c83729de";
const noIconAreaUuid = "963695a4-766e-4d42-b595-f1dadcf4c76e";
const unknownIconAreaUuid = "62b8c993-1358-4bf0-8e5f-57684a48a0cc";
const resourceUuid = "b18cb1d5-7dd9-4b5e-a8c8-fbbf62fe8f20";

function populatedHome(): HomeData {
  return {
    stats: {
      active_projects: 11,
      areas: 4,
      resources_saved: 13,
      habit_streak: 5,
    },
    projects: [
      {
        uuid: projectUuid,
        name: "North star",
        icon: "ChartNoAxesCombined",
        area: { uuid: areaUuid, name: "Life" },
        completed_tasks: 2,
        total_tasks: 4,
        progress_percentage: 50,
        last_activity_at: new Date().toISOString(),
      },
      {
        uuid: completedProjectUuid,
        name: "Completed roadmap",
        icon: "Axis3d",
        area: null,
        completed_tasks: 3,
        total_tasks: 3,
        progress_percentage: 100,
        last_activity_at: new Date().toISOString(),
      },
      {
        uuid: waitingProjectUuid,
        name: "Waiting plan",
        icon: null,
        area: null,
        completed_tasks: 0,
        total_tasks: 0,
        progress_percentage: null,
        last_activity_at: new Date().toISOString(),
      },
      {
        uuid: unknownIconProjectUuid,
        name: "Unknown icon project",
        icon: "MissingProjectIcon",
        area: null,
        completed_tasks: 1,
        total_tasks: 2,
        progress_percentage: 50,
        last_activity_at: new Date().toISOString(),
      },
    ],
    areas: [
      {
        uuid: areaUuid,
        name: "Life",
        icon: "Leaf",
        goals_count: 2,
        habits_count: 3,
        projects_count: 4,
      },
      {
        uuid: learningAreaUuid,
        name: "Learning",
        icon: "ArrowDownAZ",
        goals_count: 1,
        habits_count: 2,
        projects_count: 1,
      },
      {
        uuid: noIconAreaUuid,
        name: "Wellbeing",
        icon: null,
        goals_count: 1,
        habits_count: 0,
        projects_count: 0,
      },
      {
        uuid: unknownIconAreaUuid,
        name: "Unknown icon area",
        icon: "MissingAreaIcon",
        goals_count: 0,
        habits_count: 0,
        projects_count: 0,
      },
    ],
    recent_resources: [
      {
        item_key: `note:${resourceUuid}`,
        type: "note",
        title: "Knowledge note",
        resource_uuid: resourceUuid,
        occurred_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      },
      {
        item_key: "attachment:6de7daf9-8149-4ba9-a5a2-3314e6528c3a",
        type: "image",
        title: "Reference image.png",
        resource_uuid: resourceUuid,
        occurred_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      },
    ],
    archives: { projects: 4, areas: 2, resources: 6 },
  };
}

const resource: Resource = {
  id: 1,
  uuid: resourceUuid,
  title: "Knowledge note",
  icon: "BookOpen",
  background: "#000000",
  type: "note",
  description: null,
  url: null,
  author: null,
  source: null,
  is_favorite: false,
  archived_at: null,
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: "2026-09-25T00:00:00.000Z",
  content: null,
  types: ["note"],
  attachments: [],
  tags: [],
  projects: [],
  areas: [],
};

const projectDetail: ProjectDetail = {
  uuid: projectUuid,
  name: "North star",
  slug: "north-star",
  description: null,
  icon: "ChartNoAxesCombined",
  background: null,
  status: "in_progress",
  progress_percentage: 50,
  start_date: null,
  due_date: null,
  is_overdue: false,
  days_overdue: null,
  archived_at: null,
  area: { uuid: areaUuid, name: "Life", slug: "life", icon: "Leaf" },
  goals: { count: 2, url: null },
  boards: [],
  resources: [],
};

const areaDetail: Area = {
  id: 1,
  uuid: areaUuid,
  name: "Life",
  slug: "life",
  icon: "Leaf",
  background: null,
  background_image: null,
  background_image_url: null,
  description: null,
  archived_at: null,
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: "2026-09-25T00:00:00.000Z",
};

async function mockApi(page: Page, data: HomeData, {
  firstName = "Test",
  beforeHomeResponse,
}: {
  firstName?: string;
  beforeHomeResponse?: () => Promise<void>;
} = {}) {
  const homeRequests: URL[] = [];
  const authRequests: URL[] = [];
  let homeFails = false;
  let resourceFails = false;

  await page.context().addCookies([{
    name: "auth_token",
    value: "playwright-session",
    url: "http://127.0.0.1:3107",
  }]);

  await page.route("**/api-test/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api-test/v1", "");
    let result: unknown = [];
    let status = 200;

    if (path === "/auth/me") {
      authRequests.push(url);
      result = {
        id: 1,
        first_name: firstName,
        last_name: "User",
        full_name: "Test User",
        username: "tester",
        email: "tester@example.com",
      };
    } else if (path === "/home") {
      homeRequests.push(url);
      await beforeHomeResponse?.();
      if (homeFails) status = 503;
      result = status === 200 ? data : null;
    } else if (path === "/notifications") {
      result = {
        current_page: 1,
        data: [],
        last_page: 1,
        per_page: 15,
        total: 0,
      };
    } else if (path === `/project/${projectUuid}`) {
      result = projectDetail;
    } else if (path === `/area/${areaUuid}`) {
      result = areaDetail;
    } else if (path === `/area/${areaUuid}/projects`) {
      result = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    } else if (path === `/resource/${resourceUuid}`) {
      if (resourceFails) status = 503;
      result = status === 200 ? resource : null;
    } else if (path === "/resource") {
      result = {
        current_page: 1,
        data: [],
        last_page: 1,
        per_page: 15,
        total: 0,
        next_page_url: null,
      };
    }

    await route.fulfill({
      status,
      json: { data: result, status, message: status === 200 ? "OK" : "Unavailable" },
    });
  });

  return {
    homeRequests,
    authRequests,
    setHomeFails: (value: boolean) => { homeFails = value; },
    setResourceFails: (value: boolean) => { resourceFails = value; },
  };
}

async function captureHome(page: Page, testInfo: TestInfo, name: string, scrollToTop = true) {
  if (scrollToTop) {
    await page.locator("#app-shell main").evaluate((element) => { element.scrollTop = 0; });
  }
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function expectSharedHomeTheme(page: Page) {
  const colors = await page.locator(".home-workspace").evaluate((element) => {
    const appTheme = getComputedStyle(document.documentElement);
    const homeTheme = getComputedStyle(element);
    return [
      "--background", "--foreground", "--card", "--card-foreground",
      "--primary", "--primary-foreground", "--secondary", "--secondary-foreground",
      "--muted", "--muted-foreground", "--border", "--ring",
    ].map((property) => ({
      property,
      app: appTheme.getPropertyValue(property).trim(),
      home: homeTheme.getPropertyValue(property).trim(),
    }));
  });
  for (const color of colors) {
    expect(color.home, `${color.property} should match the shared app theme`).toBe(color.app);
  }
}

test("home shows backend totals, progress, links, and local streak timezone", async ({ page }, testInfo) => {
  const state = await mockApi(page, populatedHome());
  await page.goto("/home");

  await expect(page.getByRole("heading", { name: "Welcome, Test.", level: 1 })).toBeVisible();
  const homeLink = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home" });
  await expect(homeLink).toHaveAttribute("href", "/home");
  await expect(homeLink.locator("svg.lucide-house")).toBeVisible();
  await expect(page.getByText("Make room for what matters today.")).toBeVisible();
  const overview = page.getByRole("region", { name: "Overview" });
  const metricCards = overview.locator('dl > [data-slot="card"]');
  await expect(metricCards).toHaveCount(4);
  await expectSharedHomeTheme(page);
  for (const [label, value, iconClass] of [
    ["Active projects", "11", "lucide-target"],
    ["Areas", "4", "lucide-circle-pile"],
    ["Resources saved", "13", "lucide-book-open"],
    ["Habit streak", "5", "lucide-flame"],
  ]) {
    const metric = metricCards.filter({ hasText: label });
    await expect(metric.locator("dd")).toContainText(value);
    await expect(metric.locator(`svg.${iconClass}`)).toBeVisible();
    await expect(metric.locator(`svg.${iconClass}`)).toHaveAttribute("aria-hidden", "true");
  }
  await expect(page.getByText("2 of 4 tasks")).toBeVisible();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();
  await expect(page.getByText("No tasks yet")).toBeVisible();
  await expect(page.getByRole("link", { name: /North star/ })).toHaveAttribute("href", `/projects/${projectUuid}`);
  await expect(page.getByRole("region", { name: "Projects" }).getByRole("link", { name: "Open area Life" })).toHaveAttribute("href", `/areas/${areaUuid}`);
  await expect(page.getByRole("link", { name: "View archive" })).toHaveAttribute("href", "/archives");
  const utilities = page.getByRole("region", { name: "Everyday tools" });
  for (const [label, href] of [
    ["Board", "/board"], ["Focus", "/focus"], ["Habits", "/habits"],
    ["Notes", "/notes"], ["Journal", "/journal"],
    ["Letters", "/letters"], ["Plans", "/plans"],
  ]) {
    await expect(utilities.getByRole("link", { name: label })).toHaveAttribute("href", href);
  }
  await expect.poll(() => state.homeRequests.length).toBeGreaterThan(0);
  expect(state.homeRequests[0].searchParams.get("timezone")).toBe("Asia/Manila");
  expect(state.authRequests).toHaveLength(1);
  await captureHome(page, testInfo, "home-desktop-light");

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { name: "Welcome, Test.", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Areas" }).getByRole("link", { name: "Open area Life" })).toBeVisible();
    const cardBounds = await metricCards.evaluateAll((cards) => cards.map((card) => {
      const { x, y, width, height } = card.getBoundingClientRect();
      return { x, y, width, height };
    }));
    expect(new Set(cardBounds.map((card) => Math.round(card.y))).size).toBe(width < 1024 ? 2 : 1);
    expect(cardBounds[1].x).toBeGreaterThan(cardBounds[0].x + cardBounds[0].width);
    for (const card of cardBounds) {
      expect(card.height).toBeGreaterThanOrEqual(128);
      expect(Math.abs(card.height - cardBounds[0].height)).toBeLessThanOrEqual(1);
      expect(Math.abs(card.width - cardBounds[0].width)).toBeLessThanOrEqual(1);
    }
    const metricAlignment = await page.getByRole("region", { name: "Areas" })
      .locator('[data-slot="card"] dl > div')
      .evaluateAll((metrics) => metrics.map((metric) => {
        const center = metric.getBoundingClientRect().left + metric.getBoundingClientRect().width / 2;
        const textOffset = (selector: string) => {
          const element = metric.querySelector(selector);
          if (!element) return Number.POSITIVE_INFINITY;
          const range = document.createRange();
          range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          return Math.abs(text.left + text.width / 2 - center);
        };
        return { number: textOffset("dd"), label: textOffset("dt") };
      }));
    expect(metricAlignment).toHaveLength(populatedHome().areas.length * 3);
    for (const metric of metricAlignment) {
      expect(metric.number).toBeLessThanOrEqual(2);
      expect(metric.label).toBeLessThanOrEqual(2);
    }
    const main = page.locator("#app-shell main");
    expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (width === 375) await captureHome(page, testInfo, "home-mobile-light");
  }

  await page.getByRole("heading", { name: "Areas", exact: true }).scrollIntoViewIfNeeded();
  await captureHome(page, testInfo, "home-desktop-light-workspace", false);
  await page.getByRole("link", { name: /Knowledge note/ }).click();
  await expect(page).toHaveURL(new RegExp(`/resources\\?resource=${resourceUuid}$`));
  const details = page.getByRole("dialog", { name: "Resource details", exact: true });
  await expect(details).toBeVisible();
  await expect(details.getByLabel(/^Title/)).toHaveValue(resource.title);
  await expect(details.getByRole("button", { name: "Done", exact: true })).toBeVisible();
});

test("home renders saved icons and fallback icons with accessible card navigation", async ({ page }) => {
  await mockApi(page, populatedHome());
  await page.goto("/home");

  const projects = page.getByRole("region", { name: "Projects" });
  const areas = page.getByRole("region", { name: "Areas" });
  const projectCard = (name: string) =>
    projects.getByRole("link", { name: `Open project ${name}` })
      .locator('xpath=ancestor::*[@data-slot="card"][1]');
  const areaCard = (name: string) =>
    areas.getByRole("link", { name: `Open area ${name}` })
      .locator('xpath=ancestor::*[@data-slot="card"][1]');

  await expect(projectCard("North star").locator('svg[data-icon-name="chart-no-axes-combined"]')).toBeVisible();
  await expect(projectCard("Completed roadmap").locator('svg[data-icon-name="axis-3d"]')).toBeVisible();
  await expect(projectCard("Waiting plan").locator("svg.lucide-rocket")).toBeVisible();
  await expect(projectCard("Unknown icon project").locator("svg.lucide-rocket")).toBeVisible();
  await expect(areaCard("Life").locator('svg[data-icon-name="leaf"]')).toBeVisible();
  await expect(areaCard("Learning").locator('svg[data-icon-name="arrow-down-a-z"]')).toBeVisible();
  await expect(areaCard("Wellbeing").locator("svg.lucide-leaf")).toBeVisible();
  await expect(areaCard("Unknown icon area").locator("svg.lucide-leaf")).toBeVisible();

  const projectLink = projects.getByRole("link", { name: "Open project North star" });
  const projectBounds = await projectCard("North star").boundingBox();
  const projectLinkBounds = await projectLink.boundingBox();
  expect(projectBounds).not.toBeNull();
  expect(projectLinkBounds?.height).toBeGreaterThan(projectBounds!.height * 0.9);
  expect(projectLinkBounds?.width).toBeGreaterThan(projectBounds!.width * 0.9);
  await page.keyboard.press("Tab");
  await projectLink.focus();
  await expect(projectLink).toBeFocused();
  await expect(projectLink).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/projects/${projectUuid}$`));

  await page.goto("/home");
  const areaLink = page.getByRole("region", { name: "Areas" }).getByRole("link", { name: "Open area Life" });
  await expect(areaLink).toHaveAttribute("href", `/areas/${areaUuid}`);
  const areaBounds = await areaCard("Life").boundingBox();
  const areaLinkBounds = await areaLink.boundingBox();
  expect(areaBounds).not.toBeNull();
  expect(areaLinkBounds?.height).toBeGreaterThan(areaBounds!.height * 0.9);
  expect(areaLinkBounds?.width).toBeGreaterThan(areaBounds!.width * 0.9);
  await areaLink.click();
  await expect(page).toHaveURL(new RegExp(`/areas/${areaUuid}$`));

  await page.goto("/home");
  const areaBadge = page.getByRole("region", { name: "Projects" }).getByRole("link", { name: "Open area Life" });
  await expect(areaBadge).toHaveAttribute("href", `/areas/${areaUuid}`);
  await areaBadge.click();
  await expect(page).toHaveURL(new RegExp(`/areas/${areaUuid}$`));
});

test("home keeps its welcome and everyday tools available while the overview loads", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-08T17:30:00.000Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  let releaseHome = () => {};
  const homeResponse = new Promise<void>((resolve) => { releaseHome = resolve; });
  const state = await mockApi(page, populatedHome(), { beforeHomeResponse: () => homeResponse });
  await page.goto("/home");

  try {
    const loading = page.getByRole("status", { name: "Loading home" });
    await expect(loading).toBeVisible();
    await expect(loading.locator('[data-slot="card"]')).toHaveCount(4);
    await expect(loading.locator('[data-slot="skeleton"]').first()).toHaveCSS("animation-name", "none");
    await expect(page.getByRole("heading", { name: "Welcome, Test.", level: 1 })).toBeVisible();
    await expect(page.getByText("Friday, October 9", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Find your focus" })).toHaveAttribute("href", "/focus");
    await expect(page.getByRole("link", { name: "Open journal" })).toHaveAttribute("href", "/journal");
    await expect(page.getByRole("region", { name: "Everyday tools" }).getByRole("link")).toHaveCount(7);
    expect(state.authRequests).toHaveLength(1);
  } finally {
    releaseHome();
  }

  await expect(page.getByText("North star", { exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading home" })).toHaveCount(0);
});

test("home uses a welcoming fallback when the first name is blank", async ({ page }) => {
  await mockApi(page, populatedHome(), { firstName: "   " });
  await page.goto("/home");

  await expect(page.getByRole("heading", { name: "Welcome to your space.", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find your focus" })).toHaveAttribute("href", "/focus");
});

test("home keeps long names and titles within the available space", async ({ page }) => {
  const data = populatedHome();
  const firstName = "Alexandria".repeat(8);
  const areaName = "Personal-growth-".repeat(12);
  data.projects[0].name = "A-thoughtful-long-term-project-".repeat(10);
  data.projects[0].area = { uuid: areaUuid, name: areaName };
  data.areas[0].name = areaName;
  data.recent_resources[0].title = "An-interesting-reference-to-revisit-".repeat(10);
  await mockApi(page, data, { firstName });
  await page.goto("/home");

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { name: `Welcome, ${firstName}.`, level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: `Open project ${data.projects[0].name}` })).toBeVisible();
    const main = page.locator("#app-shell main");
    const size = await main.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowing: Array.from(element.querySelectorAll<HTMLElement>("*")).filter((child) => (
        child.getBoundingClientRect().right > element.getBoundingClientRect().right + 1
      )).slice(0, 6).map((child) => ({ tag: child.tagName, className: child.className })),
    }));
    expect(size.scrollWidth, `Overflow at ${width}px: ${JSON.stringify(size.overflowing)}`).toBeLessThanOrEqual(size.clientWidth + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});

test("home supports dark mode, keyboard focus, and reduced motion", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page, populatedHome());
  await page.goto("/home");

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByText("North star", { exact: true })).toBeVisible();
  await expectSharedHomeTheme(page);
  await expect(page.getByRole("region", { name: "Overview" }).locator('[data-slot="card"]')).toHaveCount(4);
  const project = page.getByRole("link", { name: "Open project North star" });
  const card = project.locator('xpath=ancestor::*[@data-slot="card"][1]');
  await expect(card).toHaveCSS("transition-property", "none");
  await expect(card.locator('[data-slot="progress-indicator"]')).toHaveCSS("transition-property", "none");
  await page.keyboard.press("Tab");
  const focus = page.getByRole("link", { name: "Find your focus" });
  await focus.focus();
  await expect(focus).toBeFocused();
  await expect(focus).not.toHaveCSS("box-shadow", "none");

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const tools = page.getByRole("region", { name: "Everyday tools" }).getByRole("link");
    for (const link of await tools.all()) {
      const bounds = await link.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
    }
    const main = page.locator("#app-shell main");
    expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    if (width === 375 || width === 1440) {
      await captureHome(page, testInfo, width === 375 ? "home-mobile-dark" : "home-desktop-dark");
    }
  }
  await page.getByRole("heading", { name: "Areas", exact: true }).scrollIntoViewIfNeeded();
  await captureHome(page, testInfo, "home-desktop-dark-workspace", false);
});

test("empty home shows zero totals and helpful empty sections", async ({ page }) => {
  await mockApi(page, {
    stats: { active_projects: 0, areas: 0, resources_saved: 0, habit_streak: 0 },
    projects: [],
    areas: [],
    recent_resources: [],
    archives: { projects: 0, areas: 0, resources: 0 },
  });
  await page.goto("/home");

  await expect(page.getByRole("heading", { name: "Welcome, Test.", level: 1 })).toBeVisible();
  const metricCards = page.getByRole("region", { name: "Overview" }).locator('[data-slot="card"]');
  await expect(metricCards).toHaveCount(4);
  await expect(metricCards.locator("dd")).toHaveText(["0", "0", "0", /0\s*days/]);
  await expect(page.getByText("No projects yet")).toBeVisible();
  await expect(page.getByText("No areas yet")).toBeVisible();
  await expect(page.getByText("No recent resources")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to projects" })).toHaveAttribute("href", "/projects");
  await expect(page.getByRole("link", { name: "Go to areas" })).toHaveAttribute("href", "/areas");
  await expect(page.getByRole("link", { name: "Browse resources" })).toHaveAttribute("href", "/resources");
  await expect(page.getByRole("link", { name: "View archive" })).toHaveAttribute("href", "/archives");
});

test("home request failure offers a retry", async ({ page }) => {
  const state = await mockApi(page, populatedHome());
  state.setHomeFails(true);
  await page.goto("/home");

  await expect(page.locator("#app-shell main").getByRole("alert")).toContainText("Home could not be loaded");
  await expect(page.getByRole("heading", { name: "Welcome, Test.", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find your focus" })).toHaveAttribute("href", "/focus");
  await expect(page.getByRole("link", { name: "Open journal" })).toHaveAttribute("href", "/journal");
  await expect(page.getByRole("region", { name: "Everyday tools" }).getByRole("link")).toHaveCount(7);
  state.setHomeFails(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("North star")).toBeVisible();
  expect(state.homeRequests.length).toBeGreaterThanOrEqual(2);
});

test("resource deep link retries a failed detail request and closes cleanly", async ({ page }) => {
  const state = await mockApi(page, populatedHome());
  state.setResourceFails(true);
  await page.goto(`/resources?resource=${resourceUuid}`);

  const errorDialog = page.getByRole("dialog", { name: "Resource could not be loaded" });
  await expect(errorDialog).toBeVisible();
  await expect(errorDialog.getByRole("alert")).toBeVisible();
  state.setResourceFails(false);
  await page.getByRole("button", { name: "Try again" }).click();
  const details = page.getByRole("dialog", { name: "Resource details", exact: true });
  await expect(details).toBeVisible();
  await expect(details.getByLabel(/^Title/)).toHaveValue(resource.title);
  await details.getByRole("button", { name: "Close resource dialog" }).click();
  await expect(page).toHaveURL(/\/resources$/);
});
