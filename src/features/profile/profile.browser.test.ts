import { expect, test, type Page } from "@playwright/test";

const appUrl = "http://127.0.0.1:3107";
const rememberedUsernameKey = "medasin.auth.remembered-username.v1";
const existingPhoto = "/storage/profiles/ada/existing.png";
const uploadedPhoto = "/storage/profiles/ada/uploaded.png";
const otherPhoto = "/storage/profiles/grace/photo.png";
const photoBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAA/UlEQVR4nO3RMQ0AMAzAsPIn3d5DsBw2gkiZJWV+B/AyJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQmAP4K6zWNUjE4wAAAABJRU5ErkJggg==",
  "base64",
);

type ProfileUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  font_family: string;
  profile_image_url: string | null;
};

type ApiRequest = {
  path: string;
  method: string;
  body: unknown;
  rawBody: Buffer | null;
  contentType: string;
};

type ApiReply = {
  status?: number;
  data?: unknown;
  message?: string;
  errors?: Record<string, string[]>;
  headers?: Record<string, string>;
};

type ApiHandler = (request: ApiRequest) => ApiReply | Promise<ApiReply>;

function profileStore(image: string | null = null) {
  return {
    activeUserId: 7,
    authenticated: true,
    users: [
      { id: 7, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", username: "ada", font_family: "manrope", profile_image_url: image },
      { id: 42, first_name: "Grace", last_name: "Hopper", email: "grace@example.com", username: "other", font_family: "inter", profile_image_url: otherPhoto },
    ] as ProfileUser[],
    requests: [] as ApiRequest[],
  };
}

function sessionCookie(value: string, rememberMe = false) {
  return `auth_token=${value}; Path=/; HttpOnly; SameSite=Strict${rememberMe ? "; Max-Age=604800" : ""}`;
}

async function mockProfile(page: Page, store = profileStore(), handlers: Record<string, ApiHandler> = {}, rememberMe = false) {
  await page.context().addCookies([{
    name: "auth_token", value: "profile-session", url: appUrl, httpOnly: true,
    ...(rememberMe ? { expires: Math.floor(Date.now() / 1000) + 604800 } : {}),
  }]);
  await page.route("**/storage/profiles/**", async (route) => {
    if (route.request().url().endsWith("broken.png")) {
      await route.fulfill({ status: 404 });
    } else {
      await route.fulfill({ contentType: "image/png", body: photoBytes });
    }
  });
  await page.route("**/api-test/v1/**", async (route) => {
    const original = route.request();
    const path = new URL(original.url()).pathname.replace("/api-test/v1", "");
    const contentType = original.headers()["content-type"] ?? "";
    const request: ApiRequest = {
      path, method: original.method(), contentType,
      body: contentType.includes("application/json") ? original.postDataJSON() : null,
      rawBody: original.postDataBuffer(),
    };
    store.requests.push(request);
    const user = store.users.find((item) => item.id === store.activeUserId)!;
    const key = `${request.method} ${path}`;
    let reply: ApiReply = {};
    if (handlers[key]) {
      reply = await handlers[key](request);
    } else if (path === "/auth/me") {
      reply = store.authenticated ? { data: user } : { status: 401, message: "Unauthenticated." };
    } else if (path === "/auth/refresh") {
      reply = { status: 401, message: "Unauthenticated." };
    } else if (path === "/auth/logout") {
      store.authenticated = false;
      reply = { headers: { "set-cookie": `${sessionCookie("")}; Max-Age=0` } };
    } else if (path === "/auth/login") {
      const values = request.body as { username: string; remember_me: boolean };
      store.activeUserId = store.users.find((item) => item.username === values.username)!.id;
      store.authenticated = true;
      reply = { data: store.users.find((item) => item.id === store.activeUserId), headers: { "set-cookie": sessionCookie("new-account-session", values.remember_me) } };
    } else if (key === "POST /profile/image") {
      user.profile_image_url = uploadedPhoto;
      reply = { data: user, message: "Your profile photo has been updated." };
    } else if (key === "DELETE /profile/image") {
      user.profile_image_url = null;
      reply = { data: user, message: "Your profile photo has been removed." };
    } else if (key === "PATCH /profile/password") {
      reply = { message: "Your password has been updated.", headers: { "set-cookie": sessionCookie("changed-password-session", rememberMe) } };
    } else if (key === "DELETE /profile") {
      store.authenticated = false;
      reply = { message: "Your account has been permanently deleted.", headers: { "set-cookie": `${sessionCookie("")}; Max-Age=0` } };
    } else if (path === "/notifications") {
      reply = { data: { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 } };
    } else if (path === "/home") {
      reply = { data: {
        stats: { active_projects: 0, areas: 0, resources_saved: 0, habit_streak: 0 },
        projects: [], areas: [], recent_resources: [], archives: { projects: 0, areas: 0, resources: 0 },
      } };
    }
    const status = reply.status ?? 200;
    await route.fulfill({ status, headers: reply.headers, json: {
      data: reply.data ?? null, status, message: reply.message ?? "OK",
      ...(reply.errors ? { errors: reply.errors } : {}),
    } });
  });
  return {
    store,
    forPath: (path: string, method?: string) => store.requests.filter((request) => request.path === path && (!method || request.method === method)),
  };
}

function deferredReply(reply: ApiReply) {
  let release = () => {};
  const response = new Promise<ApiReply>((resolve) => { release = () => resolve(reply); });
  return { handler: () => response, release: () => release() };
}

async function photoFile(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 240;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#204060";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#80c0ff";
    context.fillRect(100, 60, 200, 120);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return { name: "portrait.png", mimeType: "image/png", buffer: Buffer.from(data, "base64") };
}

async function choosePhoto(page: Page) {
  await page.getByLabel("Profile photo", { exact: true }).setInputFiles(await photoFile(page));
  const crop = page.getByRole("dialog", { name: "Crop profile photo", exact: true });
  await expect(crop).toBeVisible();
  await expect(crop.getByRole("button", { name: "Apply crop", exact: true })).toBeEnabled();
  return crop;
}

async function uploadedPixels(page: Page, upload: ApiRequest) {
  const pngStart = upload.rawBody!.indexOf(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const pngEnd = upload.rawBody!.indexOf(Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]), pngStart) + 12;
  expect(pngStart).toBeGreaterThan(0);
  expect(pngEnd).toBeGreaterThan(pngStart);
  const encoded = upload.rawBody!.subarray(pngStart, pngEnd).toString("base64");
  return page.evaluate(async (source) => {
    const image = new Image();
    image.src = `data:image/png;base64,${source}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const center = context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
    return {
      width: canvas.width,
      height: canvas.height,
      allOpaque: pixels.every((value, index) => index % 4 !== 3 || value === 255),
      center: Array.from(center),
    };
  }, encoded);
}

async function fillPassword(page: Page, currentPassword = "current password", nextPassword = "new secure password") {
  await page.getByLabel("Current password", { exact: true }).fill(currentPassword);
  await page.getByLabel("New password", { exact: true }).fill(nextPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(nextPassword);
}

async function openDeletion(page: Page) {
  await page.getByRole("button", { name: "Delete account", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Permanently delete account", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("the account menu opens Profile and falls back to initials for a missing or broken photo", async ({ page }, testInfo) => {
  const api = await mockProfile(page);
  await page.goto("/home");
  const menu = page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true });
  await expect(menu.getByText("AL", { exact: true })).toBeVisible();
  await menu.click();
  await page.getByRole("menuitem", { name: "Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  await expect(page.getByText("ada@example.com", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete account", exact: true })).toBeVisible();
  for (const label of ["Current password", "New password", "Confirm new password"]) {
    const availableWidth = await page.getByLabel(label, { exact: true }).evaluate((input) => {
      const content = input.closest('[data-slot="card-content"]')!;
      const style = getComputedStyle(content);
      return content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    });
    const inputBounds = await page.getByLabel(label, { exact: true }).boundingBox();
    expect(Math.abs(inputBounds!.width - availableWidth)).toBeLessThanOrEqual(2);
  }
  await page.screenshot({ path: testInfo.outputPath("profile-desktop-light.png") });

  api.store.users[0].profile_image_url = "/storage/profiles/ada/broken.png";
  await page.reload();
  await expect(menu.getByText("AL", { exact: true })).toBeVisible();
});

test("a square crop uploads as multipart and updates the profile and header across reload", async ({ page }) => {
  const api = await mockProfile(page);
  await page.goto("/profile");
  const crop = await choosePhoto(page);
  await crop.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect(crop).toBeHidden();
  await expect.poll(() => api.forPath("/profile/image", "POST").length).toBe(1);
  const upload = api.forPath("/profile/image", "POST")[0];
  expect(upload.contentType).toContain("multipart/form-data; boundary=");
  expect(upload.rawBody?.toString("latin1")).toContain('name="image"');
  const pngStart = upload.rawBody!.indexOf(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(pngStart).toBeGreaterThan(0);
  expect(upload.rawBody!.readUInt32BE(pngStart + 16)).toBe(upload.rawBody!.readUInt32BE(pngStart + 20));
  const menu = page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true });
  await expect(menu.locator("img")).toHaveAttribute("src", uploadedPhoto);
  await expect(page.getByRole("button", { name: "Remove photo", exact: true })).toBeVisible();
  await page.reload();
  await expect(menu.locator("img")).toHaveAttribute("src", uploadedPhoto);
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await expect(menu.getByText("AL", { exact: true })).toBeVisible();
  expect(api.forPath("/profile/image", "DELETE")).toHaveLength(1);
  await page.reload();
  await expect(menu.getByText("AL", { exact: true })).toBeVisible();
});

test("unsupported, oversized, and undecodable photos are rejected without a request", async ({ page }) => {
  const api = await mockProfile(page, profileStore(existingPhoto));
  await page.goto("/profile");
  const input = page.getByLabel("Profile photo", { exact: true });
  await input.setInputFiles({ name: "vector.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
  await expect(page.locator("#profile-photo-error")).toContainText(/JPEG|JPG|PNG|WebP/);
  await input.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(page.locator("#profile-photo-error")).toContainText(/5 (MB|MiB)/);
  await input.setInputFiles({ name: "invalid.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
  await expect(page.locator("#profile-photo-error")).toContainText(/could not|couldn't|invalid|unable/i);
  expect(api.forPath("/profile/image", "POST")).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true }).locator("img")).toHaveAttribute("src", existingPhoto);
});

test("a rejected photo replacement retains the previous image and permits retry", async ({ page }) => {
  let reject = true;
  const message = "The profile image could not be saved.";
  const store = profileStore(existingPhoto);
  const api = await mockProfile(page, store, { "POST /profile/image": () => {
    if (reject) return { status: 422, errors: { image: [message] }, message };
    store.users[0].profile_image_url = uploadedPhoto;
    return { data: store.users[0], message: "Your profile photo has been updated." };
  } });
  await page.goto("/profile");
  const crop = await choosePhoto(page);
  await crop.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect(crop.getByText(message, { exact: true })).toBeVisible();
  const menuImage = page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true, includeHidden: true }).locator("img");
  await expect(menuImage).toHaveAttribute("src", existingPhoto);
  reject = false;
  await crop.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect(crop).toBeHidden();
  await expect(menuImage).toHaveAttribute("src", uploadedPhoto);
  expect(api.forPath("/profile/image", "POST")).toHaveLength(2);
});

test("photo zoom and reposition export a square without blank edges and reset restores the centered crop", async ({ page }, testInfo) => {
  const api = await mockProfile(page);
  await page.goto("/profile");
  let crop = await choosePhoto(page);
  const zoom = crop.getByRole("slider", { name: "Zoom", exact: true });
  await expect(zoom).toHaveValue("1");
  await zoom.press("End");
  const magnification = Number(await zoom.inputValue());
  expect(magnification).toBeGreaterThan(1);
  const area = crop.getByLabel("Profile photo crop area", { exact: true });
  await area.focus();
  await area.press("ArrowRight");
  await crop.getByRole("button", { name: "Move photo down", exact: true }).click();
  const bounds = (await area.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(1430, 980, { steps: 5 });
  await page.mouse.up();
  await page.screenshot({ path: testInfo.outputPath("profile-photo-crop-desktop.png") });
  await crop.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect(crop).toBeHidden();
  let pixels = await uploadedPixels(page, api.forPath("/profile/image", "POST")[0]);
  expect(pixels.width).toBe(Math.round(240 / magnification));
  expect(pixels.height).toBe(pixels.width);
  expect(pixels.allOpaque).toBe(true);
  expect(pixels.center).toEqual([32, 64, 96, 255]);

  crop = await choosePhoto(page);
  await crop.getByRole("button", { name: "Zoom in", exact: true }).click();
  await crop.getByRole("button", { name: "Move photo left", exact: true }).click();
  await crop.getByRole("button", { name: "Reset crop", exact: true }).click();
  await expect(crop.getByRole("slider", { name: "Zoom", exact: true })).toHaveValue("1");
  await crop.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect(crop).toBeHidden();
  pixels = await uploadedPixels(page, api.forPath("/profile/image", "POST")[1]);
  expect(pixels.width).toBe(240);
  expect(pixels.height).toBe(240);
  expect(pixels.allOpaque).toBe(true);
  expect(pixels.center).toEqual([128, 192, 255, 255]);
});

test("photo upload blocks crop dismissal and duplicate submissions while the request is pending", async ({ page }) => {
  const store = profileStore();
  const pending = deferredReply({ data: { ...store.users[0], profile_image_url: uploadedPhoto }, message: "Your profile photo was updated." });
  const api = await mockProfile(page, store, { "POST /profile/image": async () => {
    const reply = await pending.handler();
    store.users[0].profile_image_url = uploadedPhoto;
    return reply;
  } });
  await page.goto("/profile");
  const crop = await choosePhoto(page);
  await crop.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect.poll(() => api.forPath("/profile/image", "POST").length).toBe(1);
  await expect(crop.getByRole("slider", { name: "Zoom", exact: true })).toBeDisabled();
  await expect(crop.getByRole("button", { name: "Reset crop", exact: true })).toBeDisabled();
  await expect(crop.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(crop).toBeVisible();
  pending.release();
  await expect(crop).toBeHidden();
  expect(api.forPath("/profile/image", "POST")).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Remove photo", exact: true })).toBeVisible();
});

test("photo crop controls work on mobile and remain reachable after rotating to a short viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockProfile(page);
  await page.goto("/profile");
  const crop = await choosePhoto(page);
  await crop.getByRole("button", { name: "Zoom in", exact: true }).click();
  await crop.getByRole("button", { name: "Move photo up", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("profile-photo-crop-mobile.png") });
  expect(await crop.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 568, height: 320 });
  const apply = crop.getByRole("button", { name: "Apply crop", exact: true });
  await apply.scrollIntoViewIfNeeded();
  await expect(apply).toBeInViewport();
  await expect(apply).toBeEnabled();
  expect(await crop.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await crop.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(crop).toBeHidden();
});

test("password confirmation and password length are checked before submission", async ({ page }) => {
  const api = await mockProfile(page);
  await page.goto("/profile");
  await fillPassword(page);
  await page.getByLabel("Confirm new password", { exact: true }).fill("does not match");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByText("Passwords do not match", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm new password", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await fillPassword(page, "current password", "short");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.locator("#profile-new-password-error")).toContainText(/at least 8 characters/);
  await fillPassword(page, "current password", "é".repeat(37));
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByText(/72 bytes/)).toBeVisible();
  expect(api.forPath("/profile/password")).toHaveLength(0);
});

test("an incorrect current password stays on Profile and shows a field error", async ({ page }) => {
  const message = "The current password is incorrect.";
  const api = await mockProfile(page, profileStore(), {
    "PATCH /profile/password": () => ({ status: 422, errors: { current_password: [message] } }),
  });
  await page.goto("/profile");
  await fillPassword(page, "wrong password");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByLabel("Current password", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/profile$/);
  expect(api.forPath("/auth/refresh")).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeEnabled();
});

for (const rememberMe of [false, true]) {
  test(`password changes retain this browser's ${rememberMe ? "remembered" : "session"} sign-in and clear password fields`, async ({ page }) => {
    const api = await mockProfile(page, profileStore(), {}, rememberMe);
    await page.goto("/profile");
    await expect(page.getByLabel("Current password", { exact: true })).toHaveAttribute("autocomplete", "current-password");
    await expect(page.getByLabel("New password", { exact: true })).toHaveAttribute("autocomplete", "new-password");
    await fillPassword(page);
    await page.getByRole("button", { name: "Update password", exact: true }).click();
    await expect(page.getByText("Your password has been updated.", { exact: true }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/profile$/);
    for (const label of ["Current password", "New password", "Confirm new password"]) {
      await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
    }
    expect(api.forPath("/profile/password")[0].body).toEqual({
      current_password: "current password", password: "new secure password", password_confirmation: "new secure password",
    });
    const cookie = (await page.context().cookies()).find((item) => item.name === "auth_token");
    expect(cookie?.value).toBe("changed-password-session");
    if (rememberMe) expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);
    else expect(cookie?.expires).toBe(-1);
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(storage).not.toContain("current password");
    expect(storage).not.toContain("new secure password");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  });
}

test("a pending password change prevents duplicate submissions and logout", async ({ page }) => {
  const pending = deferredReply({ message: "Your password has been updated.", headers: { "set-cookie": sessionCookie("changed-password-session") } });
  const api = await mockProfile(page, profileStore(), { "PATCH /profile/password": pending.handler });
  await page.goto("/profile");
  await fillPassword(page);
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect.poll(() => api.forPath("/profile/password").length).toBe(1);
  await expect(page.getByRole("button", { name: /Updating|Update password/ })).toBeDisabled();
  await page.getByLabel("Confirm new password", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Log out", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  pending.release();
  await expect(page.getByText("Your password has been updated.", { exact: true }).first()).toBeVisible();
  expect(api.forPath("/profile/password")).toHaveLength(1);
  expect(api.forPath("/auth/logout")).toHaveLength(0);
});

test("account deletion requires only exact DELETE and cancellation clears the confirmation", async ({ page }) => {
  const api = await mockProfile(page);
  await page.goto("/profile");
  let dialog = await openDeletion(page);
  await expect(dialog.getByLabel("Current password", { exact: true })).toHaveCount(0);
  const confirm = dialog.getByLabel("Type DELETE to confirm", { exact: true });
  const submit = dialog.getByRole("button", { name: "Permanently delete account", exact: true });
  await expect(submit).toBeDisabled();
  for (const value of ["delete", "DELETE ", " DELETE", "DELETE account"]) {
    await confirm.fill(value);
    await expect(submit).toBeDisabled();
    await confirm.press("Enter");
  }
  await confirm.fill("DELETE");
  await expect(submit).toBeEnabled();
  expect(api.forPath("/profile", "DELETE")).toHaveLength(0);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  dialog = await openDeletion(page);
  await expect(dialog.getByLabel("Current password", { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel("Type DELETE to confirm", { exact: true })).toHaveValue("");
  await expect(dialog.getByRole("button", { name: "Permanently delete account", exact: true })).toBeDisabled();
  expect(api.forPath("/profile", "DELETE")).toHaveLength(0);
});

test("failed account deletion keeps the account and permits correction", async ({ page }) => {
  const message = "Please re-enter DELETE to confirm account deletion.";
  const api = await mockProfile(page, profileStore(), {
    "DELETE /profile": () => ({ status: 422, errors: { confirmation: [message] } }),
  });
  await page.goto("/profile");
  const dialog = await openDeletion(page);
  await dialog.getByLabel("Type DELETE to confirm", { exact: true }).fill("DELETE");
  await dialog.getByRole("button", { name: "Permanently delete account", exact: true }).click();
  await expect(dialog.getByText(message, { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Type DELETE to confirm", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/profile$/);
  await expect(dialog.getByRole("button", { name: "Permanently delete account", exact: true })).toBeEnabled();
  expect(api.store.authenticated).toBe(true);
});

test("deletion blocks dismissal and duplicates, then clears recall and private access", async ({ page }) => {
  const store = profileStore();
  const pending = deferredReply({ message: "Your account has been permanently deleted.", headers: { "set-cookie": `${sessionCookie("")}; Max-Age=0` } });
  const api = await mockProfile(page, store, { "DELETE /profile": async () => {
    const reply = await pending.handler();
    store.authenticated = false;
    return reply;
  } });
  await page.goto("/profile");
  await page.evaluate((key) => localStorage.setItem(key, "ada"), rememberedUsernameKey);
  const dialog = await openDeletion(page);
  await dialog.getByLabel("Type DELETE to confirm", { exact: true }).fill("DELETE");
  await dialog.getByRole("button", { name: "Permanently delete account", exact: true }).click();
  await expect.poll(() => api.forPath("/profile", "DELETE").length).toBe(1);
  await expect(dialog.getByRole("button", { name: /Deleting|Permanently delete account/ })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Type DELETE to confirm", { exact: true }).press("Enter");
  pending.release();
  await expect(page).toHaveURL(/\/login$/);
  expect(api.forPath("/profile", "DELETE")[0].body).toEqual({ confirmation: "DELETE" });
  expect(api.forPath("/profile", "DELETE")).toHaveLength(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), rememberedUsernameKey)).toBeNull();
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue("");
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).not.toBeChecked();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toHaveCount(0);
});

test("a late image response after logout cannot overwrite a different account's photo", async ({ page }) => {
  const store = profileStore(existingPhoto);
  const pending = deferredReply({ data: { ...store.users[0], profile_image_url: null }, message: "Your profile photo has been removed." });
  const api = await mockProfile(page, store, { "DELETE /profile/image": pending.handler });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await expect.poll(() => api.forPath("/profile/image", "DELETE").length).toBe(1);
  await page.getByRole("button", { name: "Open account menu for Ada Lovelace", exact: true }).click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Username", { exact: true }).fill("other");
  await page.getByLabel("Password", { exact: true }).fill("another password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  const menu = page.getByRole("button", { name: "Open account menu for Grace Hopper", exact: true });
  await expect(menu.locator("img")).toHaveAttribute("src", otherPhoto);
  await menu.click();
  await page.getByRole("menuitem", { name: "Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  const reply = page.waitForResponse((response) => response.url().endsWith("/profile/image") && response.request().method() === "DELETE");
  pending.release();
  await reply;
  await expect(menu.locator("img")).toHaveAttribute("src", otherPhoto);
  await expect(page.locator("html")).toHaveAttribute("data-app-font", "inter");
  expect(store.users[1].profile_image_url).toBe(otherPhoto);
});

test("Profile fits at 320px in dark mode and the deletion dialog remains usable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await mockProfile(page);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const deletion = page.getByRole("button", { name: "Delete account", exact: true });
  await deletion.scrollIntoViewIfNeeded();
  await expect(deletion).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("profile-mobile-dark.png"), fullPage: true });
  const dialog = await openDeletion(page);
  await dialog.getByLabel("Type DELETE to confirm", { exact: true }).fill("DELETE");
  const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
  await cancel.scrollIntoViewIfNeeded();
  await expect(cancel).toBeInViewport();
  expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("profile-delete-mobile-dark.png") });
  await cancel.click();
  await expect(dialog).toBeHidden();
});
