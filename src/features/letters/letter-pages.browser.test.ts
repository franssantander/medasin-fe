import { expect, test, type Page } from "@playwright/test";
import type { Letter, LetterExport, LetterPage, LetterExportFormat } from "./type";
import { LETTER_EXPORT_FORMATS } from "./letter-export-formats";

async function fixture(
  page: Page,
  content: string,
  format: LetterExportFormat = "portrait",
  metadata?: {
    title?: string;
    subtitle?: string | null;
    updateDelayMs?: number;
  },
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
        if (metadata?.updateDelayMs) {
          await new Promise((resolve) =>
            setTimeout(resolve, metadata.updateDelayMs),
          );
        }
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
  if (format !== "portrait") {
    const formatSelect = page.getByRole("combobox", { name: "Export format" });
    await expect(formatSelect).toBeEnabled({ timeout: 60_000 });
    await formatSelect.click();
    await page.getByRole("option", { name: new RegExp(LETTER_EXPORT_FORMATS[format].shortLabel) }).click();
  }
  return { letter: () => letter, exported: () => exported!, updates };
}

test("long cover text auto-fits before the export is created", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    title: "A deliberately long cover title ".repeat(4).trim(),
    subtitle: "Supporting cover copy that should continue onto generated pages without changing the original letter body. ".repeat(35).trim(),
  });

  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(state.exported().pages?.[0].text_scale).toBeLessThanOrEqual(1);
  expect(state.exported().pages?.[1].content_source).toBe("cover_entry");
  expect(
    state.exported().pages?.filter(
      (item) => item.content_source === "cover_entry" && item.layout !== "cover",
    ).length,
  ).toBeGreaterThan(0);
  expect(
    text(
      state.exported().pages
        ?.filter((item) => item.content_source !== "cover_entry")
        .flatMap((item) => item.blocks),
    ),
  ).toBe(text(JSON.parse(document(2)).blocks));
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

test("letter text accepts a space immediately after a colon", async ({ page }) => {
  const state = await fixture(page, document(1));
  const editor = page.locator(
    '.letter-composer-document [contenteditable="true"]',
  );
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await editor.fill("reliable:how well");
  await editor.press("Home");
  await editor.press("ArrowRight");
  await editor.press("ArrowRight");
  await editor.press("ArrowRight");
  await editor.press("ArrowRight");
  await editor.press("ArrowRight");
  await editor.press("ArrowRight");
  await editor.press("ArrowRight");
  await editor.press("ArrowRight");
  await editor.press("ArrowRight");
  await editor.press("Space");

  await expect(editor).toContainText("reliable: how well");
  await expect
    .poll(() => text(JSON.parse(state.letter().content).blocks), {
      timeout: 60_000,
    })
    .toContain("reliable: how well");
});

test("letters use a persistent CMS toolbar and editorial typography", async ({
  page,
}) => {
  const state = await fixture(
    page,
    JSON.stringify({
      version: 1,
      blocks: [{ id: "paragraph", type: "paragraph", content: [] }],
    }),
  );
  const toolbar = page.getByRole("toolbar", {
    name: "Letter formatting",
  });
  const title = page.getByRole("textbox", { name: "Letter title" });
  const description = page.getByRole("textbox", {
    name: "Letter subtitle",
  });
  const editor = page.locator(
    '.letter-composer-document [contenteditable="true"]',
  );

  await expect(toolbar).toBeVisible({ timeout: 60_000 });
  await expect(toolbar.getByRole("button", { name: "Bold" })).toBeVisible();
  await expect(
    toolbar.getByRole("button", { name: "Insert image" }),
  ).toBeVisible();
  await expect(title).toHaveCSS("font-family", /Spectral/);
  await expect(title).toHaveCSS("font-size", "48px");
  await expect(description).toHaveCSS("font-size", "20px");
  await expect(editor).toHaveCSS("font-size", "16px");

  await editor.click();
  await toolbar.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type("A formatted letter body");

  await expect
    .poll(() => state.letter().content, { timeout: 60_000 })
    .toContain('"bold":true');

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(title).toHaveCSS("font-size", "36px");
  expect(
    await page.evaluate(() => window.document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

for (const format of ["portrait", "square", "story", "landscape"] as const) {
  test(`${format}: measured pages preserve text, fit, and reflow with text size`, async ({ page }) => {
    const original = document(100);
    const state = await fixture(page, original, format);
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
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  expect(state.exported().pages?.length).toBeGreaterThan(10);
  const nextPage = page.getByRole("button", { name: "View next page" });
  const previousPage = page.getByRole("button", {
    name: "View previous page",
  });
  await expect(previousPage).toBeDisabled();
  await nextPage.click();
  await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible();
  await expect(previousPage).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "View page 2" }),
  ).toHaveAttribute("aria-current", "page");
  expect(text(state.exported().pages?.slice(1).flatMap((p) => p.blocks))).toBe(
    text(JSON.parse(original).blocks),
  );
});

test("the page workspace closes while pending edits save", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    updateDelayMs: 1_500,
  });
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await page
    .getByRole("button", { name: "Customize pages", exact: true })
    .click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Subheader" }).fill("CLOSE NOW");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();

  await expect(dialog).toBeHidden({ timeout: 500 });
  await expect
    .poll(() => state.updates.length, { timeout: 60_000 })
    .toBeGreaterThan(0);
  expect(state.exported().pages?.[0].cover?.subheader).toBe("CLOSE NOW");
  expect(
    state.updates.at(-1)?.slice(1).every((page) => !("cover" in page)),
  ).toBe(true);
});

test("body text survives autosave, page changes, and an immediate close", async ({ page }) => {
  const state = await fixture(page, document(2));
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const bodyEditor = dialog.locator(
    'main .letter-page-document [contenteditable="true"]',
  );
  await bodyEditor.fill("A page draft that must survive autosave.");

  await expect
    .poll(() => state.updates.length, { timeout: 60_000 })
    .toBeGreaterThan(0);
  await expect(bodyEditor).toContainText("A page draft that must survive autosave.");

  await dialog.getByRole("button", { name: "Edit page 1", exact: true }).click();
  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(bodyEditor).toContainText("A page draft that must survive autosave.");

  await bodyEditor.press("End");
  await bodyEditor.pressSequentially(" Final words.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 500 });
  await expect
    .poll(
      () => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)),
      { timeout: 60_000 },
    )
    .toContain("A page draft that must survive autosave. Final words.");
});

test("cover controls persist theme, branding, and author metadata", async ({ page }) => {
  const state = await fixture(page, document(2));
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("combobox", { name: "Background" }).click();
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await dialog.getByRole("switch", { name: "Show Medasin logo" }).click();
  await dialog.getByRole("textbox", { name: "Subheader" }).fill("CIPER DATASETS");
  await dialog.getByRole("textbox", { name: "Author name" }).fill("Ciper");
  await expect(dialog.getByRole("button", { name: "Reorder Title" })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Reorder Cover body text" }),
  ).toBeVisible();
  const coverBody = dialog.locator(
    'main .letter-cover-description [contenteditable="true"]',
  );
  await coverBody.fill("A formatted cover description");
  await coverBody.click();
  await coverBody.press("End");
  await coverBody.pressSequentially("/");
  const slashMenu = page.getByRole("listbox", { name: "Insert block" });
  await expect(slashMenu).toBeVisible();
  await page.waitForTimeout(1_000);
  await expect(slashMenu).toBeVisible();
  await expect(slashMenu.getByText("Image", { exact: true })).toHaveCount(0);
  await expect(slashMenu.getByText("Video", { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await coverBody.press("Backspace");

  await expect(
    dialog.locator('[data-cover-section="author"]'),
  ).toHaveClass(/mt-auto/);

  await expect.poll(() => state.updates.length, { timeout: 60_000 }).toBeGreaterThan(0);
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  const cover = state.exported().pages?.[0].cover;
  expect(cover?.theme).toBe("dark");
  expect(cover?.show_logo).toBe(false);
  expect(cover?.subheader).toBe("CIPER DATASETS");
  expect(state.letter().subtitle).toBe("A formatted cover description");
  expect(cover?.description_blocks).toBeTruthy();
  expect(cover?.author_name).toBe("Ciper");

  await dialog
    .getByText("Landscape cover image", { exact: true })
    .locator("..")
    .locator('input[type="file"]')
    .setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  const cropDialog = page.getByRole("dialog", { name: "Crop cover image" });
  await expect(cropDialog).toBeVisible();
  await expect(cropDialog.getByRole("button", { name: "4:5" })).toBeVisible();
  await expect(cropDialog.getByRole("button", { name: "9:16" })).toBeVisible();
  await cropDialog.getByRole("button", { name: "Cancel" }).click();
});
