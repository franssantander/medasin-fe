import { expect, test, type Page } from "@playwright/test";
import { idleFocusDashboard } from "@/test-utils/focus-fixture";
import type { Note } from "./type";

test.use({ timezoneId: "Asia/Manila", locale: "en-US", actionTimeout: 15_000 });

const areaUuid = "60000000-0000-4000-8000-000000000001";
const area = {
  id: 1,
  uuid: areaUuid,
  name: "Career",
  slug: "career",
  icon: "Briefcase",
  background: "#000000",
  background_image: null,
  background_image_url: null,
  description: null,
  archived_at: null,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};
const doc = (text: string) =>
  JSON.stringify({
    version: 1,
    blocks: [
      { type: "paragraph", content: [{ type: "text", text, styles: {} }] },
    ],
  });
const makeNote = (
  id: number,
  title: string,
  text: string,
  updatedAt: string,
  extra: Partial<Note> = {},
): Note => ({
  id,
  uuid: "a0000000-0000-4000-8000-" + String(id).padStart(12, "0"),
  area_id: null,
  parent_uuid: null,
  title,
  content: doc(text),
  is_pinned: false,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: updatedAt,
  ...extra,
});
const weekly = makeNote(1, "Weekly planning", "Plan the week ahead.", "2026-10-08T01:19:00Z", {
  is_pinned: true,
});
const checklist = makeNote(2, "Review checklist", "Things to check.", "2026-10-07T03:00:00Z", {
  parent_uuid: weekly.uuid,
});
const ideas = makeNote(3, "Ideas to revisit", "Keep promising ideas here.", "2026-10-08T02:00:00Z");
const reading = makeNote(4, "Reading list", "Books for the autumn.", "2026-09-20T02:00:00Z");
const career = makeNote(5, "Career principles", "Favor high-leverage work.", "2026-10-07T02:00:00Z", {
  area_id: 1,
});

type Request = { method: string; path: string; body: Record<string, unknown> | null };

async function fixture(page: Page, options: { dark?: boolean } = {}) {
  await page.clock.install({ time: new Date("2026-10-08T04:00:00Z") });
  await page.context().addCookies([
    { name: "auth_token", value: "notes-test", url: "http://127.0.0.1:3107" },
  ]);
  await page.addInitScript(
    (dark) => localStorage.setItem("theme", dark ? "dark" : "light"),
    Boolean(options.dark),
  );
  const notes = structuredClone([weekly, checklist, ideas, reading]);
  const areaNotes = structuredClone([career]);
  const requests: Request[] = [];
  const tree = (items: Note[], parent: string | null = null): unknown[] =>
    items
      .filter((item) => item.parent_uuid === parent)
      .map((item) => ({ ...item, children: tree(items, item.uuid) }));

  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace("/api-test/v1", "");
    const body = request.postData()
      ? (request.postDataJSON() as Record<string, unknown>)
      : null;
    requests.push({ method, path, body });
    let data: unknown = null;
    if (path === "/auth/me")
      data = {
        id: 1,
        first_name: "Ada",
        last_name: "Lovelace",
        full_name: "Ada Lovelace",
        username: "ada",
        email: "ada@example.com",
        font_family: "manrope",
      };
    else if (path === "/notifications")
      data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    else if (path === "/focus") data = idleFocusDashboard();
    else if (path === "/area") data = [area];
    else if (path === "/notes/tree") data = tree(notes);
    else if (path === `/area/${areaUuid}/notes/tree`) data = tree(areaNotes);
    else if (path === "/notes" && method === "POST") {
      const created = makeNote(
        100 + notes.length,
        String(body?.title ?? ""),
        "",
        "2026-10-08T04:00:00Z",
        { content: String(body?.content ?? "[]"), parent_uuid: (body?.parent_uuid as string) ?? null },
      );
      notes.push(created);
      data = created;
    } else {
      const list = path.startsWith("/area/") ? areaNotes : notes;
      const index = list.findIndex((item) => path.endsWith(item.uuid));
      if (index >= 0) {
        if (method === "PATCH" || method === "PUT") {
          list[index] = {
            ...list[index],
            ...body,
            ...("title" in (body ?? {}) ? { updated_at: "2026-10-08T04:00:00Z" } : {}),
          } as Note;
        }
        if (method === "DELETE") {
          list.splice(index, 1);
          data = null;
        } else data = list[index];
      }
    }
    await route.fulfill({ json: { data, status: 200, message: "Saved." } });
  });
  await page.goto("/notes");
  await expect(
    page.getByRole("textbox", { name: "Note title", exact: true }),
  ).toBeVisible();
  return { requests };
}

const list = (page: Page) =>
  page.getByRole("navigation", { name: "Notes list", exact: true });
const row = (page: Page, title: string) =>
  list(page).getByRole("button", { name: new RegExp("^(Pinned\\. )?" + title) });
const titleBox = (page: Page) =>
  page.getByRole("textbox", { name: "Note title", exact: true });
const section = (page: Page, label: string) =>
  list(page).locator("section", {
    has: page.getByRole("heading", { name: label, exact: true }),
  });

test("notes are grouped by time and open as a page", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fixture(page);
  await expect(list(page).getByRole("heading")).toHaveText([
    "Pinned",
    "Today",
    "Yesterday",
    "Earlier",
  ]);
  await expect(section(page, "Pinned")).toContainText("Weekly planning");
  await expect(section(page, "Today")).toContainText("Ideas to revisit");
  await expect(section(page, "Yesterday")).toContainText("Career principles");
  await expect(section(page, "Earlier")).toContainText("Reading list");
  await expect(row(page, "Career principles")).toContainText("Career");
  await expect(titleBox(page)).toHaveValue("Weekly planning");

  await row(page, "Career principles").click();
  await expect(titleBox(page)).toHaveValue("Career principles");
  await expect(row(page, "Career principles")).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("navigation", { name: "Note breadcrumb" }),
  ).toContainText("Career");
  await expect(page.getByRole("toolbar", { name: "Note formatting" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("notes-desktop.png") });
});

test("sub-pages fold under their parent", async ({ page }) => {
  await fixture(page);
  await expect(list(page).getByRole("button", { name: /^Review checklist/ })).toHaveCount(0);
  await list(page)
    .getByRole("button", { name: "Show pages in Weekly planning", exact: true })
    .click();
  await list(page).getByRole("button", { name: /^Review checklist/ }).click();
  await expect(titleBox(page)).toHaveValue("Review checklist");
  await expect(
    page.getByRole("navigation", { name: "Note breadcrumb" }),
  ).toContainText("Weekly planning");
});

test("search finds titles and text, shows where a page lives and clears with Escape", async ({
  page,
}) => {
  await fixture(page);
  const search = page.getByRole("searchbox", { name: "Search notes" });
  await search.fill("promising");
  await expect(list(page).getByText("1 result", { exact: true })).toBeVisible();
  await expect(row(page, "Ideas to revisit")).toBeVisible();
  await search.fill("checklist");
  await expect(row(page, "Review checklist")).toContainText("in Weekly planning");
  await search.fill("zzz");
  await expect(list(page).getByText("No notes match “zzz”.")).toBeVisible();
  await search.press("Escape");
  await expect(search).toHaveValue("");
  await expect(list(page).getByRole("heading", { name: "Pinned" })).toBeVisible();
});

test("the row menu pins and deletes notes", async ({ page }) => {
  const state = await fixture(page);
  await row(page, "Reading list").hover();
  await list(page)
    .getByRole("button", { name: "More actions for Reading list", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Pin to top" }).click();
  await expect(section(page, "Pinned")).toContainText("Reading list");
  expect(
    state.requests.find(
      (request) => request.method === "PATCH" && request.path.endsWith(reading.uuid),
    )?.body,
  ).toMatchObject({ is_pinned: true });

  await row(page, "Ideas to revisit").hover();
  await list(page)
    .getByRole("button", { name: "More actions for Ideas to revisit", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete “Ideas to revisit”?" });
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row(page, "Ideas to revisit")).toHaveCount(0);
});

test("a new note starts empty and lands under Today once named", async ({ page }) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "New note", exact: true }).click();
  await expect(titleBox(page)).toBeFocused();
  await expect(titleBox(page)).toHaveValue("");
  await titleBox(page).fill("Groceries");
  await expect(section(page, "Today")).toContainText("Groceries");
  expect(
    state.requests.some(
      (request) => request.method === "POST" && request.path === "/notes",
    ),
  ).toBe(true);
});

test("the list collapses, remembers it and comes back", async ({ page }) => {
  await fixture(page);
  await page.getByRole("button", { name: "Collapse notes list", exact: true }).click();
  await expect(list(page)).toHaveCount(0);
  await page.reload();
  await expect(titleBox(page)).toBeVisible();
  await expect(list(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Open notes list", exact: true }).click();
  await expect(list(page)).toBeVisible();
});

for (const dark of [false, true]) {
  test("phone opens the list in a sheet" + (dark ? " dark" : ""), async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fixture(page, { dark });
    await expect(titleBox(page)).toHaveValue("Weekly planning");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: "Show notes", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Notes" });
    await expect(sheet).toBeVisible();
    await sheet.evaluate((element) =>
      Promise.all(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      ),
    );
    await page.screenshot({ path: testInfo.outputPath("notes-mobile-list.png") });
    await sheet.getByRole("button", { name: /^Career principles/ }).click();
    await expect(sheet).not.toBeVisible();
    await expect(titleBox(page)).toHaveValue("Career principles");
    await page.screenshot({ path: testInfo.outputPath("notes-mobile.png") });
  });
}

test("dark desktop", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fixture(page, { dark: true });
  await expect(titleBox(page)).toHaveValue("Weekly planning");
  await page.screenshot({ path: testInfo.outputPath("notes-desktop-dark.png") });
});
