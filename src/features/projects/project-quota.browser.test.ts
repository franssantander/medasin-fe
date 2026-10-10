import { expect, test, type Locator, type Page } from "@playwright/test";
import { idleFocusDashboard } from "@/test-utils/focus-fixture";
import type { Area } from "@/features/areas/type";
import type { Resource } from "@/features/resources/type";
import type { ProjectListCard } from "./type";

test.use({ actionTimeout: 15_000 });

const projectUuid = "20000000-0000-4000-8000-000000000001";
const areaUuid = "30000000-0000-4000-8000-000000000001";
const resourceUuid = "40000000-0000-4000-8000-000000000001";
const area: Area = {
  id: 1, uuid: areaUuid, name: "Work", slug: "work", icon: "Briefcase",
  background: "#000000", background_image: null, background_image_url: null,
  description: null, archived_at: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
};
const project: ProjectListCard = {
  uuid: projectUuid, name: "Product launch", slug: "product-launch", description: "Original description",
  icon: "Rocket", background: "#000000", status: "not_started", progress_percentage: 0,
  start_date: null, due_date: null, is_overdue: false, days_overdue: null, archived_at: null,
  area: { uuid: areaUuid, name: area.name, slug: area.slug, icon: area.icon }, goals: { count: 0, url: null },
};
const resource: Resource = {
  id: 1, uuid: resourceUuid, title: "Research", icon: "BookOpen", background: "#000000", type: "note",
  description: null, url: null, author: null, source: null, is_favorite: false, archived_at: null,
  created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", content: null,
  types: ["note"], attachments: [], tags: [], projects: [], areas: [],
};
const exhaustedSubscription = {
  plan: { slug: "free", name: "Free" }, grant_type: "free", expires_at: null, enforcement_enabled: true,
  limits: { projects: 10, areas: 5, resources: 100 }, usage: { projects: 10, areas: 5, resources: 100 },
};
type Feature = "projects" | "areas" | "resources";
type Reply = { data?: unknown; status?: number; message?: string; code?: string; meta?: unknown; errors?: Record<string, string[]> };
type ApiRequest = { path: string; method: string; body: Record<string, unknown> | null };
const forms = [
  { feature: "projects", route: "/projects", singular: "project", dialog: "Create project", field: "Name", limit: 10 },
  { feature: "areas", route: "/areas", singular: "area", dialog: "Create area", field: "Name", limit: 5 },
  { feature: "resources", route: "/resources", singular: "resource", dialog: "New resource", field: "Title", limit: 100 },
] as const;
type Form = typeof forms[number];

function quota(feature: Feature, usage: number, limit: number): Reply {
  return { status: 403, code: "PLAN_LIMIT_EXCEEDED", message: `The ${feature} limit for your current plan has been reached.`, meta: { feature, usage, limit } };
}

async function fixture(page: Page) {
  const requests: ApiRequest[] = [];
  const replies = new Map<string, Reply>();
  const holds = new Map<string, Promise<void>>();
  let savedProject = structuredClone(project);
  let projects = [savedProject];
  let areas = [structuredClone(area)];
  let resources = [structuredClone(resource)];
  await page.context().addCookies([{ name: "auth_token", value: "quota-test", url: "http://127.0.0.1:3107" }]);
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api-test/v1", "");
    const method = request.method();
    const raw = request.postData();
    const body = !raw ? null : request.headers()["content-type"]?.includes("application/json")
      ? request.postDataJSON() as Record<string, unknown>
      : Object.fromEntries([...raw.matchAll(/name="([^"\r\n]+)"\r\n\r\n([^\r\n]*)/g)].map((match) => [match[1], match[2]]));
    requests.push({ path, method, body });
    const hold = holds.get(`${method} ${path}`);
    holds.delete(`${method} ${path}`);
    if (hold) await hold;
    let data: unknown = [];
    if (path === "/auth/me") data = { id: 1, uuid: "10000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace", username: "ada", email: "ada@example.com", font_family: "manrope" };
    else if (path === "/notifications") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    else if (path === "/focus") data = idleFocusDashboard();
    else if (path === "/subscription") data = exhaustedSubscription;
    else if (path === "/project" && method === "GET") data = projects;
    else if (path === "/area" && method === "GET") data = areas;
    else if (path === "/resource" && method === "GET") data = { current_page: 1, data: resources, last_page: 1, per_page: 15, total: resources.length, next_page_url: null };
    else if (path === "/resource/tags") data = [];
    else if (path === `/project/${projectUuid}` && method === "GET") data = { ...savedProject, boards: [], resources: [] };

    const overridden = replies.get(`${method} ${path}`);
    if (!overridden && path === `/project/${projectUuid}` && method === "PUT") {
      savedProject = { ...savedProject, ...body } as ProjectListCard;
      projects = [savedProject];
      data = savedProject;
    } else if (!overridden && path === "/project" && method === "POST") {
      const created = { ...project, ...body, uuid: "20000000-0000-4000-8000-000000000002", area: null } as ProjectListCard;
      projects = [...projects, created];
      data = created;
    } else if (!overridden && path === "/area" && method === "POST") {
      const created = { ...area, ...body, uuid: "30000000-0000-4000-8000-000000000002" } as Area;
      areas = [...areas, created];
      data = created;
    } else if (!overridden && path === "/resource" && method === "POST") {
      const created = { ...resource, ...body, uuid: "40000000-0000-4000-8000-000000000002" } as Resource;
      resources = [...resources, created];
      data = created;
    }
    const reply: Reply = overridden ?? { data };
    const status = reply.status ?? 200;
    await route.fulfill({ status, json: { data: reply.data ?? null, status, message: reply.message ?? "Saved successfully.", ...(reply.code ? { code: reply.code } : {}), ...(reply.meta !== undefined ? { meta: reply.meta } : {}), ...(reply.errors ? { errors: reply.errors } : {}) } });
  });
  return {
    requests, replies,
    hold: (key: string) => {
      let release!: () => void;
      holds.set(key, new Promise<void>((resolve) => { release = resolve; }));
      return release;
    },
    count: (method: string, path: string) => requests.filter((request) => request.method === method && request.path === path).length,
    writes: () => requests.filter((request) => ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)),
  };
}

async function openCreate(page: Page, form: Form, navigate = true) {
  if (navigate) await page.goto(form.route);
  await page.getByRole("button", { name: `New ${form.singular}`, exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: form.dialog, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("opacity", "1");
  if (form.feature === "resources") await expect(dialog.locator(".bn-editor")).toBeVisible();
  return dialog;
}

function field(dialog: Locator, form: Form) {
  return dialog.getByRole("textbox", { name: form.feature === "resources" ? /^Title/ : /^Name/ });
}

async function expectQuota(page: Page, dialog: Locator, feature: Feature, usage?: number, limit?: number) {
  const alert = dialog.getByRole("alert");
  await expect(alert).toHaveCount(1);
  await expect(alert).toContainText("Plan limit reached");
  await expect(alert.getByRole("link", { name: "Plan & usage", exact: true })).toHaveAttribute("href", "/settings/plan");
  if (usage !== undefined && limit !== undefined) {
    await expect(alert).toContainText(new RegExp(feature, "i"));
    await expect(alert).toContainText(String(usage));
    await expect(alert).toContainText(String(limit));
  }
  await expect(page.locator('[data-slot="toast"]')).toHaveCount(0);
}

for (const form of forms) {
  test(`${form.singular} creation shows server quota counts and preserves a retryable draft`, async ({ page }) => {
    const api = await fixture(page);
    api.replies.set(`POST /${form.singular}`, quota(form.feature, form.limit + 2, form.limit));
    const dialog = await openCreate(page, form);
    await field(dialog, form).fill(`My ${form.singular} draft`);
    if (form.feature !== "resources") await dialog.getByLabel("Description", { exact: true }).fill("Keep this description.");
    else await dialog.getByLabel("Links", { exact: true }).fill("https://example.com/draft");
    const listReads = api.count("GET", `/${form.singular}`);
    await dialog.getByRole("button", { name: `Create ${form.singular}`, exact: true }).click();
    await expectQuota(page, dialog, form.feature, form.limit + 2, form.limit);
    await expect(field(dialog, form)).toHaveValue(`My ${form.singular} draft`);
    if (form.feature !== "resources") await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue("Keep this description.");
    else await expect(dialog.getByLabel("Links", { exact: true })).toHaveValue("https://example.com/draft");
    await expect.poll(() => api.count("GET", `/${form.singular}`)).toBeGreaterThan(listReads);
    await expect(dialog.getByRole("button", { name: `Create ${form.singular}`, exact: true })).toBeEnabled();
    api.replies.delete(`POST /${form.singular}`);
    await dialog.getByRole("button", { name: `Create ${form.singular}`, exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(api.count("POST", `/${form.singular}`)).toBe(2);
  });

  test(`${form.singular} validation remains a field error rather than a quota alert`, async ({ page }) => {
    const api = await fixture(page);
    const fieldName = form.feature === "resources" ? "title" : "name";
    api.replies.set(`POST /${form.singular}`, { status: 422, message: "The submitted data is invalid.", errors: { [fieldName]: ["Choose a different name."] } });
    const dialog = await openCreate(page, form);
    await field(dialog, form).fill("Already in use");
    await dialog.getByRole("button", { name: `Create ${form.singular}`, exact: true }).click();
    await expect(dialog.getByText("Choose a different name.", { exact: true })).toBeVisible();
    await expect(field(dialog, form)).toHaveAttribute("aria-invalid", "true");
    await expect(field(dialog, form)).toHaveValue("Already in use");
    await expect(dialog.getByText("Plan limit reached", { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("link", { name: "Plan & usage", exact: true })).toHaveCount(0);
  });
}

test("creating a project with a new Area presents the Area quota and retains both drafts", async ({ page }) => {
  const api = await fixture(page);
  api.replies.set("POST /project", quota("areas", 5, 5));
  const dialog = await openCreate(page, forms[0]);
  await dialog.getByLabel("Name", { exact: true }).fill("Launch preparation");
  await dialog.getByRole("button", { name: "Create new area", exact: true }).click();
  await dialog.getByLabel("New area name", { exact: true }).fill("Career growth");
  await dialog.getByRole("button", { name: "Create project", exact: true }).click();
  await expectQuota(page, dialog, "areas", 5, 5);
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue("Launch preparation");
  await expect(dialog.getByLabel("New area name", { exact: true })).toHaveValue("Career growth");
  expect(api.writes()).toMatchObject([{ method: "POST", path: "/project", body: { name: "Launch preparation", area_name: "Career growth" } }]);
});

test("an Area quota denial after updating project details explains the partial save and keeps the open draft", async ({ page }) => {
  const api = await fixture(page);
  api.replies.set(`PATCH /project/${projectUuid}/area`, quota("areas", 5, 5));
  await page.goto("/projects");
  await page.getByRole("button", { name: "Actions for Product launch", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit project", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name", { exact: true }).fill("Updated launch");
  await dialog.getByLabel("Description", { exact: true }).fill("Saved project details");
  await dialog.getByRole("button", { name: "Create new area", exact: true }).click();
  await dialog.getByLabel("New area name", { exact: true }).fill("New responsibility");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  const alert = dialog.getByRole("alert");
  await expect(alert).toContainText("Plan limit reached");
  await expect(dialog).toContainText(/(?:project )?details.*saved/i);
  await expect(dialog).toContainText(/area/i);
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue("Updated launch");
  await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue("Saved project details");
  await expect(dialog.getByLabel("New area name", { exact: true })).toHaveValue("New responsibility");
  expect(api.writes()).toMatchObject([
    { method: "PUT", path: `/project/${projectUuid}`, body: { name: "Updated launch", description: "Saved project details" } },
    { method: "PATCH", path: `/project/${projectUuid}/area`, body: { area_name: "New responsibility" } },
  ]);
  await expect(page.locator('[data-slot="toast"]').filter({ hasText: "The areas limit" })).toHaveCount(0);
});

for (const meta of [
  { feature: "projects", usage: "unsafe-usage", limit: 10 },
  { feature: "unsupported-feature", usage: 777, limit: 777 },
  { feature: "projects", usage: -777, limit: 10 },
]) {
  test(`malformed quota metadata uses the generic explanation (${JSON.stringify(meta)})`, async ({ page }) => {
    const api = await fixture(page);
    api.replies.set("POST /project", { status: 403, code: "PLAN_LIMIT_EXCEEDED", message: "Quota reached.", meta });
    const dialog = await openCreate(page, forms[0]);
    await dialog.getByLabel("Name", { exact: true }).fill("Keep the draft");
    await dialog.getByRole("button", { name: "Create project", exact: true }).click();
    await expectQuota(page, dialog, "projects");
    await expect(dialog.getByRole("alert")).not.toContainText(/unsafe-usage|unsupported-feature|777/);
    await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue("Keep the draft");
  });
}

test("ordinary permission denials retain their existing error feedback", async ({ page }) => {
  const api = await fixture(page);
  api.replies.set("POST /project", { status: 403, code: "FORBIDDEN", message: "You do not have permission to create this project." });
  const dialog = await openCreate(page, forms[0]);
  await dialog.getByLabel("Name", { exact: true }).fill("Restricted project");
  await dialog.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.locator('[data-slot="toast"]')).toContainText("You do not have permission to create this project.");
  await expect(dialog.getByText("Plan limit reached", { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue("Restricted project");
});

test("quota feedback appears while the refreshed project list is still loading", async ({ page }) => {
  const api = await fixture(page);
  api.replies.set("POST /project", quota("projects", 10, 10));
  const dialog = await openCreate(page, forms[0]);
  await dialog.getByLabel("Name", { exact: true }).fill("Keep editing this draft");
  const listReads = api.count("GET", "/project");
  const release = api.hold("GET /project");
  try {
    await dialog.getByRole("button", { name: "Create project", exact: true }).click();
    await expect.poll(() => api.count("GET", "/project")).toBeGreaterThan(listReads);
    await expect(dialog.getByRole("alert")).toContainText("Plan limit reached", { timeout: 5_000 });
    await expect(dialog.getByRole("button", { name: "Create project", exact: true })).toBeEnabled();
    await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue("Keep editing this draft");
  } finally {
    const refreshed = page.waitForResponse((response) => response.request().method() === "GET" && new URL(response.url()).pathname === "/api-test/v1/project");
    release();
    await refreshed;
  }
});

test("cached exhausted usage leaves all Core create forms usable and accepts server success", async ({ page }) => {
  const api = await fixture(page);
  await page.goto("/settings/plan");
  await expect(page.getByRole("heading", { name: "Plan & usage", exact: true })).toBeVisible();
  await expect.poll(() => api.count("GET", "/subscription")).toBeGreaterThan(0);
  for (const form of forms) {
    await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: form.feature[0].toUpperCase() + form.feature.slice(1), exact: true }).click();
    const dialog = await openCreate(page, form, false);
    await field(dialog, form).fill(`Server approved ${form.singular}`);
    await expect(dialog.getByRole("button", { name: `Create ${form.singular}`, exact: true })).toBeEnabled();
    await dialog.getByRole("button", { name: `Create ${form.singular}`, exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(api.count("POST", `/${form.singular}`)).toBe(1);
  }
  expect(api.count("GET", "/subscription")).toBe(1);
});
