import { expect, test, type Page } from "@playwright/test";

type ApiReply = {
  data?: unknown;
  code?: string;
  status?: number;
  message?: string;
  errors?: Record<string, string[]>;
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
    } else if (path === "/auth/verify-email") {
      await page.context().addCookies([{
        name: "auth_token",
        value: "verified-test-session",
        url: "http://127.0.0.1:3107",
        httpOnly: true,
        sameSite: "Strict",
      }]);
      reply = { data: currentUser };
    } else if (path === "/auth/me") {
      reply = { data: currentUser };
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

test("signup sends the backend contract and verifies a leading-zero code before signing in", async ({ page }, testInfo) => {
  const api = await mockApi(page);
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/login");
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
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

test("correct credentials for an unverified account open OTP directly and sign in after verification", async ({ page }, testInfo) => {
  const api = await mockApi(page, {
    "/auth/login": () => verificationRequired,
  });
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verify your email", exact: true })).toBeVisible();
  await expect(page.getByLabel("Verification code", { exact: true })).toBeFocused();
  await expect(page.getByText(registration.email, { exact: false })).toBeVisible();
  await expect(page.getByText(/60 minutes/)).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/login$/);
  expect(api.forPath("/auth/resend-verification")).toHaveLength(0);
  expect(api.forPath("/auth/refresh")).toHaveLength(0);
  expect((await page.context().cookies()).some((cookie) => cookie.name === "auth_token")).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("login-otp-desktop.png"), caret: "initial" });

  await page.getByLabel("Verification code", { exact: true }).fill("012345");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(api.forPath("/auth/verify-email")[0].body).toEqual({ email: registration.email, otp: "012345" });
  expect((await page.context().cookies()).find((cookie) => cookie.name === "auth_token")?.httpOnly).toBe(true);
  expect(api.forPath("/auth/login")).toHaveLength(1);
});

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
  const verify = deferredReply({ data: currentUser });
  const api = await mockApi(page, {
    "/auth/login": login.handler,
    "/auth/verify-email": verify.handler,
  });
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(registration.username);
  await page.getByLabel("Password", { exact: true }).fill(registration.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => api.forPath("/auth/login").length).toBe(1);
  await expect(page.getByRole("button", { name: /Signing|Sign in/ })).toBeDisabled();
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
  await page.context().addCookies([{
    name: "auth_token", value: "verified-test-session", url: "http://127.0.0.1:3107", httpOnly: true, sameSite: "Strict",
  }]);
  verify.release();
  await expect(page).toHaveURL(/\/home$/);
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
