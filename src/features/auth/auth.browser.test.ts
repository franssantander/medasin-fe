import { expect, test, type Page } from "@playwright/test";

type ApiReply = {
  data?: unknown;
  code?: string;
  status?: number;
  message?: string;
  errors?: Record<string, string[]>;
  headers?: Record<string, string>;
};

type ApiRequest = { path: string; method: string; body: unknown };
type ApiHandler = (request: ApiRequest) => ApiReply | Promise<ApiReply>;

const registration = {
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  username: "ada_lovelace",
  password: "a secure password",
  password_confirmation: "a secure password",
};

const rememberedUsernameKey = "medasin.auth.remembered-username.v1";

const emailVerification = {
  email: registration.email,
  verification_required: true,
  otp_expires_in: 3600,
  resend_after: 60,
};

const verificationRequired: ApiReply = {
  status: 422,
  code: "EMAIL_VERIFICATION_REQUIRED",
  message: "Please verify your email address before logging in.",
  data: emailVerification,
  errors: { email: ["Please verify your email address before logging in."] },
};

const currentUser = {
  id: 1,
  uuid: "10000000-0000-4000-8000-000000000001",
  first_name: "Ada",
  last_name: "Lovelace",
  email: registration.email,
  username: registration.username,
  status: "active",
  font_family: "manrope",
};

function authenticatedReply(request: ApiRequest, defaultRememberMe: boolean): ApiReply {
  const rememberMe = (request.body as { remember_me?: boolean } | null)?.remember_me ?? defaultRememberMe;
  return {
    data: currentUser,
    headers: {
      "set-cookie": `auth_token=verified-test-session; Path=/; HttpOnly; SameSite=Strict${rememberMe ? "; Max-Age=604800" : ""}`,
    },
  };
}

async function mockApi(page: Page, handlers: Record<string, ApiHandler> = {}) {
  const requests: ApiRequest[] = [];

  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    const request = {
      path,
      method: route.request().method(),
      body: route.request().postDataJSON(),
    };
    requests.push(request);

    let reply: ApiReply = { data: null };
    if (handlers[path]) {
      reply = await handlers[path](request);
    } else if (path === "/auth/register") {
      reply = { status: 201, data: emailVerification };
    } else if (path === "/auth/forgot-password" || path === "/auth/resend-verification") {
      reply = { status: 202 };
    } else if (path === "/auth/verify-password-reset") {
      reply = { data: { reset_token: "one-time-reset-grant", expires_in: 900 } };
    } else if (path === "/auth/login") {
      reply = authenticatedReply(request, false);
    } else if (path === "/auth/logout") {
      reply = { headers: { "set-cookie": "auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" } };
    } else if (path === "/auth/refresh") {
      reply = { status: 401, message: "Unauthenticated." };
    } else if (path === "/auth/verify-email") {
      reply = authenticatedReply(request, true);
    } else if (path === "/auth/me") {
      const authenticated = (await page.context().cookies()).some((cookie) => cookie.name === "auth_token");
      reply = authenticated ? { data: currentUser } : { status: 401, message: "Unauthenticated." };
    } else if (path === "/home") {
      reply = {
        data: {
          stats: { active_projects: 0, areas: 0, resources_saved: 0, habit_streak: 0 },
          projects: [],
          areas: [],
          recent_resources: [],
          archives: { projects: 0, areas: 0, resources: 0 },
        },
      };
    } else if (path === "/notifications") {
      reply = { data: { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 } };
    }

    const status = reply.status ?? 200;
    await route.fulfill({
      status,
      headers: reply.headers,
      json: {
        data: reply.data ?? null,
        status,
        message: reply.message ?? "OK",
        ...(reply.code ? { code: reply.code } : {}),
        ...(reply.errors ? { errors: reply.errors } : {}),
      },
    });
  });

  return {
    requests,
    forPath: (path: string) => requests.filter((request) => request.path === path),
  };
}

async function fillRegistration(page: Page, password = registration.password) {
  await page.getByLabel("First name", { exact: true }).fill(registration.first_name);
  await page.getByLabel("Last name", { exact: true }).fill(registration.last_name);
  await page.getByLabel("Email", { exact: true }).fill(registration.email);
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
}

async function storedUsername(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), rememberedUsernameKey);
}

async function seedRememberedUsername(page: Page, username: string) {
  await page.goto("/login");
  await page.evaluate(({ key, username }) => localStorage.setItem(key, username), {
    key: rememberedUsernameKey, username,
  });
  await page.reload();
}

async function requestRecovery(page: Page) {
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(registration.email);
  await page.getByRole("button", { name: "Send reset code", exact: true }).click();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeVisible();
  await expect(page.getByText(/10 minutes/)).toBeVisible();
}

async function verifyRecovery(page: Page) {
  await page.getByLabel("Verification code", { exact: true }).fill("012345");
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
}

function deferredReply(reply: ApiReply) {
  let release = () => {};
  const response = new Promise<ApiReply>((resolve) => { release = () => resolve(reply); });
  return { handler: () => response, release: () => release() };
}

for (const rememberMe of [false, true]) {
  test(`verified login sends remember_me=${rememberMe} and receives a ${rememberMe ? "persistent" : "session"} cookie`, async ({ page }) => {
    const api = await mockApi(page);
    await page.goto("/login");
    const checkbox = page.getByRole("checkbox", { name: "Remember me", exact: true });
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByLabel("Username", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
    expect(await storedUsername(page)).toBeNull();
    await page.getByLabel("Username", { exact: true }).fill(registration.username);
    await page.getByLabel("Password", { exact: true }).fill(registration.password);
    if (rememberMe) {
      await page.getByText("Remember me", { exact: true }).click();
      await expect(checkbox).toBeChecked();
    }
    expect(await storedUsername(page)).toBeNull();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    expect(api.forPath("/auth/login")).toEqual([{
      path: "/auth/login",
      method: "POST",
      body: { username: registration.username, password: registration.password, remember_me: rememberMe },
    }]);
    const cookie = (await page.context().cookies()).find((item) => item.name === "auth_token");
    expect(cookie?.httpOnly).toBe(true);
    if (rememberMe) {
      expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);
      expect(await storedUsername(page)).toBe(registration.username);
    } else {
      expect(cookie?.expires).toBe(-1);
      expect(await storedUsername(page)).toBeNull();
    }
  });
}

test("a remembered username survives logout and reload while private access is revoked", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  await page.getByRole("checkbox", { name: "Remember me", exact: true }).check();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(await storedUsername(page)).toBe(registration.username);
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain(registration.password);
  expect(storage).not.toContain("verified-test-session");
  expect(storage).not.toContain("012345");

  await page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true }).click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(api.forPath("/auth/logout")).toHaveLength(1);
  expect((await page.context().cookies()).some((cookie) => cookie.name === "auth_token")).toBe(false);
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(registration.username);
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).toBeChecked();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  expect(await storedUsername(page)).toBe(registration.username);

  await page.reload();
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(registration.username);
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).toBeChecked();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  const homeRequests = api.forPath("/home").length;
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true })).toHaveCount(0);
  expect(api.forPath("/home")).toHaveLength(homeRequests);
  expect(await storedUsername(page)).toBe(registration.username);
});

test("unchecking Remember me immediately removes the username and an unchecked login does not save it again", async ({ page }) => {
  const api = await mockApi(page);
  await seedRememberedUsername(page, registration.username);
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(registration.username);
  const checkbox = page.getByRole("checkbox", { name: "Remember me", exact: true });
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  expect(await storedUsername(page)).toBeNull();
  expect(api.forPath("/auth/login")).toHaveLength(0);

  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(await storedUsername(page)).toBeNull();
  expect(api.forPath("/auth/login")[0].body).toEqual({
    username: registration.username, password: registration.password, remember_me: false,
  });
  await page.goto("/login");
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(checkbox).not.toBeChecked();
});

test("a failed account switch preserves the remembered username and successful remembered login replaces it", async ({ page }) => {
  const previousUsername = "previous_member";
  const message = "These credentials do not match our records.";
  let rejectLogin = true;
  const api = await mockApi(page, {
    "/auth/login": (request) => rejectLogin
      ? { status: 422, errors: { username: [message] } }
      : authenticatedReply(request, false),
  });
  await seedRememberedUsername(page, previousUsername);
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(previousUsername);
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).toBeChecked();
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill("incorrect password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  expect(await storedUsername(page)).toBe(previousUsername);

  rejectLogin = false;
  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(await storedUsername(page)).toBe(registration.username);
  expect(api.forPath("/auth/login")).toHaveLength(2);
  await page.goto("/login");
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(registration.username);
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).toBeChecked();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
});

test("remembered OTP login saves the submitted username only after successful verification", async ({ page }) => {
  const previousUsername = "previous_member";
  const message = "The verification code is invalid or has expired.";
  let rejectVerification = true;
  const api = await mockApi(page, {
    "/auth/login": () => verificationRequired,
    "/auth/verify-email": (request) => rejectVerification
      ? { status: 422, errors: { otp: [message] } }
      : authenticatedReply(request, true),
  });
  await seedRememberedUsername(page, previousUsername);
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(previousUsername);
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeVisible();
  expect(await storedUsername(page)).toBe(previousUsername);
  await page.getByLabel("Verification code", { exact: true }).fill("000001");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  expect(await storedUsername(page)).toBe(previousUsername);

  await page.evaluate((key) => localStorage.setItem(key, "changed_in_another_tab"), rememberedUsernameKey);
  rejectVerification = false;
  await page.getByLabel("Verification code", { exact: true }).fill("012345");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(await storedUsername(page)).toBe(registration.username);
  expect(api.forPath("/auth/verify-email")).toHaveLength(2);
  expect((api.forPath("/auth/login")[0].body as { username: string }).username).toBe(registration.username);
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain(registration.password);
  expect(storage).not.toContain("012345");
  expect(storage).not.toContain("verified-test-session");
});

test("remembering a username preserves browser autofill entered before hydration", async ({ page }) => {
  const api = await mockApi(page);
  const autofilledUsername = "browser_autofilled_member";
  await page.addInitScript((key) => localStorage.setItem(key, "previous_member"), rememberedUsernameKey);
  let releaseClientScripts = () => {};
  const clientScriptsReady = new Promise<void>((resolve) => { releaseClientScripts = resolve; });
  await page.route(
    (url) => url.pathname.startsWith("/_next/static/") && url.pathname.endsWith(".js"),
    async (route) => {
      await clientScriptsReady;
      await route.continue();
    },
  );
  try {
    await page.goto("/login", { waitUntil: "commit" });
    const username = page.getByLabel("Username", { exact: true });
    const checkbox = page.locator("#login-remember-me");
    await expect(username).toBeVisible();
    await expect(checkbox).not.toBeChecked();
    await username.fill(autofilledUsername);
    releaseClientScripts();
    await expect(checkbox).toBeChecked();
    await expect(username).toHaveValue(autofilledUsername);
    await page.getByLabel("Password", { exact: true }).fill(registration.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    expect(api.forPath("/auth/login")[0].body).toEqual({
      username: autofilledUsername, password: registration.password, remember_me: true,
    });
    expect(await storedUsername(page)).toBe(autofilledUsername);
  } finally {
    releaseClientScripts();
  }
});

for (const value of ["", "   "]) {
  test(`an ${value ? "all-space" : "empty"} remembered username is ignored without blocking login`, async ({ page }) => {
    await mockApi(page);
    await seedRememberedUsername(page, value);
    await expect(page.getByLabel("Username", { exact: true })).toHaveValue("");
    await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).not.toBeChecked();
    await page.getByLabel("Username", { exact: true }).fill(registration.username);
    await page.getByLabel("Password", { exact: true }).fill(registration.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
  });
}

for (const operation of ["getItem", "setItem", "removeItem"] as const) {
  test(`remembered-username ${operation} errors do not block authentication`, async ({ page }) => {
    const api = await mockApi(page);
    await page.addInitScript(({ key, operation, username }) => {
      if (operation === "removeItem") localStorage.setItem(key, username);
      const original = Storage.prototype[operation];
      Object.defineProperty(Storage.prototype, operation, {
        value: function (this: Storage, storageKey: string, ...otherArgs: string[]) {
          if (storageKey === key) throw new DOMException("Storage blocked", "SecurityError");
          return Reflect.apply(original, this, [storageKey, ...otherArgs]);
        },
      });
    }, { key: rememberedUsernameKey, operation, username: registration.username });
    await page.goto("/login");
    const checkbox = page.getByRole("checkbox", { name: "Remember me", exact: true });
    await page.getByLabel("Username", { exact: true }).fill(registration.username);
    await page.getByLabel("Password", { exact: true }).fill(registration.password);
    if (operation === "removeItem") {
      await expect(checkbox).toBeChecked();
      await checkbox.uncheck();
    } else {
      await checkbox.check();
    }
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    expect(api.forPath("/auth/login")).toHaveLength(1);
    expect((api.forPath("/auth/login")[0].body as { remember_me: boolean }).remember_me).toBe(operation !== "removeItem");
  });
}

test("a remembered refresh cookie restores a missing access cookie before private content appears", async ({ page }) => {
  const refresh = deferredReply(authenticatedReply({
    path: "/auth/refresh", method: "POST", body: { remember_me: true },
  }, true));
  const api = await mockApi(page, {
    "/auth/me": async () => {
      const authenticated = (await page.context().cookies()).some((cookie) => cookie.name === "auth_token");
      return authenticated ? { data: currentUser } : { status: 401, message: "Unauthenticated." };
    },
    "/auth/refresh": refresh.handler,
  });
  const refreshExpires = Math.floor(Date.now() / 1000) + 2_592_000;
  await page.context().addCookies([{
    name: "refresh_token",
    value: "remembered-refresh-session",
    domain: "127.0.0.1",
    path: "/api-test/v1/auth",
    httpOnly: true,
    sameSite: "Strict",
    expires: refreshExpires,
  }]);
  const refreshRequest = page.waitForRequest("**/auth/refresh");
  await page.goto("/home");
  await expect.poll(() => api.forPath("/auth/refresh").length).toBe(1);
  await expect(page.locator("#app-shell [data-slot='skeleton']").first()).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true })).toHaveCount(0);
  expect(api.forPath("/home")).toHaveLength(0);
  const request = await refreshRequest;
  expect((await request.allHeaders()).cookie).toContain("refresh_token=remembered-refresh-session");
  expect((await request.allHeaders()).cookie).not.toContain("auth_token=");
  expect(request.postData()).toBeNull();

  refresh.release();
  await expect(page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
  expect(api.forPath("/auth/me")).toHaveLength(2);
  expect(api.forPath("/auth/refresh")).toEqual([{ path: "/auth/refresh", method: "POST", body: null }]);
  expect(api.forPath("/auth/login")).toHaveLength(0);
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === "auth_token")?.expires).toBeGreaterThan(Date.now() / 1000);
  expect(cookies.find((cookie) => cookie.name === "refresh_token")?.expires).toBe(refreshExpires);
});

for (const withInvalidRefresh of [false, true]) {
  test(`${withInvalidRefresh ? "an invalid refresh cookie" : "an unauthenticated visit"} redirects protected pages to login without private content`, async ({ page }) => {
    const refresh = deferredReply({ status: 401, message: "Unauthenticated." });
    const api = await mockApi(page, {
      "/auth/me": () => ({ status: 401, message: "Unauthenticated." }),
      "/auth/refresh": refresh.handler,
    });
    if (withInvalidRefresh) {
      await page.context().addCookies([{
        name: "refresh_token", value: "invalid-refresh-session", domain: "127.0.0.1",
        path: "/api-test/v1/auth", httpOnly: true, sameSite: "Strict",
      }]);
    }
    await page.goto("/home");
    await expect.poll(() => api.forPath("/auth/refresh").length).toBe(1);
    await expect(page.locator("#app-shell [data-slot='skeleton']").first()).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(0);
    expect(api.forPath("/home")).toHaveLength(0);
    refresh.release();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true })).toHaveCount(0);
    expect(api.forPath("/home")).toHaveLength(0);
    expect(api.forPath("/auth/refresh")).toHaveLength(1);
  });
}

test("opening the login page does not automatically restore a remembered session", async ({ page }) => {
  const api = await mockApi(page);
  await page.context().addCookies([{
    name: "refresh_token", value: "remembered-refresh-session", domain: "127.0.0.1",
    path: "/api-test/v1/auth", httpOnly: true, sameSite: "Strict", expires: Date.now() / 1000 + 2_592_000,
  }]);
  await page.goto("/login");
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).not.toBeChecked();
  expect(api.forPath("/auth/me")).toHaveLength(0);
  expect(api.forPath("/auth/refresh")).toHaveLength(0);
  await expect(page).toHaveURL(/\/login$/);
});

test("signup sends the backend contract and verifies a leading-zero code before signing in", async ({ page }, testInfo) => {
  const api = await mockApi(page);
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/login");
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).not.toBeChecked();
  await page.screenshot({ path: testInfo.outputPath("login-desktop-light.png"), caret: "initial" });
  await page.getByRole("link", { name: "Create an account", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await fillRegistration(page);
  await page.screenshot({ path: testInfo.outputPath("register-desktop-light.png"), caret: "initial" });
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeVisible();
  await expect(page.getByText(/60 minutes/)).toBeVisible();
  expect(api.forPath("/auth/register")).toEqual([{ path: "/auth/register", method: "POST", body: registration }]);
  expect((await page.context().cookies()).some((cookie) => cookie.name === "auth_token")).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("verify-email-desktop-light.png"), caret: "initial" });

  await page.getByLabel("Verification code", { exact: true }).fill("012345");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(api.forPath("/auth/verify-email")[0].body).toEqual({ email: registration.email, otp: "012345" });
  expect((await page.context().cookies()).find((cookie) => cookie.name === "auth_token")?.httpOnly).toBe(true);
  expect((await page.context().cookies()).find((cookie) => cookie.name === "auth_token")?.expires).toBeGreaterThan(Date.now() / 1000);
  expect(await page.evaluate(() => document.cookie)).not.toContain("auth_token");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true })).toBeVisible();
});

test("duplicate signup fields show inline server errors and preserve entered values", async ({ page }) => {
  const api = await mockApi(page, {
    "/auth/register": () => ({
      status: 422,
      message: "Please review the highlighted fields.",
      errors: { email: ["The email has already been taken."], username: ["The username has already been taken."] },
    }),
  });
  await page.goto("/register");
  await fillRegistration(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("The email has already been taken.", { exact: true })).toBeVisible();
  await expect(page.getByText("The username has already been taken.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(registration.email);
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(registration.username);
  await expect(page).toHaveURL(/\/register$/);
  expect(api.forPath("/auth/register")).toHaveLength(1);
});

test("signup validates eight characters and the bcrypt UTF-8 byte limit before submitting", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto("/register");
  await fillRegistration(page, "1234567");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(api.forPath("/auth/register")).toHaveLength(0);
  await page.getByLabel("Password", { exact: true }).fill("é".repeat(37));
  await page.getByLabel("Confirm password", { exact: true }).fill("é".repeat(37));
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText(/72 bytes/)).toBeVisible();
  expect(api.forPath("/auth/register")).toHaveLength(0);
  await page.getByLabel("Password", { exact: true }).fill("é".repeat(36));
  await page.getByLabel("Confirm password", { exact: true }).fill("é".repeat(36));
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeVisible();
  expect(api.forPath("/auth/register")[0].body).toEqual({
    ...registration,
    password: "é".repeat(36),
    password_confirmation: "é".repeat(36),
  });
});

test("signup requires matching confirmation and maps backend confirmation errors to the field", async ({ page }) => {
  const message = "The password confirmation does not match.";
  const api = await mockApi(page, {
    "/auth/register": () => ({ status: 422, errors: { password_confirmation: [message] } }),
  });
  await page.goto("/register");
  await fillRegistration(page);
  const confirmation = page.getByLabel("Confirm password", { exact: true });
  await confirmation.fill("a different password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  expect(api.forPath("/auth/register")).toHaveLength(0);

  await confirmation.fill(registration.password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  await expect(confirmation).toHaveValue(registration.password);
  expect(api.forPath("/auth/register")).toHaveLength(1);
});

test("verification can resume by email and invalid codes respect the resend cooldown", async ({ page }) => {
  await page.clock.install();
  const api = await mockApi(page, {
    "/auth/verify-email": () => ({ status: 422, errors: { otp: ["The verification code is invalid or has expired."] } }),
  });
  await page.goto("/verify-email");
  await page.getByLabel("Email", { exact: true }).fill(registration.email);
  await page.getByRole("button", { name: "Send verification code", exact: true }).click();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeVisible();
  expect(api.forPath("/auth/resend-verification")[0].body).toEqual({ email: registration.email });
  const resend = page.getByRole("button", { name: /Resend code/ });
  await expect(resend).toBeDisabled();
  await page.getByLabel("Verification code", { exact: true }).fill("12345");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByLabel("Verification code", { exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(api.forPath("/auth/verify-email")).toHaveLength(0);
  await page.getByLabel("Verification code", { exact: true }).fill("000001");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByText("The verification code is invalid or has expired.", { exact: true })).toBeVisible();
  expect(api.forPath("/auth/verify-email")[0].body).toEqual({ email: registration.email, otp: "000001" });
  await page.clock.runFor(61_000);
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect.poll(() => api.forPath("/auth/resend-verification").length).toBe(2);
  await expect(resend).toBeDisabled();
  await expect(page.getByLabel("Verification code", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Verification code", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
});

test("standalone email verification omits remember_me and preserves persistent authentication", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto("/verify-email");
  await page.getByLabel("Email", { exact: true }).fill(registration.email);
  await page.getByRole("button", { name: "Send verification code", exact: true }).click();
  await page.getByLabel("Verification code", { exact: true }).fill("012345");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(api.forPath("/auth/verify-email")).toEqual([{
    path: "/auth/verify-email", method: "POST", body: { email: registration.email, otp: "012345" },
  }]);
  const cookie = (await page.context().cookies()).find((item) => item.name === "auth_token");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);
});

test("password recovery uses the verified grant and succeeds without automatically signing in", async ({ page }) => {
  const api = await mockApi(page);
  await requestRecovery(page);
  await verifyRecovery(page);
  await page.getByLabel("New password", { exact: true }).fill("new secure password");
  await page.getByLabel("Confirm password", { exact: true }).fill("new secure password");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Password updated", exact: true })).toBeVisible();
  expect(api.forPath("/auth/forgot-password")[0].body).toEqual({ email: registration.email });
  expect(api.forPath("/auth/verify-password-reset")[0].body).toEqual({ email: registration.email, otp: "012345" });
  expect(api.forPath("/auth/reset-password")[0].body).toEqual({
    email: registration.email,
    reset_token: "one-time-reset-grant",
    password: "new secure password",
    password_confirmation: "new secure password",
  });
  expect(api.forPath("/auth/login")).toHaveLength(0);
  expect((await page.context().cookies()).some((cookie) => cookie.name === "auth_token")).toBe(false);
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain("one-time-reset-grant");
  await page.getByRole("link", { name: "Back to login", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

for (const expiry of ["server", "client"] as const) {
  test(`a ${expiry}-expired reset grant returns to email entry without losing the email`, async ({ page }) => {
    if (expiry === "client") await page.clock.install();
    const api = await mockApi(page, {
      "/auth/verify-password-reset": () => ({ data: { reset_token: "expiring-grant", expires_in: expiry === "client" ? 1 : 900 } }),
      "/auth/reset-password": () => ({ status: 422, errors: { reset_token: ["The password reset token is invalid or has expired."] } }),
    });
    await requestRecovery(page);
    await verifyRecovery(page);
    if (expiry === "client") {
      await page.clock.runFor(2_000);
    } else {
      await page.getByLabel("New password", { exact: true }).fill("new secure password");
      await page.getByLabel("Confirm password", { exact: true }).fill("new secure password");
      await page.getByRole("button", { name: "Reset password", exact: true }).click();
    }
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(registration.email);
    await expect(page.getByRole("alert").filter({ hasText: "Your password reset session has expired. Request a new code to continue." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset code", exact: true })).toBeVisible();
    expect(api.forPath("/auth/reset-password")).toHaveLength(expiry === "client" ? 0 : 1);
  });
}

test("new passwords require matching confirmation and enforce UTF-8 byte limits", async ({ page }) => {
  const api = await mockApi(page);
  await requestRecovery(page);
  await verifyRecovery(page);
  await page.getByLabel("New password", { exact: true }).fill("new secure password");
  await page.getByLabel("Confirm password", { exact: true }).fill("different password");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByLabel("Confirm password", { exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(api.forPath("/auth/reset-password")).toHaveLength(0);
  await page.getByLabel("New password", { exact: true }).fill("é".repeat(37));
  await page.getByLabel("Confirm password", { exact: true }).fill("é".repeat(37));
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByText(/72 bytes/)).toBeVisible();
  expect(api.forPath("/auth/reset-password")).toHaveLength(0);
  await page.getByLabel("New password", { exact: true }).fill("é".repeat(36));
  await page.getByLabel("Confirm password", { exact: true }).fill("é".repeat(36));
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Password updated", exact: true })).toBeVisible();
  expect(api.forPath("/auth/reset-password")).toHaveLength(1);
});

test("pending signup disables submission and sends only one registration request", async ({ page }) => {
  const pending = deferredReply({ status: 201, data: emailVerification });
  const api = await mockApi(page, { "/auth/register": pending.handler });
  await page.goto("/register");
  await fillRegistration(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect.poll(() => api.forPath("/auth/register").length).toBe(1);
  await expect(page.getByRole("button", { name: /Creating|Create account/ })).toBeDisabled();
  await page.getByLabel("Password", { exact: true }).press("Enter");
  expect(api.forPath("/auth/register")).toHaveLength(1);
  pending.release();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeVisible();
});

test("pending recovery requests cannot be submitted twice at any step", async ({ page }) => {
  const send = deferredReply({ status: 202 });
  const verify = deferredReply({ data: { reset_token: "pending-grant", expires_in: 900 } });
  const reset = deferredReply({});
  const api = await mockApi(page, {
    "/auth/forgot-password": send.handler,
    "/auth/verify-password-reset": verify.handler,
    "/auth/reset-password": reset.handler,
  });
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(registration.email);
  await page.getByRole("button", { name: "Send reset code", exact: true }).click();
  await expect.poll(() => api.forPath("/auth/forgot-password").length).toBe(1);
  await expect(page.getByRole("button", { name: /Sending|Send reset code/ })).toBeDisabled();
  await page.getByLabel("Email", { exact: true }).press("Enter");
  send.release();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeVisible();
  await page.getByLabel("Verification code", { exact: true }).fill("012345");
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect.poll(() => api.forPath("/auth/verify-password-reset").length).toBe(1);
  await expect(page.getByRole("button", { name: /Verifying|Verify code/ })).toBeDisabled();
  await page.getByLabel("Verification code", { exact: true }).press("Enter");
  verify.release();
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("new secure password");
  await page.getByLabel("Confirm password", { exact: true }).fill("new secure password");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect.poll(() => api.forPath("/auth/reset-password").length).toBe(1);
  await expect(page.getByRole("button", { name: /Resetting|Reset password/ })).toBeDisabled();
  await page.getByLabel("Confirm password", { exact: true }).press("Enter");
  reset.release();
  await expect(page.getByRole("heading", { name: "Password updated", exact: true })).toBeVisible();
  expect(api.forPath("/auth/forgot-password")).toHaveLength(1);
  expect(api.forPath("/auth/verify-password-reset")).toHaveLength(1);
  expect(api.forPath("/auth/reset-password")).toHaveLength(1);
});

for (const rememberMe of [false, true]) {
  test(`correct credentials for an unverified account preserve remember_me=${rememberMe} through OTP verification`, async ({ page }, testInfo) => {
    const api = await mockApi(page, {
      "/auth/login": () => verificationRequired,
    });
    await page.goto("/login");
    await page.getByLabel("Username", { exact: true }).fill(registration.username);
    await page.getByLabel("Password", { exact: true }).fill(registration.password);
    const checkbox = page.getByRole("checkbox", { name: "Remember me", exact: true });
    await expect(checkbox).not.toBeChecked();
    if (rememberMe) {
      await checkbox.focus();
      await checkbox.press("Space");
      await expect(checkbox).toBeChecked();
      expect(api.forPath("/auth/login")).toHaveLength(0);
    }
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Verify your email", exact: true })).toBeVisible();
    await expect(page.getByLabel("Verification code", { exact: true })).toBeFocused();
    await expect(page.getByText(registration.email, { exact: false })).toBeVisible();
    await expect(page.getByText(/60 minutes/)).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/);
    expect(api.forPath("/auth/login")[0].body).toEqual({
      username: registration.username, password: registration.password, remember_me: rememberMe,
    });
    expect(api.forPath("/auth/resend-verification")).toHaveLength(0);
    expect(api.forPath("/auth/refresh")).toHaveLength(0);
    expect((await page.context().cookies()).some((cookie) => cookie.name === "auth_token")).toBe(false);
    expect(await storedUsername(page)).toBeNull();
    await page.screenshot({ path: testInfo.outputPath("login-otp-desktop.png"), caret: "initial" });

    await page.getByLabel("Verification code", { exact: true }).fill("012345");
    await page.getByRole("button", { name: "Verify email", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    expect(api.forPath("/auth/verify-email")[0].body).toEqual({
      email: registration.email, otp: "012345", remember_me: rememberMe,
    });
    const cookie = (await page.context().cookies()).find((item) => item.name === "auth_token");
    expect(cookie?.httpOnly).toBe(true);
    if (rememberMe) {
      expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);
    } else {
      expect(cookie?.expires).toBe(-1);
    }
    expect(api.forPath("/auth/login")).toHaveLength(1);
    expect(await storedUsername(page)).toBe(rememberMe ? registration.username : null);
  });
}

test("an expired unverified login allows resending and returns safely to sign in", async ({ page }) => {
  await page.clock.install();
  const api = await mockApi(page, {
    "/auth/login": () => ({
      ...verificationRequired,
      data: { ...emailVerification, otp_expires_in: 0, resend_after: 0 },
    }),
  });
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  await page.getByRole("checkbox", { name: "Remember me", exact: true }).check();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /expired/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify email", exact: true })).toBeDisabled();
  const resend = page.getByRole("button", { name: /Resend code/ });
  await expect(resend).toBeEnabled();
  expect(api.forPath("/auth/resend-verification")).toHaveLength(0);

  await resend.click();
  await expect(resend).toBeDisabled();
  await expect(page.getByRole("alert").filter({ hasText: /expired/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Verify email", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeFocused();
  await expect(page.getByText(/60 minutes/)).toBeVisible();
  expect(api.forPath("/auth/resend-verification")).toEqual([{
    path: "/auth/resend-verification", method: "POST", body: { email: registration.email },
  }]);
  await page.clock.runFor(61_000);
  await expect(resend).toBeEnabled();

  await page.getByRole("button", { name: "Back to sign in", exact: true }).click();
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(registration.username);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).toBeChecked();
  await expect(page.getByLabel("Verification code", { exact: true })).toHaveCount(0);
  expect(api.forPath("/auth/refresh")).toHaveLength(0);
});

test("email verification expires at 60 minutes and a resend starts a fresh validity period", async ({ page }) => {
  await page.clock.install();
  const api = await mockApi(page, { "/auth/login": () => verificationRequired });
  await page.goto("/login");
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const verify = page.getByRole("button", { name: "Verify email", exact: true });
  await expect(verify).toBeEnabled();

  await page.clock.fastForward(3_599_000);
  await expect(verify).toBeEnabled();
  await expect(page.getByRole("alert").filter({ hasText: /expired/i })).toHaveCount(0);
  await page.clock.fastForward(1000);
  await expect(page.getByRole("alert").filter({ hasText: /expired/i })).toBeVisible();
  await expect(verify).toBeDisabled();
  await page.getByRole("button", { name: "Resend code", exact: true }).click();
  await expect(verify).toBeEnabled();
  await expect(page.getByRole("alert").filter({ hasText: /expired/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Resend code/ })).toBeDisabled();
  await page.clock.resume();
  await page.getByLabel("Verification code", { exact: true }).fill("012345");
  await verify.click();
  await expect(page).toHaveURL(/\/home$/);
  expect(api.forPath("/auth/resend-verification")).toHaveLength(1);
  expect(api.forPath("/auth/verify-email")).toHaveLength(1);
});

test("incorrect login credentials do not reveal an email or open verification", async ({ page }) => {
  const message = "These credentials do not match our records.";
  const api = await mockApi(page, {
    "/auth/login": () => ({ status: 422, message, errors: { username: [message] } }),
  });
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill("incorrect password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(registration.username);
  await expect(page.getByLabel("Verification code", { exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(registration.email);
  await expect(page).toHaveURL(/\/login$/);
  expect(api.forPath("/auth/resend-verification")).toHaveLength(0);
  expect(api.forPath("/auth/refresh")).toHaveLength(0);
});

test("pending unverified login and email verification cannot submit duplicate requests", async ({ page }) => {
  const login = deferredReply(verificationRequired);
  const verify = deferredReply(authenticatedReply({
    path: "/auth/verify-email", method: "POST", body: { remember_me: true },
  }, true));
  const api = await mockApi(page, {
    "/auth/login": login.handler,
    "/auth/verify-email": verify.handler,
  });
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  const checkbox = page.getByRole("checkbox", { name: "Remember me", exact: true });
  await checkbox.check();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => api.forPath("/auth/login").length).toBe(1);
  await expect(page.getByRole("button", { name: /Signing|Sign in/ })).toBeDisabled();
  await expect(checkbox).toBeDisabled();
  await expect(checkbox).toBeChecked();
  await page.getByLabel("Password", { exact: true }).press("Enter");
  expect(api.forPath("/auth/login")).toHaveLength(1);
  login.release();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeVisible();
  await page.getByLabel("Verification code", { exact: true }).fill("012345");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect.poll(() => api.forPath("/auth/verify-email").length).toBe(1);
  await expect(page.getByRole("button", { name: /Verifying|Verify email/ })).toBeDisabled();
  await page.getByLabel("Verification code", { exact: true }).press("Enter");
  expect(api.forPath("/auth/verify-email")).toHaveLength(1);
  verify.release();
  await expect(page).toHaveURL(/\/home$/);
  expect(api.forPath("/auth/login")[0].body).toEqual({
    username: registration.username, password: registration.password, remember_me: true,
  });
  expect(api.forPath("/auth/verify-email")[0].body).toEqual({
    email: registration.email, otp: "012345", remember_me: true,
  });
  expect(api.forPath("/auth/resend-verification")).toHaveLength(0);
});

for (const path of ["register", "login", "forgot-password"] as const) {
  test(`a public ${path} 401 stays in its form without refreshing or redirecting`, async ({ page }) => {
    const message = "The authentication request could not be completed.";
    const api = await mockApi(page, { [`/auth/${path}`]: () => ({ status: 401, message }) });
    await page.goto(`/${path}`);
    if (path === "register") {
      await fillRegistration(page);
      await page.getByRole("button", { name: "Create account", exact: true }).click();
    } else if (path === "login") {
      await page.getByLabel("Username", { exact: true }).fill(registration.username);
      await page.getByLabel("Password", { exact: true }).fill(registration.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
    } else {
      await page.getByLabel("Email", { exact: true }).fill(registration.email);
      await page.getByRole("button", { name: "Send reset code", exact: true }).click();
    }
    await expect(page.getByRole("alert").filter({ hasText: message })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/${path}`);
    expect(api.forPath(`/auth/${path}`)).toHaveLength(1);
    expect(api.forPath("/auth/refresh")).toHaveLength(0);
  });
}

test("mobile dark auth pages support navigation and keyboard verification without horizontal overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  const api = await mockApi(page, { "/auth/login": () => verificationRequired });
  await page.goto("/login");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("login-mobile-dark.png"), fullPage: true, caret: "initial" });
  await page.getByRole("link", { name: "Create an account", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await fillRegistration(page);
  await page.screenshot({ path: testInfo.outputPath("register-mobile-dark.png"), fullPage: true, caret: "initial" });
  await page.getByLabel("Password", { exact: true }).press("Enter");
  await expect(page.getByLabel("Verification code", { exact: true })).toBeVisible();
  await page.getByLabel("Verification code", { exact: true }).fill("012345");
  await page.getByLabel("Verification code", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Verify email", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("verify-email-mobile-dark.png"), fullPage: true, caret: "initial" });
  expect(api.forPath("/auth/register")).toHaveLength(1);

  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  await page.getByLabel("Password", { exact: true }).press("Enter");
  await expect(page.getByRole("heading", { name: "Verify your email", exact: true })).toBeVisible();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("login-otp-mobile-dark.png"), fullPage: true, caret: "initial" });
  await page.getByRole("button", { name: "Back to sign in", exact: true }).click();
  await page.getByRole("link", { name: "Forgot password?", exact: true }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByLabel("Email", { exact: true }).fill(registration.email);
  await page.getByLabel("Email", { exact: true }).press("Enter");
  await verifyRecovery(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("reset-password-mobile-dark.png"), fullPage: true, caret: "initial" });
});
