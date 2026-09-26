import { expect, test, type Locator, type Page } from "@playwright/test";
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
    initialHeroImageUrl?: string;
    initialHeroAspectRatio?: number;
    initialCoverDescriptionBlocks?: unknown[];
    invalidateExportOnLetterUpdate?: boolean;
    rejectMediaUploadNumber?: number;
    legacyCaptionPlacement?: boolean;
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
  let mediaUploads = 0;
  await page.route(/\/storage\/(?:existing-cover|uploaded-cover-\d+)\.png$/, async (route) => {
    await route.fulfill({ body: testCoverPng, contentType: "image/png" });
  });
  await page.route("**/api-test/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api-test/v1", "");
    const method = route.request().method();
    let data: unknown;
    if (path === "/auth/me") data = { first_name: "Test", last_name: "Author", username: "author", roles: [] };
    else if (path === "/letters" && method === "GET") data = { current_page: 1, data: [letter], last_page: 1, per_page: 15, total: 1 };
    else if (path === "/letters/letter-test") {
      if (method === "PATCH") {
        const previousContent = letter.content;
        letter = { ...letter, ...route.request().postDataJSON() };
        if (
          metadata?.invalidateExportOnLetterUpdate &&
          exported &&
          previousContent !== letter.content
        ) {
          exported = { ...exported, is_current: false };
          letter = { ...letter, latest_export: exported };
        }
      }
      data = letter;
    } else if (path === "/letters/letter-test/exports" && method === "POST") {
      const input = route.request().postDataJSON();
      const canvas = LETTER_EXPORT_FORMATS[input.format as LetterExportFormat];
      const pages = normalize(input.pages);
      if (metadata?.initialCoverDescriptionBlocks && pages[0]?.cover) {
        pages[0] = {
          ...pages[0],
          cover: {
            ...pages[0].cover,
            description_blocks: metadata.initialCoverDescriptionBlocks,
          },
        };
      }
      if (metadata?.initialHeroImageUrl && pages[0]?.cover) {
        pages[0] = {
          ...pages[0],
          cover: {
            ...pages[0].cover,
            hero_image_url: metadata.initialHeroImageUrl,
            hero_image_aspect_ratio:
              metadata.initialHeroAspectRatio ?? 16 / 9,
          },
        };
      }
      if (metadata?.legacyCaptionPlacement && pages[0]?.cover) {
        pages[0].cover.hero_image_caption = "An older image caption";
        Reflect.deleteProperty(pages[0].cover, "hero_image_caption_placement");
      }
      exported = { uuid: "export-test", letter_uuid: letter.uuid, format: input.format, canvas, status: "ready", is_current: true, pages, page_count: pages.length, error: null, created_at: null, updated_at: null, started_at: null, completed_at: null };
      letter = { ...letter, latest_export: exported };
      data = exported;
    } else if (path === "/letters/letter-test/media" && method === "POST") {
      mediaUploads += 1;
      if (mediaUploads === metadata?.rejectMediaUploadNumber) {
        await route.fulfill({
          status: 422,
          json: {
            message:
              "The submitted information contains errors. Please review the highlighted fields and try again.",
            errors: { file: ["The replacement image could not be saved."] },
          },
        });
        return;
      }
      data = { url: `/storage/uploaded-cover-${mediaUploads}.png` };
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
        letter = { ...letter, title: input.pages[0].title, subtitle: input.pages[0].subtitle, content: JSON.stringify({ version: 1, blocks: input.pages.slice(1).flatMap((p: LetterPage) => p.blocks) }), latest_export: exported };
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
  return {
    letter: () => letter,
    exported: () => exported!,
    mediaUploads: () => mediaUploads,
    updates,
  };
}

async function expectCoverColumnAlignment(
  canvas: Locator,
  captionPlacement: "overlay" | "below",
) {
  await expect(canvas.locator('[data-cover-section="hero"]')).toHaveAttribute(
    "data-caption-placement",
    captionPlacement,
  );
  const geometry = await canvas.evaluate((element) => {
    const bounds = (selector: string) => {
      const match = element.querySelector(selector);
      if (!match) throw new Error(`Cover element is missing: ${selector}`);
      const { left, right, top, bottom, width, height } = match.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const logo = bounds('[data-cover-section="author"] img[alt="Medasin"]');
    const image = element.querySelector<HTMLElement>(
      "[data-cover-hero-image] img",
    );
    if (!image) throw new Error("Cover image is missing");

    return {
      canvasHeight: element.getBoundingClientRect().height,
      main: bounds("[data-cover-main]"),
      header: bounds('[data-cover-section="header"]'),
      title: bounds('[data-cover-section="title"]'),
      entry: bounds('[data-cover-section="entry"]'),
      hero: bounds('[data-cover-section="hero"]'),
      image: bounds("[data-cover-hero-image]"),
      imageElement: bounds("[data-cover-hero-image] img"),
      caption: bounds("[data-cover-hero-caption]"),
      author: bounds('[data-cover-section="author"]'),
      authorName: bounds('[data-cover-section="author"] p'),
      logoVisibleRight: logo.right - (logo.width * 7) / 135,
      imageObjectFit: getComputedStyle(image).objectFit,
      imageObjectPosition: getComputedStyle(image).objectPosition,
    };
  });

  expect(geometry.header.width / geometry.main.width).toBeCloseTo(0.92, 2);
  for (const [name, bounds] of Object.entries({
    title: geometry.title,
    entry: geometry.entry,
    hero: geometry.hero,
    image: geometry.image,
    caption: geometry.caption,
    author: geometry.author,
  })) {
    expect(Math.abs(bounds.left - geometry.header.left), `${name} left edge`).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds.right - geometry.header.right), `${name} right edge`).toBeLessThanOrEqual(1);
  }
  expect(Math.abs(geometry.authorName.left - geometry.header.left), "author left edge").toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.logoVisibleRight - geometry.header.right), "visible logo right edge").toBeLessThanOrEqual(1);
  expect(geometry.imageObjectFit).toBe("cover");
  expect(geometry.imageObjectPosition).toBe("50% 50%");
  expect(Math.abs(geometry.imageElement.width - geometry.image.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.imageElement.height - geometry.image.height)).toBeLessThanOrEqual(1);
  expect(geometry.image.height / geometry.canvasHeight).toBeLessThanOrEqual(
    captionPlacement === "below" ? 0.33 : 0.43,
  );
  if (captionPlacement === "below") {
    expect(geometry.caption.top).toBeGreaterThanOrEqual(geometry.image.bottom);
    expect(
      geometry.caption.bottom,
      `Below-image caption must fit within the cover main: ${JSON.stringify({
        main: geometry.main,
        hero: geometry.hero,
        image: geometry.image,
        caption: geometry.caption,
      })}`,
    ).toBeLessThanOrEqual(geometry.main.bottom + 1);
  } else {
    expect(geometry.caption.bottom).toBeLessThanOrEqual(geometry.image.bottom + 1);
    expect(geometry.caption.top).toBeGreaterThanOrEqual(geometry.image.top - 1);
  }
  return geometry;
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

test("long cover text crops the image height without resizing the typography", async ({
  page,
}) => {
  const state = await fixture(page, document(2), "portrait", {
    initialHeroImageUrl: "http://localhost/storage/existing-cover.png",
    initialHeroAspectRatio: 16 / 9,
  });

  const customizePages = page.getByRole("button", {
    name: "Customize pages",
    exact: true,
  });
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(customizePages).toBeVisible({ timeout: 60_000 });
  await customizePages.click();

  const dialog = page.getByRole("dialog", { name: "Prepare social pages" });
  const coverCanvas = dialog.locator('main [data-page-layout="cover"]');
  const coverHero = coverCanvas.locator('[data-cover-section="hero"]');
  const coverBody = dialog.locator(
    'main .letter-cover-description [contenteditable="true"]',
  );
  await expect(coverHero).toBeVisible();
  await expect(coverBody).toBeVisible();

  const initialMetrics = await coverHero.evaluate((element) => {
    const canvas = element.closest<HTMLElement>("[data-page-canvas]");
    if (!canvas) throw new Error("Cover canvas is missing");
    const bounds = element.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    return {
      width: bounds.width / canvasBounds.width,
      height: bounds.height / canvasBounds.height,
    };
  });
  const initialScale = state.exported().pages?.[0].text_scale;
  const updateCount = state.updates.length;

  await coverBody.fill(sentence.repeat(120));

  await expect
    .poll(() => state.updates.length, { timeout: 60_000 })
    .toBeGreaterThan(updateCount);
  await expect
    .poll(
      () =>
        state
          .exported()
          .pages?.some(
            (item) =>
              item.layout !== "cover" &&
              item.content_source === "cover_entry",
          ) ?? false,
      { timeout: 60_000 },
    )
    .toBe(true);
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();

  expect(state.exported().pages?.[0].text_scale).toBe(initialScale);
  const finalMetrics = await coverHero.evaluate((element) => {
    const canvas = element.closest<HTMLElement>("[data-page-canvas]");
    if (!canvas) throw new Error("Cover canvas is missing");
    const bounds = element.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    return {
      width: bounds.width / canvasBounds.width,
      height: bounds.height / canvasBounds.height,
    };
  });
  expect(finalMetrics.width).toBeCloseTo(initialMetrics.width, 3);
  expect(finalMetrics.height).toBeLessThan(initialMetrics.height);
  expect(finalMetrics.height).toBeGreaterThanOrEqual(0.119);

  const settledHeights = await coverHero.evaluate(async (element) => {
    const canvas = element.closest<HTMLElement>("[data-page-canvas]");
    if (!canvas) throw new Error("Cover canvas is missing");
    const heights: number[] = [];
    for (let frame = 0; frame < 12; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      heights.push(
        element.getBoundingClientRect().height /
          canvas.getBoundingClientRect().height,
      );
    }
    return heights;
  });
  expect(Math.max(...settledHeights) - Math.min(...settledHeights)).toBeLessThan(
    0.002,
  );
});

function normalize(pages: LetterPage[]): LetterPage[] {
  return pages.map((page, index) => ({ ...page, number: index + 1, kind: index === 0 ? "cover" : index === pages.length - 1 ? "final" : "body", signature: index === pages.length - 1 ? page.signature ?? { name: "Test Author", handle: "@author" } : null, truncated: false, continuation_label: null }));
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
const mixedFormattingDocument = JSON.stringify({ version: 1, blocks: [{ id: "paragraph", type: "paragraph", content: [
  { type: "text", text: "Lorem Ipsum", styles: { bold: true } },
  { type: "text", text: "is", styles: {} },
] }] });
const boldOnlyDocument = JSON.stringify({ version: 1, blocks: [{ id: "paragraph", type: "paragraph", content: [
  { type: "text", text: "Lorem Ipsumis", styles: { bold: true } },
] }] });
const unformattedDocument = JSON.stringify({ version: 1, blocks: [{ id: "paragraph", type: "paragraph", content: "Lorem Ipsumis" }] });

async function typeSpaceAfterBold(page: Page, editor: ReturnType<Page["locator"]>) {
  await editor.focus();
  await editor.locator("strong").first().evaluate((bold) => {
    const lastText = bold.lastChild;
    if (!lastText || lastText.nodeType !== Node.TEXT_NODE) {
      throw new Error("Expected bold text at the formatting boundary");
    }
    const range = window.document.createRange();
    range.setStart(lastText, lastText.textContent?.length ?? 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.keyboard.press("Space");
}

async function selectPageEditorText(
  editor: ReturnType<Page["locator"]>,
  start: number,
  end: number,
) {
  await editor.locator(".bn-block-content").first().evaluate(
    (block, rangeOffsets) => {
      const walker = window.document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

      const locate = (offset: number) => {
        let remaining = offset;
        for (const node of textNodes) {
          const length = node.textContent?.length ?? 0;
          if (remaining <= length) return { node, offset: remaining };
          remaining -= length;
        }
        const last = textNodes.at(-1);
        if (!last) throw new Error("Expected page editor text");
        return { node: last, offset: last.textContent?.length ?? 0 };
      };

      const from = locate(rangeOffsets.start);
      const to = locate(rangeOffsets.end);
      const range = window.document.createRange();
      range.setStart(from.node, from.offset);
      range.setEnd(to.node, to.offset);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    },
    { start, end },
  );
}

async function preparePageEditor(page: Page, content: string) {
  const state = await fixture(page, content);
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = dialog.locator('main [data-page-canvas] .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  return { state, dialog, editor };
}

async function formatPrefixAndInsertSpace(
  page: Page,
  dialog: Locator,
  editor: Locator,
  style: string,
  markSelector: string,
) {
  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  const toolbarButton = dialog.locator(`.bn-toolbar [data-test="${style}"]`);
  await expect(toolbarButton).toBeVisible();
  await toolbarButton.click();

  const markedText = editor.locator(markSelector).first();
  await expect(markedText).toContainText("Lorem Ipsum");
  const boundary = await markedText.evaluate((element) => {
    const range = window.document.createRange();
    const walker = window.document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode && walker.nextNode()) textNode = walker.currentNode;
    if (!textNode) throw new Error("Expected formatted text");
    range.setStart(textNode, textNode.textContent?.length ?? 0);
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    return { x: rect.x, y: rect.y + rect.height / 2 };
  });

  await page.mouse.click(boundary.x, boundary.y);
  await page.keyboard.press("Space");
  await expect(editor).toContainText("Lorem Ipsum is");
}

test("letter editor keeps spaces typed between bold and plain text", async ({ page }) => {
  const state = await fixture(page, mixedFormattingDocument);
  const editor = page.locator('.letter-composer-document [contenteditable="true"]');
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await typeSpaceAfterBold(page, editor);
  await expect(editor).toContainText("Lorem Ipsum is");
  await expect.poll(() => text(JSON.parse(state.letter().content).blocks), { timeout: 60_000 }).toBe("Lorem Ipsum is");
});

test("a new letter keeps its editor and caret through the first autosave", async ({
  page,
}) => {
  let savedLetter: Letter | undefined;
  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api-test/v1",
      "",
    );
    const method = route.request().method();
    let data: unknown = [];

    if (path === "/auth/me") {
      data = {
        first_name: "Test",
        last_name: "Author",
        username: "author",
        roles: [],
      };
    } else if (path === "/letters" && method === "GET") {
      data = {
        current_page: 1,
        data: savedLetter ? [savedLetter] : [],
        last_page: 1,
        per_page: 15,
        total: savedLetter ? 1 : 0,
      };
    } else if (path === "/letters" && method === "POST") {
      const input = route.request().postDataJSON();
      savedLetter = {
        ...input,
        uuid: "created-letter",
        content_preview: "Opening thought",
        word_count: 2,
        read_time_minutes: 1,
        status: "draft",
        exported_at: null,
        created_at: null,
        updated_at: null,
        author: { name: "Test Author", handle: "@author" },
        latest_export: null,
      };
      data = savedLetter;
    } else if (path === "/letters/created-letter") {
      if (method === "PATCH") {
        savedLetter = { ...savedLetter!, ...route.request().postDataJSON() };
      }
      data = savedLetter;
    }

    await route.fulfill({ json: { data, status: 200, message: "Saved" } });
  });

  await page.goto("/letters");
  const editor = page.locator(
    '.letter-composer-document .bn-editor[contenteditable="true"]',
  );
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await editor.click();
  await page.keyboard.type("Opening thought");
  await expect(editor).toContainText("Opening thought");
  await editor.evaluate((node) =>
    Reflect.set(window, "letterEditorBeforeFirstSave", node),
  );

  await expect(page).toHaveURL(/\/letters\?letter=created-letter$/, {
    timeout: 60_000,
  });
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  expect(
    await editor.evaluate(
      (node) => Reflect.get(window, "letterEditorBeforeFirstSave") === node,
    ),
  ).toBe(true);
  expect(await editor.evaluate((node) => node.contains(window.document.activeElement))).toBe(
    true,
  );

  await page.keyboard.type(" after save");
  await expect(editor).toContainText("Opening thought after save");
  await expect
    .poll(() => text(JSON.parse(savedLetter?.content ?? "{}").blocks), {
      timeout: 60_000,
    })
    .toContain("Opening thought after save");

  await page.getByRole("button", { name: "Letters" }).click();
  await expect(page.locator('button[aria-current="page"]')).toContainText(
    "Untitled letter",
  );
});

test("letter preview follows the latest formatted editor text", async ({ page }) => {
  const state = await fixture(page, mixedFormattingDocument, "portrait", {
    invalidateExportOnLetterUpdate: true,
  });
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await page
    .getByRole("dialog", { name: "Preview letter pages" })
    .getByRole("button", { name: "Close", exact: true })
    .click();

  const editor = page.locator('.letter-composer-document [contenteditable="true"]');
  await typeSpaceAfterBold(page, editor);
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect
    .poll(() => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)), {
      timeout: 60_000,
    })
    .toBe("Lorem Ipsum is");
  await page.getByRole("button", { name: "View page 2" }).click();

  const preview = page.locator(
    '[aria-label="Letter export preview"] [data-page-canvas]',
  );
  await expect(preview).toContainText("Lorem Ipsum is");
  await expect(preview.locator("strong")).toContainText("Lorem Ipsum");
});

test("page editor keeps formatted-boundary spaces after reflow and save", async ({ page }) => {
  const state = await fixture(page, mixedFormattingDocument);
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = dialog.locator('main [data-page-canvas] .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await typeSpaceAfterBold(page, editor);
  await expect(editor).toContainText("Lorem Ipsum is");
  await expect.poll(() => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)), { timeout: 60_000 }).toBe("Lorem Ipsum is");
  await expect(editor).toContainText("Lorem Ipsum is");
  await page.keyboard.type("again");
  await expect(editor).toContainText("Lorem Ipsum againis");
  await expect.poll(() => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)), { timeout: 60_000 }).toBe("Lorem Ipsum againis");
});

test("page preview matches formatted text entered in the page editor", async ({ page }) => {
  const { state, dialog, editor } = await preparePageEditor(
    page,
    unformattedDocument,
  );
  await formatPrefixAndInsertSpace(page, dialog, editor, "bold", "strong");
  await expect
    .poll(
      () => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)),
      { timeout: 60_000 },
    )
    .toBe("Lorem Ipsum is");

  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Prepare social pages" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "View page 2" }).click();

  const preview = page.locator(
    '[aria-label="Letter export preview"] [data-page-canvas]',
  );
  await expect(preview).toContainText("Lorem Ipsum is");
  await expect(preview.locator("strong")).toContainText("Lorem Ipsum");
});

test("cover editor keeps a space between bold and plain text", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    initialCoverDescriptionBlocks: JSON.parse(mixedFormattingDocument).blocks,
  });
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const editor = page.getByRole("dialog").locator('main .letter-cover-description .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await typeSpaceAfterBold(page, editor);
  await expect(editor).toContainText("Lorem Ipsum is");
  await expect.poll(() => text(state.exported().pages?.[0].cover?.description_blocks), { timeout: 60_000 }).toBe("Lorem Ipsum is");
});

test("clicking beside bold page text allows inserting a space", async ({ page }) => {
  const state = await fixture(page, mixedFormattingDocument);
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = dialog.locator('main [data-page-canvas] .bn-editor[contenteditable="true"]');
  const boundary = await editor.locator("strong").first().evaluate((bold) => {
    const text = bold.lastChild;
    if (!text) throw new Error("Expected bold text");
    const range = window.document.createRange();
    range.setStart(text, text.textContent?.length ?? 0);
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    return { x: rect.x, y: rect.y + rect.height / 2 };
  });
  const plainTextX = () => editor.locator("strong").first().evaluate((bold) => {
    const plainText = bold.nextSibling;
    if (!plainText || plainText.nodeType !== Node.TEXT_NODE) throw new Error("Expected plain text after bold text");
    const range = window.document.createRange();
    range.setStart(plainText, 0);
    range.setEnd(plainText, 1);
    return range.getBoundingClientRect().x;
  });
  const beforeX = await plainTextX();
  await page.mouse.click(boundary.x, boundary.y);
  await page.keyboard.press("Space");
  await expect(editor).toContainText("Lorem Ipsum is");
  expect(await plainTextX()).toBeGreaterThan(beforeX + 1);
  await expect.poll(() => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)), { timeout: 60_000 }).toBe("Lorem Ipsum is");
});

for (const { label, style, mark } of [
  { label: "bold", style: "bold", mark: "strong" },
  { label: "italic", style: "italic", mark: "em" },
  { label: "underline", style: "underline", mark: "u" },
  { label: "strikethrough", style: "strike", mark: "s" },
]) {
  test(`page toolbar ${label} keeps spaces between formatted text`, async ({ page }) => {
    const { state, dialog, editor } = await preparePageEditor(
      page,
      unformattedDocument,
    );
    await formatPrefixAndInsertSpace(page, dialog, editor, style, mark);
    await expect
      .poll(
        () => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)),
        { timeout: 60_000 },
      )
      .toBe("Lorem Ipsum is");
    await expect(editor.locator(mark)).toContainText("Lorem Ipsum");
  });
}

test("page toolbar combined styles keep spaces in formatted text", async ({ page }) => {
  const { state, dialog, editor } = await preparePageEditor(
    page,
    unformattedDocument,
  );
  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  await expect(dialog.locator('.bn-toolbar [data-test="bold"]')).toBeVisible();
  await dialog.locator('.bn-toolbar [data-test="bold"]').click();
  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  await expect(dialog.locator('.bn-toolbar [data-test="underline"]')).toBeVisible();
  await dialog.locator('.bn-toolbar [data-test="underline"]').click();

  const markedText = editor.locator("strong").first();
  await expect(markedText.locator("u")).toContainText("Lorem Ipsum");
  const boundary = await markedText.evaluate((element) => {
    const range = window.document.createRange();
    const walker = window.document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode && walker.nextNode()) textNode = walker.currentNode;
    if (!textNode) throw new Error("Expected formatted text");
    range.setStart(textNode, textNode.textContent?.length ?? 0);
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    return { x: rect.x, y: rect.y + rect.height / 2 };
  });
  await page.mouse.click(boundary.x, boundary.y);
  await page.keyboard.press("Space");

  await expect(editor).toContainText("Lorem Ipsum is");
  await expect.poll(
    () => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)),
    { timeout: 60_000 },
  ).toBe("Lorem Ipsum is");
  await expect(markedText.locator("u")).toContainText("Lorem Ipsum");
});

test("cover toolbar formatting keeps spaces in cover text", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    initialCoverDescriptionBlocks: JSON.parse(unformattedDocument).blocks,
  });
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const editor = dialog.locator('main .letter-cover-description .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await formatPrefixAndInsertSpace(page, dialog, editor, "underline", "u");
  await expect.poll(
    () => text(state.exported().pages?.[0].cover?.description_blocks),
    { timeout: 60_000 },
  ).toBe("Lorem Ipsum is");
});

test("quote page toolbar formatting keeps spaces in quote text", async ({ page }) => {
  const { state, dialog } = await preparePageEditor(page, unformattedDocument);
  const canvas = dialog.locator("main [data-page-canvas]");
  await dialog.getByRole("combobox", { name: "Page layout" }).click();
  await page.getByRole("option", { name: "Featured quote", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-page-layout", "quote");
  const editor = canvas.locator('.letter-page-quote-document .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await formatPrefixAndInsertSpace(page, dialog, editor, "italic", "em");
  await expect.poll(
    () => text(state.exported().pages?.[1].blocks),
    { timeout: 60_000 },
  ).toBe("Lorem Ipsum is");
});

test("auto-sized quote keeps a space inserted after bold text", async ({ page }) => {
  const content = `Lorem Ipsumis ${"word ".repeat(95)}`;
  const { state, dialog } = await preparePageEditor(
    page,
    JSON.stringify({
      version: 1,
      blocks: [{ id: "paragraph", type: "paragraph", content }],
    }),
  );
  const canvas = dialog.locator("main [data-page-canvas]");
  const textSize = dialog.getByRole("slider", { name: "Text size" });
  const bodySize = await textSize.getAttribute("aria-valuetext");
  await dialog.getByRole("combobox", { name: "Page layout" }).click();
  await page.getByRole("option", { name: "Featured quote", exact: true }).click();
  const editor = canvas.locator('.letter-page-quote-document .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await expect.poll(() => textSize.getAttribute("aria-valuetext")).not.toBe(bodySize);

  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  await dialog.locator('.bn-toolbar [data-test="bold"]').click();
  await expect.poll(
    () => JSON.stringify(state.exported().pages?.[1].blocks),
    { timeout: 60_000 },
  ).toContain('"bold":true');

  await typeSpaceAfterBold(page, editor);
  await expect(editor).toContainText("Lorem Ipsum is");
  await expect.poll(
    () => text(state.exported().pages?.[1].blocks),
    { timeout: 60_000 },
  ).toContain("Lorem Ipsum is");
});

test("bold page text accepts a trailing space before more typing", async ({ page }) => {
  const state = await fixture(page, boldOnlyDocument);
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = dialog.locator('main [data-page-canvas] .bn-editor[contenteditable="true"]');
  await editor.focus();
  await editor.locator("strong").first().evaluate((bold) => {
    const node = bold.lastChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) throw new Error("Expected bold text");
    const range = window.document.createRange();
    range.setStart(node, node.textContent?.length ?? 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.keyboard.press("Space");
  await page.keyboard.type("again");
  await expect(editor).toContainText("Lorem Ipsumis again");
  await expect.poll(() => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)), { timeout: 60_000 }).toBe("Lorem Ipsumis again");
});

test("bold page text accepts a space inserted inside the bold run", async ({ page }) => {
  const state = await fixture(page, boldOnlyDocument);
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = dialog.locator('main [data-page-canvas] .bn-editor[contenteditable="true"]');
  await editor.focus();
  await editor.locator("strong").first().evaluate((bold) => {
    const node = bold.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) throw new Error("Expected bold text");
    const range = window.document.createRange();
    range.setStart(node, "Lorem Ipsum".length);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.keyboard.press("Space");
  await expect(editor).toContainText("Lorem Ipsum is");
  await expect.poll(() => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)), { timeout: 60_000 }).toBe("Lorem Ipsum is");
});

test("a split bold paragraph keeps spaces typed at a page boundary", async ({ page }) => {
  const content = "Lorem Ipsumis ".repeat(500);
  const state = await fixture(page, JSON.stringify({ version: 1, blocks: [{ id: "paragraph", type: "paragraph", content: [
    { type: "text", text: content, styles: { bold: true } },
  ] }] }));
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  expect(state.exported().pages?.length).toBeGreaterThan(2);
  const before = text(state.exported().pages?.slice(1).flatMap((item) => item.blocks));
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = dialog.locator('main [data-page-canvas] .bn-editor[contenteditable="true"]');
  await editor.focus();
  await editor.press("End");
  await page.keyboard.press("Space");
  await page.keyboard.type("X");
  await expect.poll(() => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)), { timeout: 60_000 }).toContain(" X");
  const after = text(state.exported().pages?.slice(1).flatMap((item) => item.blocks));
  expect(after.length).toBe(before.length + 2);
});

test("paginated body keeps a space inserted after toolbar formatting", async ({ page }) => {
  const content = `Lorem Ipsumis ${sentence.repeat(85)}`;
  const { state, dialog, editor } = await preparePageEditor(
    page,
    JSON.stringify({
      version: 1,
      blocks: [{ id: "paragraph", type: "paragraph", content }],
    }),
  );
  expect(state.exported().pages?.length).toBeGreaterThan(2);

  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  await dialog.locator('.bn-toolbar [data-test="bold"]').click();
  await expect.poll(
    () => JSON.stringify(state.exported().pages?.[1].blocks),
    { timeout: 60_000 },
  ).toContain('"bold":true');

  await typeSpaceAfterBold(page, editor);
  await expect(editor).toContainText("Lorem Ipsum is");
  await expect.poll(
    () => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)),
    { timeout: 60_000 },
  ).toContain("Lorem Ipsum is");
});

test("narrow page editor accepts a space beside bold text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { state, dialog, editor } = await preparePageEditor(
    page,
    unformattedDocument,
  );
  await formatPrefixAndInsertSpace(page, dialog, editor, "bold", "strong");
  await expect.poll(
    () => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)),
    { timeout: 60_000 },
  ).toBe("Lorem Ipsum is");
  const gap = await editor.locator("strong").first().evaluate((bold) => {
    const plain = bold.nextSibling;
    const markedText = bold.lastChild;
    if (!plain || !markedText || plain.nodeType !== Node.TEXT_NODE) {
      throw new Error("Expected plain text after the bold run");
    }
    const boldEnd = window.document.createRange();
    boldEnd.setStart(markedText, markedText.textContent?.length ?? 0);
    boldEnd.collapse(true);
    const plainStart = window.document.createRange();
    plainStart.setStart(plain, 1);
    plainStart.setEnd(plain, 2);
    return plainStart.getBoundingClientRect().x - boldEnd.getBoundingClientRect().x;
  });
  expect(gap).toBeGreaterThan(1);
});

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

test("letter paragraphs align with the title and scroll in one canvas", async ({
  page,
}) => {
  const content = JSON.stringify({
    version: 1,
    blocks: Array.from({ length: 48 }, (_, index) => ({
      id: `paragraph-${index}`,
      type: "paragraph",
      content: [{ type: "text", text: `Paragraph ${index + 1}`, styles: {} }],
    })),
  });
  await fixture(page, content);

  const title = page.getByRole("textbox", { name: "Letter title" });
  const editor = page.locator(".letter-composer-document .bn-editor");
  const paragraph = editor.locator('[data-content-type="paragraph"]').first();
  await expect(paragraph).toBeVisible({ timeout: 60_000 });
  await expect(paragraph).toHaveCSS("padding-top", "4px");
  await expect(paragraph).toHaveCSS("padding-bottom", "4px");
  await expect(editor.locator(".bn-block-outer").first()).toHaveCSS(
    "line-height",
    "24px",
  );
  await expect(editor).toHaveCSS("overflow-y", "visible");

  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 812 });
    const titleBounds = await title.boundingBox();
    const paragraphBounds = await paragraph.boundingBox();
    expect(titleBounds).not.toBeNull();
    expect(paragraphBounds).not.toBeNull();
    expect(Math.abs(titleBounds!.x - paragraphBounds!.x)).toBeLessThanOrEqual(1);
  }

  const scroll = await editor.evaluate((node) => {
    const canvas = node.closest(".letter-composer-document")?.parentElement
      ?.parentElement;
    if (!(canvas instanceof HTMLElement)) {
      throw new Error("Letter canvas is missing");
    }
    canvas.scrollTop = 180;
    return {
      canvasScrollTop: canvas.scrollTop,
      canvasScrollHeight: canvas.scrollHeight,
      canvasClientHeight: canvas.clientHeight,
      editorScrollTop: node.scrollTop,
    };
  });
  expect(scroll.canvasScrollHeight).toBeGreaterThan(scroll.canvasClientHeight);
  expect(scroll.canvasScrollTop).toBeGreaterThan(0);
  expect(scroll.editorScrollTop).toBe(0);
});

test("letter body shortcuts nest blocks and distinguish soft from new lines", async ({
  page,
}) => {
  const state = await fixture(
    page,
    JSON.stringify({
      version: 1,
      blocks: [
        { id: "first", type: "paragraph", content: "First" },
        { id: "second", type: "paragraph", content: "Second" },
      ],
    }),
  );
  const editor = page.locator(".letter-composer-document .bn-editor");
  const second = editor.locator('[data-content-type="paragraph"]').nth(1);
  await expect(second).toBeVisible({ timeout: 60_000 });
  await second.click();
  await page.keyboard.press("Tab");
  await expect
    .poll(() => text(JSON.parse(state.letter().content).blocks[0].children), {
      timeout: 60_000,
    })
    .toContain("Second");

  await page.keyboard.press("Shift+Tab");
  await expect
    .poll(() => JSON.parse(state.letter().content).blocks.length, {
      timeout: 60_000,
    })
    .toBe(2);

  await page.keyboard.press("End");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("Same block");
  await expect(editor.locator(".bn-block-outer")).toHaveCount(2);

  await page.keyboard.press("Enter");
  await page.keyboard.type("Third block");
  await expect(editor.locator(".bn-block-outer")).toHaveCount(3);
  await expect(editor).toContainText("Third block");
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

test("page numbers exclude the cover and remain visible across page layouts", async ({
  page,
}) => {
  await fixture(page, document(100));
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await page
    .getByRole("button", { name: "Customize pages", exact: true })
    .click();

  const dialog = page.getByRole("dialog");
  const canvas = dialog.locator("main [data-page-canvas]");
  await expect(canvas).toHaveAttribute("data-page-layout", "cover");
  await expect(canvas.locator("[data-page-number]")).toHaveCount(0);
  await expect(canvas).toHaveAttribute("aria-label", "Editable social cover");

  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(canvas.locator("[data-page-number]")).toHaveText("1");
  await expect(canvas).toHaveAttribute("aria-label", "Editable social page 1");

  await dialog.getByRole("combobox", { name: "Page layout" }).click();
  await page.getByRole("option", { name: "Featured quote", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-page-layout", "quote");
  await expect(canvas.locator("[data-page-number]")).toHaveText("1");

  await dialog.getByRole("button", { name: "Edit page 3", exact: true }).click();
  await expect(canvas.locator("[data-page-number]")).toHaveText("2");
  await expect(canvas).toHaveAttribute("aria-label", "Editable social page 2");
});

test("last-page author details save independently and blank lines stay hidden", async ({ page }) => {
  const state = await fixture(page, document(2));
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const canvas = dialog.locator("main [data-page-canvas]");
  const authorName = dialog.getByRole("textbox", { name: "Author name" });
  const username = dialog.getByRole("textbox", { name: "Username" });
  await expect(authorName).toHaveValue("Test Author");
  await expect(username).toHaveValue("@author");

  await authorName.fill("Guest Writer");
  await username.fill("");
  await expect(canvas).toContainText("Guest Writer");
  await expect(canvas).not.toContainText("@author");
  await expect.poll(() => state.exported().pages?.at(-1)?.signature).toEqual({ name: "Guest Writer", handle: "" });
  expect(state.exported().pages?.[0].cover?.author_name).toBe("Test Author");

  await authorName.fill("");
  await username.fill("guest.writer");
  await expect(canvas).toContainText("guest.writer");
  await expect(canvas).not.toContainText("Guest Writer");
  await expect.poll(() => state.exported().pages?.at(-1)?.signature).toEqual({ name: "", handle: "guest.writer" });

  await authorName.fill("");
  await username.fill("");
  await expect(canvas.locator(".letter-page-signature")).toHaveCount(0);
  await expect.poll(() => state.exported().pages?.at(-1)?.signature).toEqual({ name: "", handle: "" });

  await dialog.getByRole("combobox", { name: "Page layout" }).click();
  await page.getByRole("option", { name: "Featured quote", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-page-layout", "quote");
  await expect(canvas.locator(".letter-page-signature")).toHaveCount(0);
  await expect(canvas).not.toContainText("Medasin");

  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "Author name" })).toHaveValue("");
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "Username" })).toHaveValue("");
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

test("dark background applies to cover, body, rich text, logos, and thumbnails", async ({
  page,
}) => {
  await fixture(page, document(2));
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await page
    .getByRole("button", { name: "Customize pages", exact: true })
    .click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Page background" }).click();
  await page.getByRole("option", { name: "Dark", exact: true }).click();

  const coverCanvas = dialog.locator('main [data-page-layout="cover"]');
  const coverEditor = coverCanvas.locator(".letter-cover-description");
  await expect(coverCanvas).toHaveAttribute("data-page-theme", "dark");
  await expect(coverEditor.locator(".bn-root")).toHaveAttribute(
    "data-color-scheme",
    "dark",
  );
  await expect(coverEditor.locator(".bn-editor")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(coverCanvas.getByAltText("Medasin")).toHaveCSS(
    "filter",
    "invert(1)",
  );

  const coverBackground = await coverCanvas.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  const bodyThumbnail = dialog
    .getByRole("button", { name: "Edit page 2" })
    .locator('[data-page-theme="dark"]');
  await expect(bodyThumbnail).toBeVisible();
  await dialog.getByRole("button", { name: "Edit page 2" }).click();

  const bodyCanvas = dialog.locator('main [data-page-layout="body"]');
  await expect(bodyCanvas).toHaveAttribute("data-page-theme", "dark");
  await expect(bodyCanvas.locator(".bn-root")).toHaveAttribute(
    "data-color-scheme",
    "dark",
  );
  await expect(bodyCanvas.locator(".bn-editor")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  const darkEditorColor = await bodyCanvas
    .locator(".bn-editor")
    .evaluate((element) => getComputedStyle(element).color);
  expect(darkEditorColor).not.toBe(coverBackground);
  await expect
    .poll(() =>
      bodyCanvas.evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe(coverBackground);

  await dialog.getByRole("button", { name: "Edit page 1" }).click();
  await dialog.getByRole("combobox", { name: "Page background" }).click();
  await page.getByRole("option", { name: "White", exact: true }).click();
  await dialog.getByRole("button", { name: "Edit page 2" }).click();

  await expect(bodyCanvas).toHaveAttribute("data-page-theme", "light");
  await expect(bodyCanvas.locator(".bn-root")).toHaveAttribute(
    "data-color-scheme",
    "light",
  );
  const lightEditorColor = await bodyCanvas
    .locator(".bn-editor")
    .evaluate((element) => getComputedStyle(element).color);
  expect(lightEditorColor).not.toBe(darkEditorColor);
});

test("cover controls persist styling, metadata, and image removal", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    initialHeroImageUrl: "http://localhost/storage/existing-cover.png",
    initialHeroAspectRatio: 1.25,
  });
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(
    page.getByRole("button", { name: "Customize pages", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Prepare social pages" });

  await dialog.getByRole("combobox", { name: "Background" }).click();
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await dialog.getByRole("switch", { name: "Show Medasin logo" }).click();
  await dialog.getByRole("textbox", { name: "Subheader" }).fill("CIPER DATASETS");
  await dialog.getByRole("textbox", { name: "Author name" }).fill("Ciper");
  await dialog
    .getByRole("slider", { name: "Text size", exact: true })
    .evaluate((node) => {
      const input = node as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!
        .set!.call(input, "100");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await expect(dialog.getByRole("button", { name: "Reorder Title" })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Reorder Cover body text" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Reorder Author and date" }),
  ).toHaveCount(0);
  const coverBody = dialog.locator(
    'main .letter-cover-description [contenteditable="true"]',
  );
  await coverBody.fill("A formatted cover description");
  const coverCanvas = dialog.locator('main [data-page-layout="cover"]');
  const coverTitle = coverCanvas.getByRole("textbox", {
    name: "Cover title",
  });
  const coverSubheader = coverCanvas.locator(
    '[data-cover-section="header"] p',
  );
  const coverHero = coverCanvas.locator('[data-cover-section="hero"]');
  const coverFooter = coverCanvas.locator('[data-cover-section="author"]');
  await expect(coverTitle).toHaveCSS("font-size", "62.64px");
  await expect(coverSubheader).toHaveCSS("font-size", "16.2px");
  await expect(coverTitle).toHaveCSS("text-align", "center");
  await expect(coverBody.locator(".bn-block-content").first()).toHaveCSS(
    "text-align",
    "center",
  );
  const sectionWidths = await coverCanvas
    .locator('[data-cover-section]:not([data-cover-section="hero"])')
    .evaluateAll((sections) =>
      sections.map((section) => section.getBoundingClientRect().width),
    );
  expect(Math.max(...sectionWidths) - Math.min(...sectionWidths)).toBeLessThan(
    1,
  );
  const heroFrame = await coverHero.evaluate((element) => {
    const canvas = element.closest("[data-page-canvas]");
    if (!canvas) throw new Error("Cover canvas is missing");
    const bounds = element.getBoundingClientRect();
    return {
      aspectRatio: bounds.width / bounds.height,
      heightFraction: bounds.height / canvas.getBoundingClientRect().height,
    };
  });
  expect(heroFrame.aspectRatio).toBeGreaterThan(1.25);
  expect(heroFrame.heightFraction).toBeLessThanOrEqual(0.43);
  expect(
    await coverFooter.evaluate((element) => {
      const canvasBounds = element
        .closest<HTMLElement>("[data-page-canvas]")!
        .getBoundingClientRect();
      const footerBounds = element.getBoundingClientRect();
      return (canvasBounds.bottom - footerBounds.bottom) / canvasBounds.height;
    }),
  ).toBeCloseTo(0.056, 1);
  const coverTextAlignment = dialog.getByRole("group", { name: "Text alignment" });
  await coverTextAlignment.getByRole("button", { name: "Left", exact: true }).click();
  await expect(
    coverTextAlignment.getByRole("button", { name: "Left", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(coverSubheader).toHaveCSS("text-align", "left");
  await expect(coverTitle).toHaveCSS("text-align", "left");
  await expect(coverBody.locator(".bn-block-content").first()).toHaveCSS(
    "text-align",
    "left",
  );
  await coverBody.click();
  await coverBody.press("End");
  await coverBody.pressSequentially("/");
  const slashMenu = page.getByRole("listbox", { name: "Insert block" });
  await expect(slashMenu).toBeVisible();
  await page.waitForTimeout(1_000);
  await expect(slashMenu).toBeVisible();
  await expect(slashMenu.getByText("Image", { exact: true })).toHaveCount(0);
  await expect(slashMenu.getByText("Video", { exact: true })).toHaveCount(0);
  await coverBody.fill("A formatted cover description");
  await expect(slashMenu).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible({ timeout: 60_000 });

  const heroControl = dialog
    .getByText("Landscape cover image", { exact: true })
    .locator("..");
  const updateCount = state.updates.length;
  await heroControl.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(dialog.locator('[data-cover-section="hero"]')).toHaveCount(0);
  await expect
    .poll(() => state.updates.length, { timeout: 60_000 })
    .toBeGreaterThan(updateCount);

  await expect(coverFooter).toBeVisible();

  await expect.poll(() => state.updates.length, { timeout: 60_000 }).toBeGreaterThan(0);
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  const cover = state.exported().pages?.[0].cover;
  expect(cover?.theme).toBe("dark");
  expect(cover?.show_logo).toBe(false);
  expect(cover?.text_alignment).toBe("left");
  expect(cover?.subheader).toBe("CIPER DATASETS");
  expect(state.letter().subtitle).toBe("A formatted cover description");
  expect(cover?.description_blocks).toBeTruthy();
  expect(cover?.author_name).toBe("Ciper");
  expect(cover?.hero_image_url).toBeNull();
  expect(cover?.hero_image_aspect_ratio).toBeNull();

  await heroControl
    .locator('input[type="file"]')
    .setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAA/UlEQVR4nO3RMQ0AMAzAsPIn3d5DsBw2gkiZJWV+B/AyJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQmAP4K6zWNUjE4wAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
  const cropDialog = page.getByRole("dialog", { name: "Crop cover image" });
  await expect(cropDialog).toBeVisible();
  await expect(cropDialog.getByRole("button", { name: "4:5" })).toBeVisible();
  await expect(cropDialog.getByRole("button", { name: "9:16" })).toBeVisible();
  await cropDialog.getByRole("button", { name: "4:5" }).click();
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect(coverHero).toBeVisible();
  await expect
    .poll(() => state.exported().pages?.[0].cover?.hero_image_aspect_ratio, {
      timeout: 60_000,
    })
    .toBeCloseTo(4 / 5, 2);
});

test("cover image replacement retains the caption, placement, and alignment", async ({ page }) => {
  const state = await fixture(page, document(2));
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Prepare social pages" });
  const heroControl = dialog.getByText("Landscape cover image", { exact: true }).locator("..");
  const captionInput = dialog.getByRole("textbox", { name: "Cover image caption" });
  await expect(captionInput).toBeHidden();

  let cropDialog = await chooseCoverImage(page, heroControl, "first-cover.png");
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 }).toBe("/storage/uploaded-cover-1.png");

  await expect(captionInput).toBeVisible();
  await expect(captionInput).toHaveAttribute("maxlength", "120");
  await captionInput.fill("A quiet view of the city");
  const alignment = dialog.getByRole("group", { name: "Caption alignment" });
  const placement = dialog.getByRole("group", { name: "Caption placement" });
  const hero = dialog.locator('main [data-cover-section="hero"]');
  await expect(placement.getByRole("button", { name: "On image" })).toHaveAttribute("aria-pressed", "true");
  await expect(hero).toHaveAttribute("data-caption-placement", "overlay");
  await alignment.getByRole("button", { name: "Right", exact: true }).click();
  await placement.getByRole("button", { name: "Below image" }).click();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption, { timeout: 60_000 }).toBe("A quiet view of the city");
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption_alignment, { timeout: 60_000 }).toBe("right");
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption_placement, { timeout: 60_000 }).toBe("below");

  cropDialog = await chooseCoverImage(page, heroControl, "second-cover.png");
  expect(state.exported().pages?.[0].cover?.hero_image_url).toBe("/storage/uploaded-cover-1.png");
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 }).toBe("/storage/uploaded-cover-2.png");
  expect(state.mediaUploads()).toBe(2);
  expect(state.exported().pages?.[0].cover?.hero_image_caption).toBe("A quiet view of the city");
  expect(state.exported().pages?.[0].cover?.hero_image_caption_alignment).toBe("right");
  expect(state.exported().pages?.[0].cover?.hero_image_caption_placement).toBe("below");

  const caption = hero.locator("[data-cover-hero-caption]");
  await expect(caption).toBeVisible();
  await expect(caption).toHaveCSS("text-align", "right");
  await expect(caption).toHaveAttribute("data-caption-placement", "below");
  const belowGeometry = await hero.evaluate((element) => {
    const image = element.querySelector("[data-cover-hero-image]")?.getBoundingClientRect();
    const captionBounds = element.querySelector("[data-cover-hero-caption]")?.getBoundingClientRect();
    if (!image || !captionBounds) throw new Error("Cover image or caption is missing");
    return { imageBottom: image.bottom, captionTop: captionBounds.top };
  });
  expect(belowGeometry.captionTop).toBeGreaterThanOrEqual(belowGeometry.imageBottom);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  const previewHero = page.locator('[aria-label="Letter export preview"] [data-cover-section="hero"]');
  await expect(previewHero).toContainText("A quiet view of the city");
  await expect(previewHero).toHaveAttribute("data-caption-placement", "below");

  await page.getByRole("button", { name: "Customize pages", exact: true }).click();
  await expect(captionInput).toHaveValue("A quiet view of the city");
  await expect(alignment.getByRole("button", { name: "Right", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(placement.getByRole("button", { name: "Below image" })).toHaveAttribute("aria-pressed", "true");

  await placement.getByRole("button", { name: "On image" }).click();
  await expect(hero).toHaveAttribute("data-caption-placement", "overlay");
  await expect(caption).toHaveCSS("color", "rgb(255, 255, 255)");
  await placement.getByRole("button", { name: "Below image" }).click();
  await expect(hero).toHaveAttribute("data-caption-placement", "below");

  await heroControl.getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 }).toBeNull();
  expect(state.exported().pages?.[0].cover?.hero_image_caption).toBe("");
  expect(state.exported().pages?.[0].cover?.hero_image_caption_alignment).toBe("center");
  expect(state.exported().pages?.[0].cover?.hero_image_caption_placement).toBe("overlay");
  await expect(captionInput).toBeHidden();
  await expect(dialog.locator('main [data-cover-section="hero"]')).toHaveCount(0);
});

test("legacy image captions stay on the image", async ({ page }) => {
  await fixture(page, document(2), "portrait", {
    initialHeroImageUrl: "http://localhost/storage/existing-cover.png",
    legacyCaptionPlacement: true,
  });
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Prepare social pages" });
  await expect(dialog.getByRole("group", { name: "Caption placement" }).getByRole("button", { name: "On image" })).toHaveAttribute("aria-pressed", "true");
  const caption = dialog.locator('main [data-cover-hero-caption]');
  await expect(caption).toHaveText("An older image caption");
  await expect(caption).toHaveAttribute("data-caption-placement", "overlay");
});

for (const format of ["portrait", "square", "story", "landscape"] as const) {
  test(`cover columns align with overlay and below captions in ${format} format`, async ({ page }) => {
    if (format === "story") {
      await page.setViewportSize({ width: 390, height: 844 });
    }
    const aspectRatio = format === "story" ? 9 / 16 : 16 / 9;
    const state = await fixture(page, document(2), "portrait", {
      subtitle: "A short cover entry for checking the shared text column.",
      initialHeroImageUrl: "http://localhost/storage/existing-cover.png",
      initialHeroAspectRatio: aspectRatio,
    });
    await page.getByRole("button", { name: "Preview pages" }).click();
    if (format !== "portrait") {
      const formatSelect = page.getByRole("combobox", { name: "Export format" });
      await expect(formatSelect).toBeEnabled({ timeout: 60_000 });
      await formatSelect.click();
      await page.getByRole("option", { name: new RegExp(LETTER_EXPORT_FORMATS[format].shortLabel) }).click();
      await expect.poll(() => state.exported().format, { timeout: 60_000 }).toBe(format);
    }
    await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Customize pages", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Prepare social pages" });
    const longCaption = "A city view with layers of quiet detail and people finding their way through an ordinary afternoon. ".repeat(2).slice(0, 120);
    await dialog.getByRole("textbox", { name: "Cover image caption" }).fill(longCaption);
    await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption, { timeout: 60_000 }).toBe(longCaption);
    const editorCanvas = dialog.locator('main [data-page-layout="cover"]');
    const previewCanvas = page.locator('[aria-label="Letter export preview"] [data-page-layout="cover"]').first();
    await expectCoverColumnAlignment(editorCanvas, "overlay");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expectCoverColumnAlignment(previewCanvas, "overlay");

    await page.getByRole("button", { name: "Customize pages", exact: true }).click();
    await dialog.getByRole("group", { name: "Caption placement" }).getByRole("button", { name: "Below image" }).click();
    await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption_placement, { timeout: 60_000 }).toBe("below");
    await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption, { timeout: 60_000 }).toBe(longCaption);

    const hero = editorCanvas.locator('[data-cover-section="hero"]');
    await expect(hero.locator("[data-cover-hero-caption]")).toHaveText(longCaption);
    const geometry = await expectCoverColumnAlignment(editorCanvas, "below");
    expect(geometry.image.width / geometry.image.height).toBeGreaterThan(aspectRatio);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expectCoverColumnAlignment(previewCanvas, "below");
  });
}

test("failed cover replacement shows the image validation error and keeps the current image", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", { rejectMediaUploadNumber: 2 });
  await page.getByRole("button", { name: "Preview pages" }).click();
  await expect(page.getByRole("button", { name: "Customize pages", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Customize pages", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Prepare social pages" });
  const heroControl = dialog.getByText("Landscape cover image", { exact: true }).locator("..");
  let cropDialog = await chooseCoverImage(page, heroControl, "first-cover.png");
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 }).toBe("/storage/uploaded-cover-1.png");

  cropDialog = await chooseCoverImage(page, heroControl, "invalid-replacement.png");
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog.getByRole("alert")).toContainText("The replacement image could not be saved.");
  expect(state.exported().pages?.[0].cover?.hero_image_url).toBe("/storage/uploaded-cover-1.png");
  await expect(dialog.locator('main [data-cover-section="hero"] img')).toHaveAttribute("src", /uploaded-cover-1\.png/);

  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 }).toBe("/storage/uploaded-cover-3.png");
});

async function chooseCoverImage(page: Page, control: Locator, name: string) {
  await control.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: "image/png",
    buffer: testCoverPng,
  });
  const cropDialog = page.getByRole("dialog", { name: "Crop cover image" });
  await expect(cropDialog).toBeVisible();
  return cropDialog;
}

const testCoverPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAA/UlEQVR4nO3RMQ0AMAzAsPIn3d5DsBw2gkiZJWV+B/AyJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQmAP4K6zWNUjE4wAAAABJRU5ErkJggg==",
  "base64",
);
