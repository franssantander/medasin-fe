import { expect, test, type Page } from "@playwright/test";
import type { Resource } from "./type";
import type { TrashItem } from "@/features/settings/types";
import type { Board, BoardTask, BoardTaskInput } from "@/features/projects/type";

const resourceUuid = "20000000-0000-4000-8000-000000000011";
const trashUuid = "30000000-0000-4000-8000-000000000011";
const title = "Research to recover";

async function mockResourceTrash(
  page: Page,
  options: { archived?: boolean; trashed?: boolean; failDeleteOnce?: boolean } = {},
) {
  let deleted = Boolean(options.trashed);
  let permanentlyDeleted = false;
  let usage = 100;
  let failDelete = options.failDeleteOnce;
  const requests: { path: string; method: string; type: string | null }[] = [];
  const resource: Resource = {
    id: 11, uuid: resourceUuid, title, icon: "BookOpen", background: "#000000",
    type: "note", description: "Saved research", url: null, author: null,
    source: null, is_favorite: false, content: null, types: ["note"],
    archived_at: options.archived ? "2026-10-09T10:00:00Z" : null,
    created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-09T10:00:00Z",
    attachments: [], tags: [], projects: [], areas: [],
  };
  const trash: TrashItem = {
    uuid: trashUuid, subject_uuid: resourceUuid, type: "resource", title,
    context: null, deleted_at: "2026-10-09T10:00:00Z", expires_at: "2026-11-08T10:00:00Z",
    days_remaining: 29, group_size: 1, can_restore: true, restore_block_reason: null,
  };
  const paginate = (items: unknown[]) => ({
    current_page: 1, data: items, last_page: 1, per_page: 15,
    total: items.length, next_page_url: null,
  });

  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api-test/v1", "");
    const method = request.method();
    requests.push({ path, method, type: url.searchParams.get("type") });
    let data: unknown = null;
    let status = 200;
    let message = "Request was successful.";

    if (path === "/auth/me") data = {
      id: 1, uuid: "10000000-0000-4000-8000-000000000001",
      first_name: "Ada", last_name: "Lovelace", email: "ada@example.com",
      username: "ada", status: "active", font_family: "manrope",
    };
    else if (path === "/subscription") data = {
      plan: { slug: "free", name: "Free" }, grant_type: "free", expires_at: null,
      enforcement_enabled: true, limits: { projects: 10, areas: 5, resources: 100 },
      usage: { projects: 0, areas: 0, resources: usage },
    };
    else if (["/resource/tags", "/area", "/project"].includes(path)) data = [];
    else if (path === "/notifications") data = paginate([]);
    else if (path === "/resource" && method === "GET") {
      const archived = url.searchParams.get("status") === "archived";
      data = paginate(!deleted && archived === Boolean(resource.archived_at) ? [resource] : []);
    } else if (path === `/resource/${resourceUuid}` && method === "DELETE") {
      if (failDelete) { failDelete = false; status = 500; message = "Resource deletion failed. Try again."; }
      else { deleted = true; usage -= 1; message = "Resource moved to Trash."; }
    } else if (path === `/resource/${resourceUuid}` && method === "GET") {
      if (deleted) { status = 404; message = "Resource not found."; }
      else data = resource;
    } else if (path === `/resource/${resourceUuid}` && method === "PATCH") {
      resource.title = request.postDataJSON().title;
      data = resource;
    } else if (path === `/resource/${resourceUuid}/archive`) {
      resource.archived_at = "2026-10-10T10:00:00Z";
      data = resource;
      message = "Resource archived.";
    } else if (path === "/trash" && method === "GET") data = paginate(deleted && !permanentlyDeleted ? [trash] : []);
    else if (path === `/trash/${trashUuid}/restore`) {
      deleted = false; usage += 1; message = "Resource restored.";
    } else if (path === `/trash/${trashUuid}` && method === "DELETE") {
      permanentlyDeleted = true; message = "Resource permanently deleted.";
    }

    await route.fulfill({ status, json: { data, status, message } });
  });
  return { requests };
}

test("resource deletion confirms, preserves failures for retry, and removes the active record", async ({ page }) => {
  const api = await mockResourceTrash(page, { failDeleteOnce: true });
  await page.goto("/resources");
  await page.getByRole("button", { name: `Delete ${title}`, exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Delete resource?", exact: true });
  await expect(confirmation).toContainText("Trash for 30 days");
  await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(api.requests.filter((request) => request.method === "DELETE")).toHaveLength(0);
  await page.getByRole("button", { name: `Delete ${title}`, exact: true }).click();
  await confirmation.getByRole("button", { name: "Delete resource", exact: true }).click();
  await expect(page.getByText("Resource deletion failed. Try again.", { exact: true })).toBeVisible();
  await expect(confirmation).toBeVisible();
  await expect(page.getByRole("button", { name: `Open ${title}`, exact: true, includeHidden: true })).toHaveCount(1);
  await confirmation.getByRole("button", { name: "Delete resource", exact: true }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByRole("button", { name: `Open ${title}`, exact: true })).toHaveCount(0);
  expect(api.requests.filter((request) => request.path === `/resource/${resourceUuid}` && request.method === "DELETE")).toHaveLength(2);
});

test("deleting a deep-linked resource closes to the library without refetching the deleted detail", async ({ page }) => {
  const api = await mockResourceTrash(page);
  await page.goto(`/resources?resource=${resourceUuid}`);
  const detail = page.getByRole("dialog", { name: "Resource details", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Delete resource", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete resource?", exact: true }).getByRole("button", { name: "Delete resource", exact: true }).click();
  await expect(page).toHaveURL(/\/resources$/);
  await expect(detail).toBeHidden();
  const deleteIndex = api.requests.findIndex((request) => request.path === `/resource/${resourceUuid}` && request.method === "DELETE");
  expect(api.requests.slice(deleteIndex + 1).filter((request) => request.path === `/resource/${resourceUuid}` && request.method === "GET")).toHaveLength(0);
});

test("archiving remains separate from deleting and explains that archived records count", async ({ page }) => {
  const api = await mockResourceTrash(page);
  await page.goto("/resources");
  await page.getByRole("button", { name: `Archive ${title}`, exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Archive resource?", exact: true });
  await expect(confirmation).toContainText("Archived resources still count toward your plan usage.");
  await confirmation.getByRole("button", { name: "Archive resource", exact: true }).click();
  await expect(confirmation).toBeHidden();
  expect(api.requests.some((request) => request.path.endsWith("/archive") && request.method === "POST")).toBe(true);
  expect(api.requests.some((request) => request.method === "DELETE")).toBe(false);
});

test("an archived resource can be deleted from its read-only detail", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await mockResourceTrash(page, { archived: true });
  await page.goto("/archives");
  await page.getByRole("button", { name: `Open ${title}`, exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Resource details", exact: true });
  await expect(detail.getByRole("button", { name: "Edit resource", exact: true })).toHaveCount(0);
  await detail.getByRole("button", { name: "Delete resource", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete resource?", exact: true }).getByRole("button", { name: "Delete resource", exact: true }).click();
  await expect(detail).toBeHidden();
  await expect(page.getByRole("button", { name: `Open ${title}`, exact: true })).toHaveCount(0);
  expect(api.requests.some((request) => request.path === `/resource/${resourceUuid}` && request.method === "DELETE")).toBe(true);
});

test("active resource detail keeps every action reachable at 320px and deletes only outside editing", async ({ page }, testInfo) => {
  const api = await mockResourceTrash(page);
  await page.goto("/resources");
  await page.getByRole("button", { name: `Open ${title}`, exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Resource details", exact: true });
  await expect(detail).toBeVisible();
  await expect(detail).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("resource-detail-desktop.png") });
  await page.setViewportSize({ width: 320, height: 720 });
  await page.screenshot({ path: testInfo.outputPath("resource-detail-320.png") });
  const widths = await detail.evaluate((element) => {
    const footer = element.querySelector<HTMLElement>('[data-slot="resource-dialog-footer"]')!;
    return {
      dialogWidth: element.clientWidth, dialogScrollWidth: element.scrollWidth,
      footerWidth: footer.clientWidth, footerScrollWidth: footer.scrollWidth,
    };
  });
  expect(widths.dialogScrollWidth).toBeLessThanOrEqual(widths.dialogWidth);
  expect(widths.footerScrollWidth).toBeLessThanOrEqual(widths.footerWidth);
  const dialogBounds = await detail.boundingBox();
  expect(dialogBounds).not.toBeNull();
  for (const name of ["Delete resource", "Close", "Edit resource"]) {
    const button = detail.getByRole("button", { name, exact: true });
    await expect(button).toBeInViewport();
    const bounds = await button.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(dialogBounds!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(dialogBounds!.x + dialogBounds!.width);
  }
  await detail.getByRole("button", { name: "Edit resource", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit resource", exact: true });
  await expect(editor.getByRole("button", { name: "Delete resource", exact: true })).toHaveCount(0);
  await page.getByLabel(/^Title/).fill("Research after review");
  await editor.getByRole("button", { name: "Done", exact: true }).click();
  await expect(detail).toBeVisible();
  await expect(detail.getByRole("heading", { name: "Research after review", exact: true })).toBeVisible();
  await expect(detail.getByRole("button", { name: "Delete resource", exact: true })).toBeEnabled();
  expect(api.requests.some((request) => request.path === `/resource/${resourceUuid}` && request.method === "PATCH")).toBe(true);
});

test("Trash filters Resources and restores over quota with refreshed usage", async ({ page }) => {
  const api = await mockResourceTrash(page, { trashed: true });
  await page.goto("/settings/plan");
  await expect(page.getByText("100 of 100", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Settings navigation", exact: true }).getByRole("link", { name: "Trash", exact: true }).click();
  await page.getByRole("combobox", { name: "Filter by type", exact: true }).click();
  await page.getByRole("option", { name: "Resources", exact: true }).click();
  await expect.poll(() => api.requests.some((request) => request.path === "/trash" && request.type === "resource")).toBe(true);
  const row = page.getByRole("article").filter({ hasText: title });
  await expect(row.getByText("Resource", { exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: "Restore", exact: true })).toBeEnabled();
  await row.getByRole("button", { name: "Restore", exact: true }).click();
  await page.getByRole("dialog", { name: "Restore item?", exact: true }).getByRole("button", { name: "Restore", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("navigation", { name: "Settings navigation", exact: true }).getByRole("link", { name: "Plan & usage", exact: true }).click();
  await expect(page.getByText("101 of 100", { exact: true })).toBeVisible();
  await expect(page.getByText("Over limit", { exact: true })).toBeVisible();
  expect(api.requests.filter((request) => request.path === "/subscription").length).toBeGreaterThanOrEqual(2);
});

test("Trash permanently deletes a Resource only after confirmation", async ({ page }) => {
  const api = await mockResourceTrash(page, { trashed: true });
  await page.goto("/settings/trash");
  const row = page.getByRole("article").filter({ hasText: title });
  await row.getByRole("button", { name: "Delete forever", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Delete forever?", exact: true });
  await expect(confirmation).toContainText("This action cannot be undone.");
  expect(api.requests.some((request) => request.method === "DELETE")).toBe(false);
  await confirmation.getByRole("button", { name: "Delete forever", exact: true }).click();
  await expect(row).toHaveCount(0);
  expect(api.requests.some((request) => request.path === `/trash/${trashUuid}` && request.method === "DELETE")).toBe(true);
});

for (const pendingSaveResult of ["success", "validation failure"] as const) {
  test(`deleting a standalone task resource preserves task editing after an in-flight save ${pendingSaveResult}`, async ({ page }) => {
    const api = await mockResourceTrash(page);
    const boardUuid = "40000000-0000-4000-8000-000000000011";
    const taskUuid = "50000000-0000-4000-8000-000000000011";
    const task: BoardTask = {
      uuid: taskUuid, title: "Continue research", description: null,
      priority: "medium", stage: "backlog", position: 0, labels: [], notes: [],
      resources: [{ uuid: resourceUuid, title, areas: [], created_at: null, updated_at: null }],
      created_at: null, updated_at: null,
    };
    const board: Board = {
      uuid: boardUuid, name: "Research board", position: 0, task_count: 1,
      stage_counts: { backlog: 1, todos: 0, in_progress: 0, done: 0 }, labels: [],
      stages: [{ uuid: "backlog", key: "backlog", name: "Backlog", position: 0, task_count: 1, tasks: [task] }],
    };
    const saves: BoardTaskInput[] = [];
    const boardReads: string[] = [];
    let releaseSave!: () => void;
    const firstSave = new Promise<void>((resolve) => { releaseSave = resolve; });
    const isDeleted = () => api.requests.some((request) => request.path === `/resource/${resourceUuid}` && request.method === "DELETE");
    await page.route("**/api-test/v1/notes**", (route) => route.fulfill({ json: { data: [], status: 200, message: "OK" } }));
    await page.route("**/api-test/v1/board**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace("/api-test/v1", "");
      let data: unknown = null;
      let status = 200;
      if (request.method() === "GET") {
        boardReads.push(isDeleted() ? "after deletion" : "before deletion");
        if (isDeleted()) task.resources = [];
        data = path === "/board" ? [board] : board;
      } else if (request.method() === "PUT") {
        const input = request.postDataJSON() as BoardTaskInput;
        saves.push(input);
        if (saves.length === 1) await firstSave;
        const staleResource = isDeleted() && input.resource_uuids.includes(resourceUuid);
        if (staleResource && (saves.length !== 1 || pendingSaveResult === "validation failure")) status = 422;
        else { Object.assign(task, { title: input.title, description: input.description }); data = task; }
      }
      await route.fulfill({ status, json: {
        data, status, message: status === 422 ? "The selected resource is unavailable." : "OK",
        ...(status === 422 ? { errors: { resource_uuids: ["The selected resource is unavailable."] } } : {}),
      } });
    });
    await page.goto("/board");
    await page.getByRole("button", { name: /Continue research/ }).click();
    const titleInput = page.getByRole("textbox", { name: "Task title", exact: true });
    await titleInput.fill("Keep this task draft");
    await page.getByRole("button", { name: new RegExp(title) }).click();
    await expect.poll(() => saves.length).toBe(1);
    const detail = page.getByRole("dialog", { name: "Resource details", exact: true });
    await expect(detail).toBeVisible();
    await detail.getByRole("button", { name: "Delete resource", exact: true }).click();
    await page.getByRole("dialog", { name: "Delete resource?", exact: true }).getByRole("button", { name: "Delete resource", exact: true }).click();
    await expect(detail).toBeHidden();
    await expect.poll(() => boardReads.includes("after deletion")).toBe(true);
    releaseSave();
    await expect(titleInput).toHaveValue("Keep this task draft");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await titleInput.fill("Continue after deleting resource");
    await titleInput.press("Tab");
    await expect.poll(() => saves.some((input) => input.title === "Continue after deleting resource")).toBe(true);
    const finalSave = saves.find((input) => input.title === "Continue after deleting resource")!;
    expect(finalSave.resource_uuids).toEqual([]);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(title) })).toHaveCount(0);
  });
}
