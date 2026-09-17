import { expect, test, type Page } from "@playwright/test";
import type { Letter, LetterExport, LetterPage, LetterExportFormat } from "./type";
import { LETTER_EXPORT_FORMATS } from "./letter-export-formats";

async function fixture(
  page: Page,
  content: string,
  format: LetterExportFormat = "portrait",
  metadata?: { title?: string; subtitle?: string | null },
) {
  let letter: Letter = {
    uuid: "letter-test",
    title: metadata?.title ?? "A measured letter",
    subtitle: metadata?.subtitle ?? null,
    content,
    content_preview: "A measured letter", word_count: 100, read_time_minutes: 1,
    status: "draft", exported_at: null, created_at: null, updated_at: null,
    author: { name: "Test Author", handle: "@author" }, latest_export: null,
  };
  let exported: LetterExport | null = null;
  const updates: LetterPage[][] = [];
  await page.route("**/api-test/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api-test/v1", "");
    const method = route.request().method();
    let data: unknown;
    if (path === "/auth/me") data = { first_name: "Test", last_name: "Author", username: "author", roles: [] };
    else if (path === "/letters" && method === "GET") data = { current_page: 1, data: [letter], last_page: 1, per_page: 15, total: 1 };
    else if (path === "/letters/letter-test") {
      if (method === "PATCH") letter = { ...letter, ...route.request().postDataJSON() };
      data = letter;
    } else if (path === "/letters/letter-test/exports" && method === "POST") {
      const input = route.request().postDataJSON();
      const canvas = LETTER_EXPORT_FORMATS[input.format as LetterExportFormat];
      exported = { uuid: "export-test", letter_uuid: letter.uuid, format: input.format, canvas, status: "ready", is_current: true, pages: normalize(input.pages), page_count: input.pages.length, error: null, created_at: null, updated_at: null, started_at: null, completed_at: null };
      letter = { ...letter, latest_export: exported };
      data = exported;
    } else if (path === "/letters/letter-test/exports/export-test") {
      if (method === "PATCH") {
        const input = route.request().postDataJSON();
        updates.push(input.pages);
        exported = { ...exported!, pages: normalize(input.pages), page_count: input.pages.length };
        letter = { ...letter, title: input.pages[0].title, content: JSON.stringify({ version: 1, blocks: input.pages.slice(1).flatMap((p: LetterPage) => p.blocks) }), latest_export: exported };
        data = { export: exported, letter };
      } else data = exported;
    } else data = [];
    await route.fulfill({ json: { data, status: 200, message: "Saved" } });
  });
  await page.goto("/letters?letter=letter-test");
  await expect(page.getByRole("button", { name: "Prepare pages", exact: true })).toBeVisible();
  if (format !== "portrait") {
    await page.getByRole("combobox", { name: "Export format" }).click();
    await page.getByRole("option", { name: new RegExp(LETTER_EXPORT_FORMATS[format].shortLabel) }).click();
  }
  return { letter: () => letter, exported: () => exported!, updates };
}

test("long cover text auto-fits before the export is created", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    title: "A deliberately long cover title ".repeat(4).trim(),
    subtitle: "Supporting cover copy that should be measured and fitted before page preparation reports an overflow. ".repeat(2).trim(),
  });

  await page.getByRole("button", { name: "Prepare pages", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(state.exported().pages?.[0].text_scale).toBeLessThanOrEqual(1);
});

function normalize(pages: LetterPage[]): LetterPage[] {
  return pages.map((page, index) => ({ ...page, number: index + 1, kind: index === 0 ? "cover" : index === pages.length - 1 ? "final" : "body", signature: index === pages.length - 1 ? { name: "Test Author", handle: "@author" } : null, truncated: false, continuation_label: null }));
}
function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).join("");
  if (!value || typeof value !== "object") return "";
  const object = value as Record<string, unknown>;
  return typeof object.text === "string" ? object.text : text(object.content) + text(object.children);
}
const sentence = "A thoughtful letter fills each page and preserves every word. ";
const document = (repeat: number) => JSON.stringify({ version: 1, blocks: [{ id: "paragraph", type: "paragraph", content: [{ type: "text", text: sentence.repeat(repeat), styles: { bold: true } }] }] });

for (const format of ["portrait", "square", "story", "landscape"] as const) {
  test(`${format}: measured pages preserve text, fit, and reflow with text size`, async ({ page }) => {
    const original = document(100);
    const state = await fixture(page, original, format);
    await page.getByRole("button", { name: "Prepare pages", exact: true }).click();
    await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
    expect(text(state.exported().pages?.slice(1).flatMap((p) => p.blocks))).toBe(text(JSON.parse(original).blocks));
    await page.getByRole("button", { name: "Customize pages", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
    await expect(dialog.locator(".bn-editor")).toBeVisible();
    for (const scale of [140, 70, 100]) {
      const count = state.updates.length;
      await dialog.getByRole("slider", { name: "Text size", exact: true }).evaluate((node, value) => {
        const input = node as HTMLInputElement;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(value));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, scale);
      await expect.poll(() => state.updates.length, { timeout: 60_000 }).toBeGreaterThan(count);
      await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
      expect(text(state.exported().pages?.slice(1).flatMap((p) => p.blocks))).toBe(text(JSON.parse(original).blocks));
      for (const p of state.exported().pages!.slice(1)) {
        await dialog.getByRole("button", { name: `Edit page ${p.number}`, exact: true }).click();
        await expect(dialog.locator(".bn-editor")).toBeVisible();
        await expect.poll(() => dialog.locator(".bn-editor").evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
      }
      await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
    }
  });
}

test("long letters create every page they need without blocking preparation", async ({ page }) => {
  const original = document(250);
  const state = await fixture(page, original, "landscape");
  await page.getByRole("button", { name: "Prepare pages", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  expect(state.exported().pages?.length).toBeGreaterThan(10);
  expect(text(state.exported().pages?.slice(1).flatMap((p) => p.blocks))).toBe(
    text(JSON.parse(original).blocks),
  );
});
