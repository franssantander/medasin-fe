import { expect, test, type Page } from "@playwright/test";
import { ApiError } from "@/lib/axios/errors";
import { getPlanLimitMeta, isPlanLimitError } from "./plan-limit-error";
import { subscriptionSchema, type Subscription } from "./types";

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    plan: { slug: "free", name: "Free" },
    grant_type: "free",
    expires_at: null,
    enforcement_enabled: true,
    limits: { projects: 10, areas: 5, resources: 100 },
    usage: { projects: 3, areas: 2, resources: 30 },
    ...overrides,
  };
}

async function fixture(page: Page, initial: unknown = subscription(), defer = false) {
  let value = initial;
  let failure = 0;
  let calls = 0;
  let userId = 7;
  let release = () => {};
  let ready = defer ? new Promise<void>((resolve) => { release = resolve; }) : Promise.resolve();

  await page.context().addCookies([{
    name: "auth_token", value: "subscription-test-session", url: "http://127.0.0.1:3107",
  }]);
  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    let data: unknown = [];
    if (path === "/auth/logout") {
      await route.fulfill({ headers: { "set-cookie": "auth_token=; Path=/; Max-Age=0" }, json: { data: null, status: 200, message: "Logged out" } });
      return;
    } else if (path === "/auth/refresh" || (path === "/auth/me" && !(await page.context().cookies()).some((cookie) => cookie.name === "auth_token"))) {
      await route.fulfill({ status: 401, json: { data: null, status: 401, message: "Unauthenticated" } });
      return;
    } else if (path === "/auth/me" || path === "/auth/login") {
      data = { id: userId, first_name: "Test", last_name: "User", username: "tester", email: "tester@example.com" };
      if (path === "/auth/login") {
        await route.fulfill({ headers: { "set-cookie": "auth_token=subscription-test-session; Path=/; HttpOnly; SameSite=Strict" }, json: { data, status: 200, message: "Logged in" } });
        return;
      }
    } else if (path === "/home") {
      data = { stats: { active_projects: 0, areas: 0, resources_saved: 0, habit_streak: 0 }, projects: [], areas: [], recent_resources: [], archives: { projects: 0, areas: 0, resources: 0 } };
    } else if (path === "/notifications") {
      data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    } else if (path === "/subscription") {
      calls++;
      await ready;
      if (failure) {
        await route.fulfill({ status: failure, json: { data: null, status: failure, message: "Plan details are temporarily unavailable." } });
        return;
      }
      data = value;
    }
    await route.fulfill({ json: { data, status: 200, message: "OK" } });
  });

  return {
    calls: () => calls,
    setValue: (next: unknown) => { value = next; },
    fail: (status = 500) => { failure = status; },
    recover: () => { failure = 0; },
    release: () => release(),
    setUser: (id: number) => { userId = id; },
    deferNext: () => { ready = new Promise<void>((resolve) => { release = resolve; }); },
  };
}

for (const [name, limits] of [
  ["Free", { projects: 10, areas: 5, resources: 100 }],
  ["Focus", { projects: 50, areas: 20, resources: 1000 }],
  ["Clarity", { projects: null, areas: null, resources: null }],
] as const) {
  test(`Plan and usage renders effective ${name} limits`, async ({ page }) => {
    await fixture(page, subscription({
      plan: { slug: name.toLowerCase(), name },
      grant_type: name === "Free" ? "free" : "recurring",
      limits,
    }));
    await page.goto("/settings/plan");
    const content = page.getByRole("region", { name: "Settings content" });
    await expect(content.getByText(name, { exact: true })).toBeVisible();
    for (const [index, key] of (["projects", "areas", "resources"] as const).entries()) {
      const usage = [3, 2, 30][index];
      const limit = limits[key] === null ? "Unlimited" : limits[key].toLocaleString();
      await expect(content.getByText(`${usage} of ${limit}`, { exact: true })).toBeVisible();
    }
    await expect(content.getByText("Board, Focus, Habits, Notes, Journal, Letters, and Calendar Plans have no plan limits.")).toBeVisible();
    await expect(content.getByRole("button", { name: /upgrade|checkout/i })).toHaveCount(0);
  });
}

test("Plan usage preserves zero and over-limit states without a client gate", async ({ page }) => {
  await fixture(page, subscription({
    limits: { projects: 0, areas: 1, resources: 100 },
    usage: { projects: 0, areas: 2, resources: 100 },
  }));
  await page.goto("/settings/plan");
  await expect(page.getByText("0 of 0", { exact: true })).toBeVisible();
  await expect(page.getByText("2 of 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Over limit", { exact: true })).toBeVisible();
  await expect(page.getByText("Limit reached", { exact: true })).toHaveCount(2);
  await expect(page.getByText(/Existing items remain available to view, edit, archive, and delete/)).toBeVisible();
});

test("Plan usage shows effective unlimited access with enforcement disabled", async ({ page }) => {
  await fixture(page, subscription({ enforcement_enabled: false, limits: { projects: null, areas: null, resources: null } }));
  await page.goto("/settings/plan");
  await expect(page.getByText("Plan enforcement is disabled", { exact: true })).toBeVisible();
  await expect(page.getByText("3 of Unlimited", { exact: true })).toBeVisible();
});

test("Recurring access displays the server expiry without renewal promises", async ({ page }, testInfo) => {
  await fixture(page, subscription({
    plan: { slug: "focus", name: "Focus" }, grant_type: "recurring",
    expires_at: "2027-01-15T12:00:00.000000Z", limits: { projects: 50, areas: 20, resources: 1000 },
  }));
  await page.goto("/settings/plan");
  await expect(page.getByText("Access until Jan 15, 2027", { exact: true })).toBeVisible();
  await expect(page.getByText(/renews|next payment|billing/i)).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("plan-usage-desktop.png"), fullPage: true });
});

test("Lifetime access displays unlimited usage without an expiry", async ({ page }) => {
  await fixture(page, subscription({
    plan: { slug: "clarity", name: "Clarity" }, grant_type: "lifetime",
    expires_at: null, limits: { projects: null, areas: null, resources: null },
  }));
  await page.goto("/settings/plan");
  await expect(page.getByText("Lifetime access", { exact: true })).toBeVisible();
  await expect(page.getByText("3 of Unlimited", { exact: true })).toBeVisible();
  await expect(page.getByText(/Access until/)).toHaveCount(0);
});

test("Logging out and signing into another account clears previous plan usage", async ({ page }) => {
  const controls = await fixture(page, subscription({
    plan: { slug: "clarity", name: "Clarity" }, limits: { projects: null, areas: null, resources: null },
  }));
  await page.goto("/settings/plan");
  await expect(page.getByText("3 of Unlimited", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open account menu for Test User" }).click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  controls.setUser(8);
  controls.setValue(subscription({ usage: { projects: 1, areas: 0, resources: 0 } }));
  controls.deferNext();
  await page.getByLabel("Username", { exact: true }).fill("second_account");
  await page.getByLabel("Password", { exact: true }).fill("a secure password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Plan & usage" }).click();
  await expect(page.getByRole("status", { name: "Loading plan and usage" })).toBeVisible();
  await expect(page.getByText("Clarity", { exact: true })).toHaveCount(0);
  await expect(page.getByText("3 of Unlimited", { exact: true })).toHaveCount(0);
  controls.release();
  await expect(page.getByText("1 of 10", { exact: true })).toBeVisible();
});

test("Plan usage loads, retries failures and keeps previous usage after refresh errors", async ({ page }) => {
  const controls = await fixture(page, subscription(), true);
  controls.fail();
  await page.goto("/settings/plan");
  await expect(page.getByRole("status", { name: "Loading plan and usage" })).toBeVisible();
  controls.release();
  await expect(page.getByText("Plan information could not be loaded", { exact: true })).toBeVisible();
  controls.recover();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("3 of 10", { exact: true })).toBeVisible();
  controls.fail();
  await page.getByRole("button", { name: "Refresh usage" }).click();
  await expect(page.getByText("Usage may be out of date", { exact: true })).toBeVisible();
  await expect(page.getByText("3 of 10", { exact: true })).toBeVisible();
  controls.recover();
  controls.setValue(subscription({ usage: { projects: 4, areas: 2, resources: 30 } }));
  await page.getByRole("button", { name: "Refresh usage" }).click();
  await expect(page.getByText("4 of 10", { exact: true })).toBeVisible();
  await expect(page.getByText("Usage may be out of date", { exact: true })).toHaveCount(0);
});

test("Plan usage rejects missing limits without displaying Unlimited", async ({ page }) => {
  await fixture(page, { ...subscription(), limits: { projects: 10, resources: 100 } });
  await page.goto("/settings/plan");
  await expect(page.getByText("The server returned incomplete plan information. Please try again.", { exact: true })).toBeVisible();
  await expect(page.getByText(/of Unlimited/)).toHaveCount(0);
});

test("Plan reads only while mounted and refreshes on focus and revisiting", async ({ page }) => {
  const controls = await fixture(page);
  await page.goto("/settings/preferences");
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  expect(controls.calls()).toBe(0);
  const navigation = page.getByRole("navigation", { name: "Settings navigation" });
  await navigation.getByRole("link", { name: "Plan & usage" }).click();
  await expect(page.getByText("3 of 10", { exact: true })).toBeVisible();
  const beforeFocus = controls.calls();
  controls.setValue(subscription({ usage: { projects: 4, areas: 2, resources: 30 } }));
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(controls.calls).toBeGreaterThan(beforeFocus);
  await expect(page.getByText("4 of 10", { exact: true })).toBeVisible();
  await navigation.getByRole("link", { name: "Preferences" }).click();
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  controls.setValue(subscription({ usage: { projects: 5, areas: 2, resources: 30 } }));
  await navigation.getByRole("link", { name: "Plan & usage" }).click();
  await expect(page.getByText("5 of 10", { exact: true })).toBeVisible();
});

test("Plan usage keeps permission errors distinct and fits a narrow viewport", async ({ page }, testInfo) => {
  const controls = await fixture(page);
  controls.fail(403);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/settings/plan");
  await expect(page.getByText("Plan details are temporarily unavailable.", { exact: true })).toBeVisible();
  await expect(page.getByText("Plan limit reached", { exact: true })).toHaveCount(0);
  controls.recover();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("3 of 10", { exact: true })).toBeVisible();
  expect(await page.locator("body").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("plan-usage-mobile-375.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 812 });
  await expect(page.getByRole("heading", { name: "Plan & usage", exact: true })).toBeVisible();
  expect(await page.locator("body").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const content = page.getByRole("region", { name: "Settings content" });
  expect(await content.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("plan-usage-mobile-320.png"), fullPage: true });
});

test("Quota metadata accepts only the plan error code and valid Core numbers", () => {
  const valid = new ApiError("Quota reached", 403, { code: "PLAN_LIMIT_EXCEEDED", data: { meta: { feature: "areas", usage: 5, limit: 5 } } });
  expect(isPlanLimitError(valid)).toBe(true);
  expect(getPlanLimitMeta(valid)).toEqual({ feature: "areas", usage: 5, limit: 5 });
  const validation = new ApiError("Validation failed", 422, { validationErrors: { name: ["Required"] }, data: { meta: { feature: "areas", usage: 5, limit: 5 } } });
  expect(isPlanLimitError(validation)).toBe(false);
  expect(getPlanLimitMeta(validation)).toBeNull();
  for (const meta of [undefined, {}, { feature: "notes", usage: 5, limit: 5 }, { feature: "areas", usage: "5", limit: 5 }, { feature: "areas", usage: -1, limit: null }]) {
    expect(getPlanLimitMeta(new ApiError("Quota reached", 403, { code: "PLAN_LIMIT_EXCEEDED", data: { meta } }))).toBeNull();
  }
  for (const limits of [{ projects: 10, resources: 100 }, { projects: "10", areas: 5, resources: 100 }, { projects: -1, areas: 5, resources: 100 }]) {
    expect(subscriptionSchema.safeParse({ ...subscription(), limits }).success).toBe(false);
  }
});
