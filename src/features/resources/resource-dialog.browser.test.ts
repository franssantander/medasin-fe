import { expect, test, type Page } from "@playwright/test";
import type { ResourceAttachment, ResourceDocument, ResourceTag } from "./type";

test.use({ actionTimeout: 15_000 });

const resourceUuid = "20000000-0000-4000-8000-000000000001";
const names = ["Research", "Design", "Reference", "Reading", "Ideas", "Development", "Product", "Work", "Personal", "Learning", "Planning", "Writing", "Health", "Finance", "Travel", "Inspiration", "Tools", "Documentation", "Templates", "Bookmarks"];
const tags = names.map((name, index) => ({ uuid: `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, name }));
const projects = [
  { uuid: "50000000-0000-4000-8000-000000000001", name: "Product launch" },
  { uuid: "50000000-0000-4000-8000-000000000002", name: "Design review" },
];
const areas = [{ uuid: "60000000-0000-4000-8000-000000000001", name: "Work" }];
const image: ResourceAttachment = { uuid: "30000000-0000-4000-8000-000000000001", kind: "image", url: "", name: "reference.png", size: 1024, mime_type: "image/png" };
const pdf: ResourceAttachment = { uuid: "30000000-0000-4000-8000-000000000002", kind: "file", url: "", name: "Research notes.pdf", size: 840000, mime_type: "application/pdf" };
const reference: ResourceAttachment = { uuid: "30000000-0000-4000-8000-000000000003", kind: "link", url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility", name: "Accessibility reference", size: null, mime_type: null };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=", "base64");
const initialResource = {
  id: 1, uuid: resourceUuid, title: "Product research and references", description: null, icon: "BookOpen", background: "#000000",
  archived_at: null as string | null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-06T10:00:00Z",
  content: { type: "doc", format: "blocknote-v1", content: [{ id: "saved-notes", type: "paragraph", content: "Saved research notes" }] } as ResourceDocument | null,
  types: ["note", "link", "image", "file"], attachments: [image, pdf, reference], tags: [tags[0]], projects: [projects[0]], areas,
};
type TestResource = typeof initialResource;
type ApiRequest = { path: string; method: string; body: Record<string, unknown> | string | null };
type ApiReply = { data?: unknown; status?: number; message?: string; errors?: Record<string, string[]> };
type ApiOptions = {
  resource?: Partial<TestResource>;
  projectItems?: ResourceTag[];
  onCreate?: (request: ApiRequest, next: TestResource) => ApiReply | Promise<ApiReply>;
  onPatch?: (request: ApiRequest, next: TestResource) => ApiReply | Promise<ApiReply>;
  onUpload?: (request: ApiRequest, next: TestResource) => ApiReply | Promise<ApiReply>;
  onDelete?: (request: ApiRequest, next: TestResource) => ApiReply | Promise<ApiReply>;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function mockResources(page: Page, options: ApiOptions = {}) {
  let resource: TestResource = { ...structuredClone(initialResource), ...options.resource };
  const requests: ApiRequest[] = [];
  const allTags = [...tags];
  let attachmentCount = 10;
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api-test/v1", "");
    const body = request.postData() ? request.headers()["content-type"]?.includes("application/json") ? request.postDataJSON() as Record<string, unknown> : request.postData() : null;
    const call: ApiRequest = { path, method: request.method(), body };
    requests.push(call);
    if (call.method === "GET" && path.startsWith(`/resource/${resourceUuid}/attachments/`)) {
      await route.fulfill({ contentType: "image/png", body: png });
      return;
    }
    let reply: ApiReply = { data: null };
    const input = typeof body === "object" && body ? body : {};
    const selectedTags = (input.tag_uuids as string[] | undefined ?? []).map((uuid) => allTags.find((tag) => tag.uuid === uuid)).filter((tag): tag is ResourceTag => Boolean(tag));
    for (const name of input.tag_names as string[] | undefined ?? []) {
      let tag = allTags.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (!tag) { tag = { uuid: `40000000-0000-4000-8000-${String(allTags.length + 1).padStart(12, "0")}`, name }; allTags.push(tag); }
      if (!selectedTags.some((item) => item.uuid === tag.uuid)) selectedTags.push(tag);
    }
    const relatedProjects = [...projects, ...resource.projects];
    const relatedAreas = [...areas, ...resource.areas];
    const next = {
      ...resource, ...input,
      tags: selectedTags,
      projects: (input.project_uuids as string[] | undefined ?? []).map((uuid) => relatedProjects.find((item) => item.uuid === uuid)).filter((item): item is ResourceTag => Boolean(item)),
      areas: (input.area_uuids as string[] | undefined ?? []).map((uuid) => relatedAreas.find((item) => item.uuid === uuid)).filter((item): item is ResourceTag => Boolean(item)),
    } as TestResource;

    if (path === "/auth/me") reply = { data: { id: 1, uuid: "10000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", username: "ada", status: "active", font_family: "manrope" } };
    else if (path === "/resource/tags") reply = { data: allTags };
    else if (path === "/project") reply = { data: options.projectItems ?? projects };
    else if (path === "/area") reply = { data: areas };
    else if (path === "/notifications") reply = { data: { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 } };
    else if (path === "/resource" && call.method === "GET") reply = { data: { current_page: 1, data: [resource], last_page: 1, per_page: 15, total: 1, next_page_url: null } };
    else if (path === "/resource" && call.method === "POST") {
      if (typeof body === "string") next.title = /name="title"\r\n\r\n([^\r\n]+)/.exec(body)?.[1] ?? resource.title;
      reply = await options.onCreate?.(call, next) ?? { status: 201, data: next, message: "Resource created." };
      if ((reply.status ?? 201) < 400) resource = reply.data as TestResource ?? next;
    } else if (path === `/resource/${resourceUuid}` && call.method === "PATCH") {
      reply = await options.onPatch?.(call, next) ?? { data: next };
      if ((reply.status ?? 200) < 400) resource = reply.data as TestResource ?? next;
    } else if (path === `/resource/${resourceUuid}/attachments` && call.method === "POST") {
      const multipart = typeof body === "string" ? body : "";
      const additions: ResourceAttachment[] = [
        ...[...multipart.matchAll(/name="links\[\]"\r\n\r\n([^\r\n]+)/g)].map((match) => ({ uuid: `30000000-0000-4000-8000-${String(++attachmentCount).padStart(12, "0")}`, kind: "link" as const, url: match[1], name: null, size: null, mime_type: null })),
        ...[...multipart.matchAll(/name="files\[\]"; filename="([^"]+)"/g)].map((match) => ({ uuid: `30000000-0000-4000-8000-${String(++attachmentCount).padStart(12, "0")}`, kind: /\.png$/.test(match[1]) ? "image" as const : "file" as const, url: "", name: match[1], size: 2048, mime_type: /\.png$/.test(match[1]) ? "image/png" : "application/pdf" })),
      ];
      const updated = { ...resource, attachments: [...resource.attachments, ...additions] };
      reply = await options.onUpload?.(call, updated) ?? { data: updated };
      if ((reply.status ?? 200) < 400) resource = reply.data as TestResource ?? updated;
    } else if (path.startsWith(`/resource/${resourceUuid}/attachments/`) && call.method === "DELETE") {
      const updated = { ...resource, attachments: resource.attachments.filter((item) => !path.endsWith(item.uuid)) };
      reply = await options.onDelete?.(call, updated) ?? { data: updated };
      if ((reply.status ?? 200) < 400) resource = reply.data as TestResource ?? updated;
    } else if (path === `/resource/${resourceUuid}`) reply = { data: resource };
    await route.fulfill({ status: reply.status ?? 200, json: { data: reply.data ?? null, status: reply.status ?? 200, message: reply.message ?? "OK", ...(reply.errors ? { errors: reply.errors } : {}) } });
  });
  return { requests, writes: () => requests.filter((request) => ["POST", "PATCH", "DELETE"].includes(request.method)), patches: () => requests.filter((request) => request.method === "PATCH") };
}

async function openAdd(page: Page) {
  await page.goto("/resources");
  await page.getByRole("button", { name: "New resource", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toHaveCSS("opacity", "1");
  await expect(page.locator(".bn-editor")).toBeVisible();
}

async function openEdit(page: Page) {
  await page.goto("/resources");
  await page.getByRole("button", { name: `Open ${initialResource.title}`, exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit resource", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Edit resource", exact: true })).toHaveCSS("opacity", "1");
  await expect(page.locator(".bn-editor")).toBeVisible();
}

test("create includes unfinished valid link and tag without extra add steps", async ({ page }) => {
  const api = await mockResources(page);
  await openAdd(page);
  await page.getByLabel(/^Title/).fill("Interaction references");
  await page.getByLabel("Links", { exact: true }).fill("https://example.com/reference");
  await page.getByRole("combobox", { name: "Tags", exact: true }).fill("Interaction");
  // Combobox intentionally hides other controls from assistive technology
  // while suggestions are open; the visible submit button still accepts clicks.
  await page.getByRole("button", { name: "Create resource", exact: true, includeHidden: true }).click();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toBeHidden();
  const create = api.writes().find((request) => request.path === "/resource")!;
  expect(create.body).toMatchObject({ title: "Interaction references", links: ["https://example.com/reference"], tag_names: ["Interaction"] });
  expect(api.writes()).toHaveLength(1);
});

test("create uses searchable tags and multiple project and area selections", async ({ page }) => {
  const api = await mockResources(page);
  await openAdd(page);
  await page.getByLabel(/^Title/).fill("Design resources");
  await page.getByRole("combobox", { name: "Tags", exact: true }).fill("Design");
  await page.getByRole("option", { name: "Design", exact: true }).click();
  await page.getByRole("combobox", { name: "Tags", exact: true }).fill("Roadmap");
  await page.getByRole("option", { name: "Create “Roadmap”", exact: true }).click();
  await page.getByRole("combobox", { name: "Projects", exact: true }).fill("Product");
  await page.getByRole("option", { name: "Product launch", exact: true }).click();
  await page.getByRole("combobox", { name: "Projects", exact: true }).fill("Design");
  await page.getByRole("option", { name: "Design review", exact: true }).click();
  await page.getByRole("combobox", { name: "Areas", exact: true }).fill("Work");
  await page.getByRole("option", { name: "Work", exact: true }).click();
  await page.getByRole("button", { name: "Create resource", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toBeHidden();
  expect(api.writes()[0].body).toMatchObject({ tag_uuids: [tags[1].uuid], tag_names: ["Roadmap"], project_uuids: projects.map((item) => item.uuid), area_uuids: [areas[0].uuid] });
});

test("create focuses a linked summary and keeps invalid drafts for correction", async ({ page }) => {
  const api = await mockResources(page);
  await openAdd(page);
  await page.getByLabel("Links", { exact: true }).fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Create resource", exact: true }).click();
  await expect(page.locator("#resource-errors")).toBeFocused();
  await expect(page.getByLabel(/^Title/)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Links", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "Links: Enter a valid HTTP or HTTPS link.", exact: true }).click();
  await expect(page.getByLabel("Links", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Links", { exact: true })).toHaveValue("javascript:alert(1)");
  expect(api.writes()).toHaveLength(0);
});

test("creation failure retains values and can be retried", async ({ page }) => {
  let attempts = 0;
  const api = await mockResources(page, { onCreate: (_request, next) => ++attempts === 1 ? { status: 422, message: "Choose another title.", errors: { title: ["This title is already in use."] } } : { status: 201, data: next } });
  await openAdd(page);
  await page.getByLabel(/^Title/).fill("Design references");
  await page.getByLabel("Links", { exact: true }).fill("https://example.com");
  await page.getByRole("button", { name: "Create resource", exact: true }).click();
  await expect(page.getByText("This title is already in use.", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/^Title/)).toHaveValue("Design references");
  await expect(page.getByLabel("Links", { exact: true })).toHaveValue("https://example.com");
  await page.getByLabel(/^Title/).fill("Updated design references");
  await page.getByRole("button", { name: "Create resource", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toBeHidden();
  expect(api.writes()).toHaveLength(2);
});

test("create protects a changed draft and restores focus on dismissal", async ({ page }) => {
  await mockResources(page);
  await openAdd(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "New resource", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "New resource", exact: true }).click();
  await page.getByLabel(/^Title/).fill("Keep this draft");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog", { name: "Discard this resource?", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Keep editing", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel(/^Title/)).toHaveValue("Keep this draft");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "New resource", exact: true })).toBeFocused();
});

test("appearance is shared and custom color correction keeps the picker open", async ({ page }) => {
  await mockResources(page);
  await openAdd(page);
  await expect(page.getByLabel("Icon", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Customize resource appearance", exact: true }).click();
  await page.getByLabel("Icon", { exact: true }).fill("Bookmark");
  await page.getByRole("button", { name: "Use Bookmark icon", exact: true }).click();
  await expect(page.getByRole("button", { name: "Use Bookmark icon", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Custom hex color", { exact: true }).fill("#123");
  await page.getByLabel(/^Title/).fill("Color reference");
  await page.getByRole("button", { name: "Create resource", exact: true }).click();
  await expect(page.getByLabel("Custom hex color", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Custom hex color", { exact: true }).fill("#0284C7");
  await expect(page.getByLabel("Custom hex color", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Icon", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create resource", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toBeHidden();
});

test("create previews images, formats small files, and submits multipart uploads", async ({ page }) => {
  const api = await mockResources(page);
  await openAdd(page);
  await page.getByLabel(/^Title/).fill("Uploaded references");
  await page.locator("input[type=file]").setInputFiles([{ name: "sample.png", mimeType: "image/png", buffer: png }, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.alloc(2048, "a") }]);
  await expect(page.getByText("2 KB", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View sample.png", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "sample.png", exact: true })).toBeVisible();
  await page.getByRole("dialog", { name: "sample.png", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create resource", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New resource", exact: true })).toBeHidden();
  expect(api.writes()[0].body).toEqual(expect.stringContaining('name="files[]"; filename="sample.png"'));
  expect(api.writes()[0].body).toEqual(expect.stringContaining('name="files[]"; filename="notes.txt"'));
});

test("invalid uploads keep existing selected files and send no requests", async ({ page }) => {
  const api = await mockResources(page);
  await openAdd(page);
  await page.locator("input[type=file]").setInputFiles({ name: "keep.txt", mimeType: "text/plain", buffer: Buffer.from("keep") });
  await page.locator("input[type=file]").setInputFiles({ name: "oversized.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(20 * 1024 * 1024 + 1) });
  await expect(page.getByText("Choose at most 10 files, each 20 MB or smaller.", { exact: true })).toBeVisible();
  await expect(page.getByText("1/10 selected", { exact: true })).toBeVisible();
  await expect(page.getByText("keep.txt", { exact: true })).toBeVisible();
  expect(api.writes()).toHaveLength(0);
});

test("edit serializes saves and never restores fields from an older response", async ({ page }) => {
  const first = deferred<ApiReply>();
  let firstNext: TestResource | undefined;
  let attempts = 0;
  const api = await mockResources(page, { onPatch: (_request, next) => { if (++attempts === 1) { firstNext = next; return first.promise; } return { data: next }; } });
  await openEdit(page);
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.getByLabel(/^Title/).fill("First revision");
  await expect.poll(() => api.patches().length).toBe(1);
  await page.getByLabel(/^Title/).fill("Latest revision");
  await page.getByRole("button", { name: "Remove Research", exact: true }).click();
  await page.getByRole("button", { name: "Remove Product launch", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saving…" })).toBeVisible();
  expect(api.patches()).toHaveLength(1);
  first.resolve({ data: firstNext });
  await expect.poll(() => api.patches().length).toBe(2);
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect(page.getByLabel(/^Title/)).toHaveValue("Latest revision");
  await expect(page.getByRole("button", { name: "Remove Research", exact: true })).toHaveCount(0);
  expect(api.patches()[1].body).toMatchObject({ title: "Latest revision", tag_uuids: [], project_uuids: [] });
});

test("edit retries a failed save without losing the current draft", async ({ page }) => {
  let attempts = 0;
  const api = await mockResources(page, { onPatch: (_request, next) => ++attempts === 1 ? { status: 500, message: "Could not save. Try again." } : { data: next } });
  await openEdit(page);
  await page.getByLabel(/^Title/).fill("Retry this title");
  await expect(page.getByRole("button", { name: "Retry save", exact: true })).toBeVisible();
  await expect(page.getByLabel(/^Title/)).toHaveValue("Retry this title");
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  expect(api.patches()).toHaveLength(2);
});

test("edit saves a newer queued draft when an older request fails", async ({ page }) => {
  const first = deferred<ApiReply>();
  let attempts = 0;
  const api = await mockResources(page, { onPatch: (_request, next) => ++attempts === 1 ? first.promise : { data: next } });
  await openEdit(page);
  await page.getByLabel(/^Title/).fill("First revision");
  await expect.poll(() => api.patches().length).toBe(1);
  await page.getByLabel(/^Title/).fill("Corrected revision");
  first.resolve({ status: 500, message: "Older request failed." });
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  expect(api.patches()).toHaveLength(2);
  expect(api.patches()[1].body).toMatchObject({ title: "Corrected revision" });
});

test("closing edit flushes the debounce and waits for the save", async ({ page }) => {
  const pending = deferred<ApiReply>();
  let next: TestResource | undefined;
  const api = await mockResources(page, { onPatch: (_request, input) => { next = input; return pending.promise; } });
  await openEdit(page);
  await page.getByLabel(/^Title/).fill("Save before closing");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(() => api.patches().length).toBe(1);
  await expect(page.getByRole("dialog", { name: "Edit resource", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close", exact: true })).toBeDisabled();
  pending.resolve({ data: next });
  await expect(page.getByRole("dialog", { name: "Edit resource", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open Save before closing", exact: true })).toBeFocused();
});

test("a failed close save does not retry while discard confirmation is open", async ({ page }) => {
  const api = await mockResources(page, { onPatch: () => ({ status: 500, message: "Close save failed." }) });
  await openEdit(page);
  await page.getByLabel(/^Title/).fill("Keep this failed draft");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true })).toBeVisible();
  // Let the original 700 ms debounce expire while the confirmation is open.
  await page.waitForTimeout(900);
  expect(api.patches()).toHaveLength(1);
  await page.getByRole("button", { name: "Discard unsaved changes", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit resource", exact: true })).toBeHidden();
  expect(api.patches()).toHaveLength(1);
});

test("invalid edits and unfinished link drafts require explicit dismissal", async ({ page }) => {
  const api = await mockResources(page);
  await openEdit(page);
  await page.getByLabel(/^Title/).fill("");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel(/^Title/)).toHaveValue("");
  expect(api.patches()).toHaveLength(0);
  await page.getByLabel(/^Title/).fill(initialResource.title);
  await page.getByLabel("Links", { exact: true }).fill("https://example.com/unfinished");
  await expect(page.getByRole("status").filter({ hasText: /^Unsaved changes$/ })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Discard unsaved changes", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit resource", exact: true })).toBeHidden();
  expect(api.writes()).toHaveLength(0);
});

test("edit retains associations omitted from active options", async ({ page }) => {
  const archivedProject = { uuid: "50000000-0000-4000-8000-000000000009", name: "Historical project" };
  const api = await mockResources(page, { resource: { projects: [archivedProject] }, projectItems: projects });
  await openEdit(page);
  await expect(page.getByRole("button", { name: "Remove Historical project", exact: true })).toBeVisible();
  await page.getByLabel(/^Title/).fill("Keep historical association");
  await expect.poll(() => api.patches().length).toBe(1);
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  expect(api.patches()[0].body).toMatchObject({ project_uuids: [archivedProject.uuid] });
});

test("tags support keyboard selection and Enter creates a tag without submitting the form", async ({ page }) => {
  const api = await mockResources(page);
  await openAdd(page);
  await page.getByLabel(/^Title/).fill("Keyboard reference");
  const input = page.getByRole("combobox", { name: "Tags", exact: true });
  await input.fill("Research");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: "Remove Research", exact: true })).toBeVisible();
  await input.fill("Keyboard");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: "Remove Keyboard", exact: true })).toBeVisible();
  expect(api.writes()).toHaveLength(0);
});

test("resource notes keep formatting, save edits, and save undo", async ({ page }) => {
  const api = await mockResources(page);
  await openEdit(page);
  const editor = page.locator(".bn-editor[contenteditable=true]");
  await editor.focus();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Control+b");
  await page.keyboard.insertText("A bold takeaway");
  await page.keyboard.press("Control+b");
  await expect.poll(() => api.patches().length).toBeGreaterThan(0);
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  const saved = JSON.stringify(api.patches().at(-1)!.body);
  expect(saved).toContain("A bold takeaway");
  expect(saved).toContain('"bold":true');
  const count = api.patches().length;
  await page.keyboard.press("Control+z");
  await expect(editor).not.toContainText("A bold takeaway");
  await expect.poll(() => api.patches().length).toBeGreaterThan(count);
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  expect(JSON.stringify(api.patches().at(-1)!.body)).not.toContain("A bold takeaway");
});

test("failed file uploads retain their files and can be retried", async ({ page }) => {
  let attempts = 0;
  const api = await mockResources(page, { onUpload: (_request, next) => ++attempts === 1 ? { status: 500, message: "Upload failed. Try again." } : { data: next } });
  await openEdit(page);
  await page.locator("input[type=file]").setInputFiles({ name: "retry.pdf", mimeType: "application/pdf", buffer: Buffer.from("reference") });
  await expect(page.getByRole("button", { name: "Retry upload", exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^Unsaved changes$/ })).toBeVisible();
  await expect(page.getByText("retry.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry upload", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry upload", exact: true })).toHaveCount(0);
  await expect(page.getByText("retry.pdf", { exact: true })).toBeVisible();
  expect(api.writes().filter((request) => request.method === "POST")).toHaveLength(2);
});

test("edit uploads immediately, previews in-dialog, and confirms attachment deletion", async ({ page }) => {
  const api = await mockResources(page);
  await openEdit(page);
  await page.getByRole("button", { name: "View reference.png", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "reference.png", exact: true })).toBeVisible();
  await page.getByRole("dialog", { name: "reference.png", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({ name: "new-notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("reference") });
  await expect(page.getByText("new-notes.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove Research notes.pdf", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Delete attachment?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(api.writes().filter((request) => request.method === "DELETE")).toHaveLength(0);
  await page.getByRole("button", { name: "Remove Research notes.pdf", exact: true }).click();
  await page.getByRole("button", { name: "Delete attachment", exact: true }).click();
  await expect(page.getByText("Research notes.pdf", { exact: true })).toHaveCount(0);
  expect(api.writes().filter((request) => request.method === "POST")).toHaveLength(1);
  expect(api.writes().filter((request) => request.method === "DELETE")).toHaveLength(1);
});

test("archived resources stay read-only and send no mutations", async ({ page }) => {
  const api = await mockResources(page, { resource: { archived_at: "2026-10-06T10:00:00Z" } });
  await page.goto(`/resources?resource=${resourceUuid}`);
  await expect(page.getByRole("dialog", { name: "Resource details", exact: true })).toBeVisible();
  await expect(page.getByLabel(/^Title/)).toHaveAttribute("readonly", "");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Customize resource appearance", exact: true })).toHaveCount(0);
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await expect(page.locator(".bn-editor[contenteditable=true]")).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Resource details", exact: true })).toBeHidden();
  expect(api.writes()).toHaveLength(0);
});

for (const theme of ["light", "dark"]) {
  for (const width of [390, 768, 1440]) {
    for (const mode of ["add", "edit"]) {
      test(`${mode} layout keeps actions and focused controls visible at ${width}px in ${theme} mode`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
        await page.addInitScript((theme) => localStorage.setItem("theme", theme), theme);
        await mockResources(page);
        if (mode === "add") await openAdd(page); else await openEdit(page);
        const dialog = page.getByRole("dialog", { name: mode === "add" ? "New resource" : "Edit resource", exact: true });
        const action = page.getByRole("button", { name: mode === "add" ? "Create resource" : "Close", exact: true });
        await expect(action).toBeInViewport();
        const overflow = await dialog.evaluate((element) => {
          const body = element.querySelector('[data-slot="resource-dialog-body"]')!;
          return { popup: element.scrollWidth > element.clientWidth + 1, body: body.scrollWidth > body.clientWidth + 1 };
        });
        expect(overflow).toEqual({ popup: false, body: false });
        const editorColors = await page.locator(".resource-note-editor .bn-editor").evaluate((editor) => ({ background: getComputedStyle(editor).backgroundColor, color: getComputedStyle(editor).color }));
        expect(editorColors.background).not.toBe(editorColors.color);
        if (theme === "dark") expect(editorColors.background).not.toBe("rgb(255, 255, 255)");
        await page.screenshot({ path: info.outputPath(`resource-${mode}-${width}-${theme}.png`) });
        const input = page.getByRole("combobox", { name: "Tags", exact: true });
        await input.focus();
        await expect(input).toBeInViewport();
        await expect(action).toBeInViewport();
        const bounds = await input.boundingBox();
        const body = await dialog.locator('[data-slot="resource-dialog-body"]').boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(body!.y);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(body!.y + body!.height + 1);
      });
    }
  }
}
