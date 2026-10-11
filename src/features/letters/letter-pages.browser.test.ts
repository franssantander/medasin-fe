import { expect, test, type Locator, type Page } from "@playwright/test";
import type {
  Letter,
  LetterCoverSection,
  LetterExport,
  LetterExportFormat,
  LetterPage,
} from "./type";
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
    uncachedCoverImages?: boolean;
    legacyCover?: { order: LetterCoverSection[]; authorName: string };
    profileImageUrl?: string;
    /** Saves the first export the old way, with the cover text split over a continuation page. */
    legacyCoverContinuation?: boolean;
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
  let exportCount = 0;
  const exports = new Map<string, LetterExport>();
  const updates: LetterPage[][] = [];
  let mediaUploads = 0;
  await page.route(/\/storage\/(?:existing-cover|uploaded-cover-\d+)\.png$/, async (route) => {
    await route.fulfill({
      body: testCoverPng,
      contentType: "image/png",
      headers: metadata?.uncachedCoverImages ? { "cache-control": "no-store" } : undefined,
    });
  });
  await page.route("**/api-test/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api-test/v1", "");
    const method = route.request().method();
    let data: unknown;
    if (path === "/auth/me") data = { first_name: "Test", last_name: "Author", username: "author", roles: [], profile_image_url: metadata?.profileImageUrl ?? null };
    else if (path === "/letters" && method === "GET") data = { current_page: 1, data: [letter], last_page: 1, per_page: 15, total: 1 };
    else if (path === "/letters/letter-test") {
      if (method === "PATCH") {
        const previousTitle = letter.title;
        const previousSubtitle = letter.subtitle;
        const previousContent = letter.content;
        letter = { ...letter, ...route.request().postDataJSON() };
        if (
          metadata?.invalidateExportOnLetterUpdate &&
          exported &&
          (previousTitle !== letter.title ||
            previousSubtitle !== letter.subtitle ||
            previousContent !== letter.content)
        ) {
          exported = { ...exported, is_current: false };
          exports.set(exported.uuid, exported);
          letter = { ...letter, latest_export: exported };
        }
      }
      data = letter;
    } else if (path === "/letters/letter-test/exports" && method === "POST") {
      const input = route.request().postDataJSON();
      const canvas = LETTER_EXPORT_FORMATS[input.format as LetterExportFormat];
      const pages = normalize(input.pages);
      if (exportCount === 0 && metadata?.initialCoverDescriptionBlocks && pages[0]?.cover) {
        pages[0] = {
          ...pages[0],
          cover: {
            ...pages[0].cover,
            description_blocks: metadata.initialCoverDescriptionBlocks,
          },
        };
      }
      if (exportCount === 0 && metadata?.initialHeroImageUrl && pages[0]?.cover) {
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
      if (exportCount === 0 && metadata?.legacyCaptionPlacement && pages[0]?.cover) {
        pages[0].cover.hero_image_caption = "An older image caption";
        Reflect.deleteProperty(pages[0].cover, "hero_image_caption_placement");
      }
      if (exportCount === 0 && metadata?.legacyCover && pages[0]?.cover) {
        // Covers saved before the byline had no handle or display toggles.
        for (const key of ["author_handle", "show_author", "show_date", "show_page_numbers", "show_signature"]) {
          Reflect.deleteProperty(pages[0].cover, key);
        }
        pages[0].cover.section_order = metadata.legacyCover.order;
        pages[0].cover.author_name = metadata.legacyCover.authorName;
      }
      if (exportCount === 0 && metadata?.legacyCoverContinuation && pages[0]) {
        pages[0].blocks = [{ id: "entry", type: "paragraph", content: "The whole excerpt," }];
        pages.splice(1, 0, {
          ...pages[1],
          uuid: "legacy-cover-continuation",
          content_source: "cover_entry",
          blocks: [{ id: "entry::letter-part::18", type: "paragraph", content: "Library in" }],
        });
        pages.splice(0, pages.length, ...normalize(pages));
        pages[1].continuation_label = "Cover entry · Continued";
      }
      exported = { uuid: `export-test-${++exportCount}`, letter_uuid: letter.uuid, format: input.format, canvas, status: "ready", is_current: true, pages, page_count: pages.length, error: null, created_at: null, updated_at: null, started_at: null, completed_at: null };
      exports.set(exported.uuid, exported);
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
    } else if (path.startsWith("/letters/letter-test/exports/")) {
      const exportUuid = path.split("/").at(-1)!;
      const requestedExport = exports.get(exportUuid);
      if (!requestedExport) {
        await route.fulfill({ status: 404, json: { message: "Export not found" } });
        return;
      }
      if (method === "PATCH") {
        if (metadata?.updateDelayMs) {
          await new Promise((resolve) =>
            setTimeout(resolve, metadata.updateDelayMs),
          );
        }
        const input = route.request().postDataJSON();
        updates.push(input.pages);
        exported = { ...requestedExport, pages: normalize(input.pages), page_count: input.pages.length };
        exports.set(exportUuid, exported);
        letter = { ...letter, title: input.pages[0].title, subtitle: input.pages[0].subtitle, content: JSON.stringify({ version: 1, blocks: input.pages.slice(1).flatMap((p: LetterPage) => p.blocks) }), latest_export: exported };
        data = { export: exported, letter };
      } else data = requestedExport;
    } else data = [];
    await route.fulfill({ json: { data, status: 200, message: "Saved" } });
  });
  if (format === "portrait") {
    await page.goto("/letters/letter-test");
  } else {
    await page.goto(`/letters/letter-test/studio?format=${format}`);
    const { width, height } = LETTER_EXPORT_FORMATS[format];
    await expect(studioRegion(page).getByText(`${width}×${height}`)).toBeAttached({ timeout: 120_000 });
  }
  return {
    letter: () => letter,
    exported: () => exported!,
    exportsCreated: () => exportCount,
    mediaUploads: () => mediaUploads,
    updates,
  };
}

function studioRegion(page: Page) {
  return page.getByRole("region", { name: "Letter studio" });
}

/** Opens the page studio from the editor, or waits for it when already open. */
async function openStudio(page: Page, timeout = 60_000) {
  const studio = studioRegion(page);
  if (!(await studio.isVisible())) {
    await page.getByRole("button", { name: "Publish", exact: true }).click();
  }
  await expect(studio.getByRole("navigation", { name: "Pages" })).toBeVisible({ timeout });
  return studio;
}

async function backToEditor(page: Page) {
  await studioRegion(page).getByRole("button", { name: "Back to editor" }).click();
  await expect(page.getByRole("textbox", { name: "Letter title" })).toBeVisible({ timeout: 60_000 });
}

/** Selects page 2 (retrying across a re-render of the page set) and checks its bold text. */
async function expectStudioPageText(page: Page, value: string) {
  const studio = studioRegion(page);
  const canvas = studio.locator("[data-studio-canvas] [data-page-canvas]");
  await expect(async () => {
    await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
    await expect(canvas).toContainText(value, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await expect(canvas.locator("strong")).toContainText("Lorem Ipsum");
}

/** Waits until a re-render of stale pages has replaced the studio's page set. */
async function waitForCurrentPages(studio: Locator) {
  await expect(studio.getByText(/Your letter changed since these pages were made/)).toHaveCount(0, { timeout: 60_000 });
  await expect(studio.getByRole("navigation", { name: "Pages" })).toBeVisible({ timeout: 60_000 });
}

async function openCoverSection(studio: Locator, name: "Text" | "Author" | "Style" | "Images" | "Arrange") {
  const trigger = studio.getByRole("button", { name, exact: true });
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
}

async function heroImageControl(studio: Locator) {
  await openCoverSection(studio, "Images");
  return studio.locator('[data-cover-image-control="hero"]');
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
    const logo = bounds('[data-cover-section="logo"] img[alt="Medasin"]');
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
      authorName: bounds("[data-cover-byline-name]"),
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
    captionPlacement === "below" ? 0.41 : 0.49,
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

test("long cover text stays on the cover when the export is created", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    title: "A deliberately long cover title ".repeat(4).trim(),
    subtitle: "Supporting cover copy that stays on the cover without changing the original letter body. ".repeat(35).trim(),
  });

  await openStudio(page);
  await expect(studioRegion(page).getByRole("alert")).toHaveCount(0);
  // The title keeps its size; only the image and cover text give way.
  expect(state.exported().pages?.[0].text_scale).toBe(1);
  expect(
    state.exported().pages?.some(
      (item) => item.layout !== "cover" && item.content_source === "cover_entry",
    ),
  ).toBe(false);
  expect(
    text(
      state.exported().pages
        ?.filter((item) => item.content_source !== "cover_entry")
        .flatMap((item) => item.blocks),
    ),
  ).toBe(text(JSON.parse(document(2)).blocks));

  const coverScale = state.exported().pages?.[0].text_scale;
  await openStudio(page);
  const studio = studioRegion(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await setRangeValue(studio.getByRole("slider", { name: "Text size for all pages" }), 90);
  await expect.poll(() => state.exported().pages?.slice(1).every((item) => item.text_scale === 0.9)).toBe(true);
  expect(state.exported().pages?.[0].text_scale).toBe(coverScale);
});

test("long cover text shrinks the image, then the text, and stays on the cover", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    initialHeroImageUrl: "/storage/existing-cover.png",
    initialHeroAspectRatio: 16 / 9,
  });
  const studio = await openStudio(page);
  const cover = studio.locator('[data-studio-canvas] [data-page-layout="cover"]');
  const coverBody = cover.locator('.letter-cover-description [contenteditable="true"]');
  await expect(cover.locator('[data-cover-section="hero"]')).toBeVisible();
  // Layout sizes, unaffected by the viewport zoom.
  const measure = () => cover.evaluate((canvas: HTMLElement) => {
    const frame = canvas.querySelector<HTMLElement>("[data-cover-hero-frame]")!;
    const size = (selector: string) =>
      parseFloat(getComputedStyle(canvas.querySelector(selector)!).fontSize);
    return {
      fit: canvas.dataset.coverFit,
      hero: frame.offsetHeight,
      natural: Math.min(frame.offsetWidth / (16 / 9), canvas.offsetHeight * 0.48),
      title: size('[data-cover-section="title"] h2'),
      entry: size(".letter-cover-description .bn-editor"),
    };
  });
  const initial = await measure();
  expect(initial.fit).toBe("natural");
  expect(Math.abs(initial.hero - initial.natural)).toBeLessThanOrEqual(1);
  const pageCount = state.exported().pages?.length;

  // A little more text: only the image gives way.
  await coverBody.fill(sentence.repeat(COVER_TEXT_IMAGE_SHRINKS));
  await expect.poll(async () => (await measure()).fit).toBe("fitted");
  const imageOnly = await measure();
  expect(imageOnly.hero).toBeLessThan(initial.natural - 1);
  expect(imageOnly.hero).toBeGreaterThanOrEqual(initial.natural * 0.5 - 1);
  expect(imageOnly.entry).toBe(initial.entry);

  // Much more text: the image stops at half its height and the cover text shrinks.
  await coverBody.fill(sentence.repeat(COVER_TEXT_TEXT_SHRINKS));
  await expect.poll(async () => (await measure()).entry).toBeLessThan(initial.entry);
  const both = await measure();
  expect(both.fit).toBe("fitted");
  expect(Math.abs(both.hero - initial.natural * 0.5)).toBeLessThanOrEqual(1);
  expect(both.title).toBe(initial.title);
  await expect(studio.getByText(/Cover body text shrunk to \d+% to fit the cover/)).toBeVisible();
  await expect(studio.locator("[data-cover-full-banner]")).toHaveCount(0);

  await expect(studio.getByText("Saved", { exact: true })).toBeVisible({ timeout: 60_000 });
  expect(state.exported().pages?.length).toBe(pageCount);
  expect(
    state.exported().pages?.some(
      (item) => item.layout !== "cover" && item.content_source === "cover_entry",
    ),
  ).toBe(false);
  expect(state.exported().pages?.[0].text_scale).toBe(1);

  // The fit settles; nothing keeps resizing after the save.
  const settled = await cover.evaluate(async (canvas: HTMLElement) => {
    const frame = canvas.querySelector<HTMLElement>("[data-cover-hero-frame]")!;
    const heights: number[] = [];
    for (let index = 0; index < 12; index += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      heights.push(frame.offsetHeight);
    }
    return heights;
  });
  expect(Math.max(...settled) - Math.min(...settled)).toBeLessThanOrEqual(0.5);
});

const COVER_TEXT_IMAGE_SHRINKS = 10;
const COVER_TEXT_TEXT_SHRINKS = 16;

function normalize(pages: LetterPage[]): LetterPage[] {
  return pages.map((page, index) => ({ ...page, number: index + 1, kind: index === 0 ? "cover" : index === pages.length - 1 ? "final" : "body", signature: index === pages.length - 1 ? page.signature ?? { name: "Test Author", handle: "@author" } : null, truncated: false, continuation_label: null }));
}

async function setRangeValue(locator: Locator, percent: number) {
  await locator.evaluate((node, value) => {
    const input = node as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!
      .set!.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, percent);
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
  await openStudio(page);
  const studio = studioRegion(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = studio.locator('[data-studio-canvas] [data-page-canvas] .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  return { state, studio, editor };
}

async function formatPrefixAndInsertSpace(
  page: Page,
  studio: Locator,
  editor: Locator,
  style: string,
  markSelector: string,
) {
  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  const toolbarButton = studio.locator(`.bn-toolbar [data-test="${style}"]`);
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

  await page.goto("/letters/new");
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

  await expect(page).toHaveURL(/\/letters\/created-letter$/, {
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
  await expect(
    page.getByRole("link", { name: "Open Untitled letter" }),
  ).toBeVisible({ timeout: 60_000 });
});

test("letter preview follows the latest formatted editor text", async ({ page }) => {
  const state = await fixture(page, mixedFormattingDocument, "portrait", {
    invalidateExportOnLetterUpdate: true,
  });
  await openStudio(page);
  await backToEditor(page);

  const editor = page.locator('.letter-composer-document [contenteditable="true"]');
  await typeSpaceAfterBold(page, editor);
  await openStudio(page);
  await expect
    .poll(() => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)), {
      timeout: 60_000,
    })
    .toBe("Lorem Ipsum is");
  await expectStudioPageText(page, "Lorem Ipsum is");
});

test("page editor keeps formatted-boundary spaces after reflow and save", async ({ page }) => {
  const state = await fixture(page, mixedFormattingDocument);
  await openStudio(page);
  const studio = studioRegion(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = studio.locator('[data-studio-canvas] [data-page-canvas] .bn-editor[contenteditable="true"]');
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
  const { state, studio, editor } = await preparePageEditor(
    page,
    unformattedDocument,
  );
  await formatPrefixAndInsertSpace(page, studio, editor, "bold", "strong");
  await expect
    .poll(
      () => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)),
      { timeout: 60_000 },
    )
    .toBe("Lorem Ipsum is");

  await backToEditor(page);
  await expect(studioRegion(page)).toBeHidden();
  await openStudio(page);
  await expectStudioPageText(page, "Lorem Ipsum is");
});

test("cover editor keeps a space between bold and plain text", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    initialCoverDescriptionBlocks: JSON.parse(mixedFormattingDocument).blocks,
  });
  await openStudio(page);
  const editor = studioRegion(page).locator('[data-studio-canvas] .letter-cover-description .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await typeSpaceAfterBold(page, editor);
  await expect(editor).toContainText("Lorem Ipsum is");
  await expect.poll(() => text(state.exported().pages?.[0].cover?.description_blocks), { timeout: 60_000 }).toBe("Lorem Ipsum is");
});

test("clicking beside bold page text allows inserting a space", async ({ page }) => {
  const state = await fixture(page, mixedFormattingDocument);
  await openStudio(page);
  const studio = studioRegion(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = studio.locator('[data-studio-canvas] [data-page-canvas] .bn-editor[contenteditable="true"]');
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
    const { state, studio, editor } = await preparePageEditor(
      page,
      unformattedDocument,
    );
    await formatPrefixAndInsertSpace(page, studio, editor, style, mark);
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
  const { state, studio, editor } = await preparePageEditor(
    page,
    unformattedDocument,
  );
  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  await expect(studio.locator('.bn-toolbar [data-test="bold"]')).toBeVisible();
  await studio.locator('.bn-toolbar [data-test="bold"]').click();
  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  await expect(studio.locator('.bn-toolbar [data-test="underline"]')).toBeVisible();
  await studio.locator('.bn-toolbar [data-test="underline"]').click();

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
  await openStudio(page);
  const studio = studioRegion(page);
  const editor = studio.locator('[data-studio-canvas] .letter-cover-description .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await formatPrefixAndInsertSpace(page, studio, editor, "underline", "u");
  await expect.poll(
    () => text(state.exported().pages?.[0].cover?.description_blocks),
    { timeout: 60_000 },
  ).toBe("Lorem Ipsum is");
});

test("quote page toolbar formatting keeps spaces in quote text", async ({ page }) => {
  const { state, studio } = await preparePageEditor(page, unformattedDocument);
  const canvas = studio.locator("[data-studio-canvas] [data-page-canvas]");
  await studio.getByRole("button", { name: "Featured quote" }).click();
  await expect(canvas).toHaveAttribute("data-page-layout", "quote");
  const editor = canvas.locator('.letter-page-quote-document .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await formatPrefixAndInsertSpace(page, studio, editor, "italic", "em");
  await expect.poll(
    () => text(state.exported().pages?.[1].blocks),
    { timeout: 60_000 },
  ).toBe("Lorem Ipsum is");
});

test("a long quote flows across pages at the shared size and keeps rich text", async ({ page }) => {
  const content = `Lorem Ipsumis ${"word ".repeat(95)}`;
  const { state, studio } = await preparePageEditor(
    page,
    JSON.stringify({
      version: 1,
      blocks: [{ id: "paragraph", type: "paragraph", content }],
    }),
  );
  const canvas = studio.locator("[data-studio-canvas] [data-page-canvas]");
  const textSize = studio.getByRole("slider", { name: "Text size for all pages" });
  const bodySize = await textSize.getAttribute("aria-valuetext");
  await studio.getByRole("button", { name: "Featured quote" }).click();
  const editor = canvas.locator('.letter-page-quote-document .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await expect.poll(() => textSize.getAttribute("aria-valuetext")).toBe(bodySize);
  await expect.poll(() => state.exported().pages?.filter((page) => page.layout === "quote").length).toBeGreaterThan(1);
  expect(new Set(state.exported().pages?.slice(1).map((page) => page.text_scale)).size).toBe(1);

  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  await studio.locator('.bn-toolbar [data-test="bold"]').click();
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

  await setRangeValue(textSize, 110);
  await expect.poll(
    () => text(state.exported().pages?.filter((item) => item.layout === "quote").flatMap((item) => item.blocks)),
    { timeout: 60_000 },
  ).toBe(`Lorem Ipsum is ${"word ".repeat(95)}`);
});

test("bold page text accepts a trailing space before more typing", async ({ page }) => {
  const state = await fixture(page, boldOnlyDocument);
  await openStudio(page);
  const studio = studioRegion(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = studio.locator('[data-studio-canvas] [data-page-canvas] .bn-editor[contenteditable="true"]');
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
  await openStudio(page);
  const studio = studioRegion(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = studio.locator('[data-studio-canvas] [data-page-canvas] .bn-editor[contenteditable="true"]');
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
  await openStudio(page);
  expect(state.exported().pages?.length).toBeGreaterThan(2);
  const before = text(state.exported().pages?.slice(1).flatMap((item) => item.blocks));
  await openStudio(page);
  const studio = studioRegion(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = studio.locator('[data-studio-canvas] [data-page-canvas] .bn-editor[contenteditable="true"]');
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
  const { state, studio, editor } = await preparePageEditor(
    page,
    JSON.stringify({
      version: 1,
      blocks: [{ id: "paragraph", type: "paragraph", content }],
    }),
  );
  expect(state.exported().pages?.length).toBeGreaterThan(2);

  await selectPageEditorText(editor, 0, "Lorem Ipsum".length);
  await studio.locator('.bn-toolbar [data-test="bold"]').click();
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
  const { state, studio, editor } = await preparePageEditor(
    page,
    unformattedDocument,
  );
  await formatPrefixAndInsertSpace(page, studio, editor, "bold", "strong");
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
  // The cover text is written in the Studio, not under the title.
  await expect(page.getByRole("textbox", { name: "Letter subtitle" })).toHaveCount(0);
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

  for (const viewport of [
    { width: 1440, height: 812 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(viewport);
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

test("short letter body does not create empty scrolling space", async ({ page }) => {
  await fixture(page, document(1));
  const body = page.locator(".letter-composer-document");
  const editor = body.locator(".bn-editor");
  await expect(editor.locator(".bn-block-outer").first()).toBeVisible({
    timeout: 60_000,
  });

  for (const viewport of [
    { width: 1440, height: 812 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(viewport);
    const sizes = await body.evaluate((node) => {
      const canvas = node.parentElement?.parentElement;
      if (!(canvas instanceof HTMLElement)) {
        throw new Error("Letter canvas is missing");
      }
      return {
        bodyHeight: node.getBoundingClientRect().height,
        canvasClientHeight: canvas.clientHeight,
        canvasScrollHeight: canvas.scrollHeight,
      };
    });
    expect(sizes.bodyHeight).toBeLessThan(512);
    expect(sizes.canvasScrollHeight).toBeLessThanOrEqual(
      sizes.canvasClientHeight + 1,
    );
  }

  const input = body.locator('[contenteditable="true"]');
  await input.fill("Content ".repeat(200));
  await expect
    .poll(() =>
      body.evaluate((node) => {
        const canvas = node.parentElement?.parentElement;
        return canvas instanceof HTMLElement && canvas.scrollHeight > canvas.clientHeight;
      }),
    )
    .toBe(true);

  await input.fill("Short");
  await expect
    .poll(() =>
      body.evaluate((node) => {
        const canvas = node.parentElement?.parentElement;
        return canvas instanceof HTMLElement && canvas.scrollHeight <= canvas.clientHeight + 1;
      }),
    )
    .toBe(true);
});

test("long letter scroll ends near its final block and shrinks after deleting text", async ({
  page,
}) => {
  const content = JSON.stringify({
    version: 1,
    blocks: Array.from({ length: 48 }, (_, index) => ({
      id: `scroll-paragraph-${index}`,
      type: "paragraph",
      content: `Paragraph ${index + 1} has enough text to remain readable.`,
    })),
  });
  const state = await fixture(page, content);
  const body = page.locator(".letter-composer-document");
  const editor = body.locator('.bn-editor[contenteditable="true"]');
  await expect(editor.locator(".bn-block-outer")).toHaveCount(48, {
    timeout: 60_000,
  });

  for (const viewport of [
    { width: 1440, height: 812 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await body.evaluate((node) => {
      const canvas = node.parentElement?.parentElement;
      const lastBlock = Array.from(node.querySelectorAll(".bn-block-outer")).at(-1);
      if (!(canvas instanceof HTMLElement) || !(lastBlock instanceof HTMLElement)) {
        throw new Error("Letter canvas or final block is missing");
      }
      canvas.scrollTop = canvas.scrollHeight;
      return {
        scrollTop: canvas.scrollTop,
        bottomGap:
          canvas.getBoundingClientRect().bottom -
          lastBlock.getBoundingClientRect().bottom,
      };
    });
    expect(geometry.scrollTop).toBeGreaterThan(0);
    expect(geometry.bottomGap).toBeGreaterThanOrEqual(0);
    expect(geometry.bottomGap).toBeLessThanOrEqual(96);
  }

  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Short");
  await expect(editor.locator(".bn-block-outer")).toHaveCount(1);
  await expect
    .poll(() =>
      body.evaluate((node) => {
        const canvas = node.parentElement?.parentElement;
        return canvas instanceof HTMLElement && canvas.scrollHeight <= canvas.clientHeight + 1;
      }),
    )
    .toBe(true);
  await expect
    .poll(() => text(JSON.parse(state.letter().content).blocks), {
      timeout: 60_000,
    })
    .toBe("Short");
});

test("blank lines at the end of a letter stay editable and are not saved", async ({
  page,
}) => {
  const state = await fixture(
    page,
    JSON.stringify({
      version: 1,
      blocks: [
        { id: "opening", type: "paragraph", content: "Opening" },
        { id: "intentional-gap", type: "paragraph", content: [] },
        { id: "closing", type: "paragraph", content: "Closing" },
        ...Array.from({ length: 12 }, (_, index) => ({
          id: `trailing-empty-${index}`,
          type: "paragraph",
          content: [],
        })),
      ],
    }),
  );
  const editor = page.locator('.letter-composer-document .bn-editor[contenteditable="true"]');
  const blocks = editor.locator(".bn-block-outer");
  await expect(blocks).toHaveCount(4, { timeout: 60_000 });
  await expect
    .poll(() => JSON.parse(state.letter().content).blocks.length, {
      timeout: 60_000,
    })
    .toBe(4);
  expect(JSON.parse(state.letter().content).blocks[1].content).toEqual([]);

  await blocks.last().click();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(blocks).toHaveCount(7);
  await page.keyboard.press("Backspace");
  await expect(blocks).toHaveCount(6);
  expect(JSON.parse(state.letter().content).blocks).toHaveLength(4);
  await page.keyboard.type("Typed after Enter");
  await expect(editor).toContainText("Typed after Enter");
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(editor).not.toContainText("Typed after Enter");
  await page.keyboard.press("ControlOrMeta+Shift+Z");
  await expect(editor).toContainText("Typed after Enter");
  await expect
    .poll(() => text(JSON.parse(state.letter().content).blocks), {
      timeout: 60_000,
    })
    .toContain("Typed after Enter");
  // The blank lines typed before the text are kept as intentional gaps.
  expect(JSON.parse(state.letter().content).blocks).toHaveLength(6);
});

test("the letter text style menu changes the block type", async ({ page }) => {
  const state = await fixture(
    page,
    JSON.stringify({
      version: 1,
      blocks: [{ id: "first", type: "paragraph", content: "Make me a heading" }],
    }),
  );
  const editor = page.locator(".letter-composer-document .bn-editor");
  await editor.getByText("Make me a heading").click({ timeout: 60_000 });

  const trigger = page
    .getByRole("toolbar", { name: "Letter formatting" })
    .getByRole("button", { name: "Text style" });
  await expect(trigger).toContainText("Paragraph");
  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveCount(8);
  await expect(menu).not.toContainText("Toggle");
  await expect(menu).not.toContainText("Heading 4");
  await menu.getByRole("menuitem", { name: "Heading 2" }).click();

  await expect(trigger).toContainText("Heading 2");
  await expect
    .poll(() => JSON.parse(state.letter().content).blocks[0], { timeout: 60_000 })
    .toMatchObject({ type: "heading", props: { level: 2 } });
  await page.keyboard.type(" now");
  await expect(editor).toContainText("Make me a heading now");
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
    if (format === "portrait") {
      await openStudio(page);
    }
    await openStudio(page);
    expect(text(state.exported().pages?.slice(1).flatMap((p) => p.blocks))).toBe(text(JSON.parse(original).blocks));
    await openStudio(page);
    const studio = studioRegion(page);
    await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
    await expect(studio.locator(".bn-editor")).toBeVisible();
    for (const scale of [140, 70, 100]) {
      const count = state.updates.length;
      await studio.getByRole("slider", { name: "Text size for all pages", exact: true }).evaluate((node, value) => {
        const input = node as HTMLInputElement;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(value));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, scale);
      await expect.poll(() => state.updates.length, { timeout: 60_000 }).toBeGreaterThan(count);
      await expect(studio.getByText("Saved", { exact: true })).toBeVisible();
      expect(text(state.exported().pages?.slice(1).flatMap((p) => p.blocks))).toBe(text(JSON.parse(original).blocks));
      expect(new Set(state.exported().pages?.slice(1).map((page) => page.text_scale))).toEqual(new Set([scale / 100]));
      for (const p of state.exported().pages!.slice(1)) {
        await studio.getByRole("button", { name: `Edit page ${p.number}`, exact: true }).click();
        await expect(studio.locator(".bn-editor")).toBeVisible();
        await expect.poll(() => studio.locator(".bn-editor").evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
      }
      await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
    }
  });
}

test("long letters create every page they need without blocking preparation", async ({ page }) => {
  const original = document(350);
  const state = await fixture(page, original, "landscape");
  await openStudio(page, 120_000);
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
    page.getByRole("button", { name: "Edit page 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(text(state.exported().pages?.slice(1).flatMap((p) => p.blocks))).toBe(
    text(JSON.parse(original).blocks),
  );
});

test("page numbers exclude the cover and remain visible across page layouts", async ({
  page,
}) => {
  await fixture(page, document(100));
  await openStudio(page);

  const studio = studioRegion(page);
  const canvas = studio.locator("[data-studio-canvas] [data-page-canvas]");
  await expect(canvas).toHaveAttribute("data-page-layout", "cover");
  await expect(canvas.locator("[data-page-number]")).toHaveCount(0);
  await expect(canvas).toHaveAttribute("aria-label", "Editable social cover");

  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(canvas.locator("[data-page-number]")).toHaveText("1");
  await expect(canvas).toHaveAttribute("aria-label", "Editable social page 1");

  await studio.getByRole("button", { name: "Featured quote" }).click();
  await expect(canvas).toHaveAttribute("data-page-layout", "quote");
  await expect(canvas.locator("[data-page-number]")).toHaveText("1");

  await studio.getByRole("button", { name: "Edit page 3", exact: true }).click();
  await expect(canvas.locator("[data-page-number]")).toHaveText("2");
  await expect(canvas).toHaveAttribute("aria-label", "Editable social page 2");
});

test("the closing signature follows the cover author and blank details stay hidden", async ({ page }) => {
  const state = await fixture(page, document(2));
  await openStudio(page);

  const studio = studioRegion(page);
  const canvas = studio.locator("[data-studio-canvas] [data-page-canvas]");
  await openCoverSection(studio, "Author");
  const authorName = studio.getByRole("textbox", { name: "Name", exact: true });
  const username = studio.getByRole("textbox", { name: "Username" });
  await expect(authorName).toHaveValue("Test Author");
  await expect(username).toHaveValue("@author");

  await authorName.fill("Guest Writer");
  await username.fill("");
  await expect.poll(() => state.exported().pages?.at(-1)?.signature, { timeout: 60_000 }).toEqual({ name: "Guest Writer", handle: "" });
  expect(state.exported().pages?.[0].cover?.author_name).toBe("Guest Writer");
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(canvas).toContainText("Guest Writer");
  await expect(canvas).not.toContainText("@author");

  await studio.getByRole("button", { name: "Edit author" }).click();
  await authorName.fill("");
  await username.fill("guest.writer");
  await expect.poll(() => state.exported().pages?.at(-1)?.signature, { timeout: 60_000 }).toEqual({ name: "", handle: "guest.writer" });
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(canvas).toContainText("guest.writer");
  await expect(canvas).not.toContainText("Guest Writer");

  await studio.getByRole("button", { name: "Edit author" }).click();
  await username.fill("");
  await expect.poll(() => state.exported().pages?.at(-1)?.signature, { timeout: 60_000 }).toEqual({ name: "", handle: "" });
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(canvas.locator(".letter-page-signature")).toHaveCount(0);

  await studio.getByRole("button", { name: "Featured quote" }).click();
  await expect(canvas).toHaveAttribute("data-page-layout", "quote");
  await expect(canvas.locator(".letter-page-signature")).toHaveCount(0);
  await expect(canvas).not.toContainText("Medasin");

  await backToEditor(page);
  await expect(studio).toBeHidden();
  await openStudio(page);
  await openCoverSection(studioRegion(page), "Author");
  await expect(studioRegion(page).getByRole("textbox", { name: "Name", exact: true })).toHaveValue("");
  await expect(studioRegion(page).getByRole("textbox", { name: "Username" })).toHaveValue("");
});

test("the page workspace closes while pending edits save", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    updateDelayMs: 1_500,
  });
  await openStudio(page);

  const studio = studioRegion(page);
  await studio.getByRole("textbox", { name: "Subheader" }).fill("CLOSE NOW");
  await backToEditor(page);

  await expect(studio).toBeHidden({ timeout: 500 });
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
  await openStudio(page);

  const studio = studioRegion(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const bodyEditor = studio.locator(
    '[data-studio-canvas] .letter-page-document [contenteditable="true"]',
  );
  await bodyEditor.fill("A page draft that must survive autosave.");

  await expect
    .poll(() => state.updates.length, { timeout: 60_000 })
    .toBeGreaterThan(0);
  await expect(bodyEditor).toContainText("A page draft that must survive autosave.");

  await studio.getByRole("button", { name: "Edit page 1", exact: true }).click();
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(bodyEditor).toContainText("A page draft that must survive autosave.");

  await bodyEditor.press("End");
  await bodyEditor.pressSequentially(" Final words.");
  await backToEditor(page);
  await expect(studio).toBeHidden({ timeout: 60_000 });
  await expect
    .poll(
      () => text(state.exported().pages?.slice(1).flatMap((item) => item.blocks)),
      { timeout: 60_000 },
    )
    .toContain("A page draft that must survive autosave. Final words.");
});

test("text edits and one shared size survive delayed saves and reopening", async ({ page }) => {
  const state = await fixture(page, document(60), "portrait", { updateDelayMs: 800 });
  await openStudio(page);
  const studio = studioRegion(page);
  const coverSize = await studio.getByRole("slider", { name: "Overall text size" }).inputValue();
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const size = studio.getByRole("slider", { name: "Text size for all pages" });
  await setRangeValue(size, 120);
  const editor = studio.locator('[data-studio-canvas] .letter-page-document [contenteditable="true"]');
  await editor.press("End");
  await editor.pressSequentially(" A saved addition.");
  await backToEditor(page);
  await expect(studio).toBeHidden({ timeout: 60_000 });

  await expect.poll(() => state.letter().content).toContain("A saved addition.");
  expect(state.exported().pages?.[0].text_scale).toBe(Number(coverSize) / 100);
  expect(new Set(state.exported().pages?.slice(1).map((item) => item.text_scale))).toEqual(new Set([1.2]));
  expect(new Set(state.exported().pages?.slice(1).map((item) => item.text_scale_mode))).toEqual(new Set(["manual"]));

  await openStudio(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(studio.getByRole("slider", { name: "Text size for all pages" })).toHaveValue("120");
  await expect(studio.locator('[data-studio-canvas] .letter-page-document [contenteditable="true"]')).toContainText("A saved addition.");
});

test("dark background applies to cover, body, rich text, logos, and thumbnails", async ({
  page,
}) => {
  await fixture(page, document(2));
  await openStudio(page);

  const studio = studioRegion(page);
  await studio.getByRole("button", { name: "Dark", exact: true }).click();

  const coverCanvas = studio.locator('[data-studio-canvas] [data-page-layout="cover"]');
  const coverEditor = coverCanvas.locator(".letter-cover-description");
  await expect(coverCanvas).toHaveAttribute("data-page-theme", "dark");
  await expect(coverEditor.locator(".bn-root").first()).toHaveAttribute(
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
  const bodyThumbnail = studio
    .getByRole("button", { name: "Edit page 2" })
    .locator('[data-page-theme="dark"]');
  await expect(bodyThumbnail).toBeVisible();
  await studio.getByRole("button", { name: "Edit page 2" }).click();

  const bodyCanvas = studio.locator('[data-studio-canvas] [data-page-layout="body"]');
  await expect(bodyCanvas).toHaveAttribute("data-page-theme", "dark");
  await expect(bodyCanvas.locator(".bn-root").first()).toHaveAttribute(
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

  await studio.getByRole("button", { name: "Edit page 1" }).click();
  await studio.getByRole("button", { name: "Light", exact: true }).click();
  await studio.getByRole("button", { name: "Edit page 2" }).click();

  await expect(bodyCanvas).toHaveAttribute("data-page-theme", "light");
  await expect(bodyCanvas.locator(".bn-root").first()).toHaveAttribute(
    "data-color-scheme",
    "light",
  );
  const lightEditorColor = await bodyCanvas
    .locator(".bn-editor")
    .evaluate((element) => getComputedStyle(element).color);
  expect(lightEditorColor).not.toBe(darkEditorColor);
});

test("cover font sizes adjust independently and persist in previews and downloads", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    subtitle: "A short cover body.",
  });
  await openStudio(page);

  const studio = studioRegion(page);
  const cover = studio.locator('[data-studio-canvas] [data-page-layout="cover"]');
  const fonts = async (canvas: Locator) =>
    canvas.evaluate((element) => {
      const size = (selector: string) => {
        const target = element.querySelector(selector);
        if (!target) throw new Error(`Missing cover text: ${selector}`);
        return Number.parseFloat(getComputedStyle(target).fontSize);
      };
      return {
        subheader: size('[data-cover-section="header"] p'),
        title: size('[data-cover-section="title"] h2'),
        body: size('.letter-cover-description .bn-editor'),
      };
    });
  const initial = await fonts(cover);
  const subheaderSize = studio.getByRole("slider", { name: "Subheader size" });
  const titleSize = studio.getByRole("slider", { name: "Title size" });
  const bodySize = studio.getByRole("slider", { name: "Cover body text size" });
  const overallSize = studio.getByRole("slider", { name: "Overall text size" });
  await expect(subheaderSize).toHaveValue("100");
  await expect(titleSize).toHaveValue("100");
  await expect(bodySize).toHaveValue("100");

  await setRangeValue(subheaderSize, 130);
  let changed = await fonts(cover);
  expect(changed.subheader).toBeCloseTo(initial.subheader * 1.3, 1);
  expect(changed.title).toBeCloseTo(initial.title, 1);
  expect(changed.body).toBeCloseTo(initial.body, 1);

  await setRangeValue(titleSize, 90);
  await setRangeValue(bodySize, 120);
  await setRangeValue(overallSize, 110);
  await expect.poll(() => state.exported().pages?.[0].cover?.subheader_font_scale).toBe(1.3);
  await expect.poll(() => state.exported().pages?.[0].cover?.title_font_scale).toBe(0.9);
  await expect.poll(() => state.exported().pages?.[0].cover?.body_font_scale).toBe(1.2);
  await expect(studio.getByText("Saved", { exact: true })).toBeVisible();
  changed = await fonts(cover);
  expect(changed.subheader).toBeCloseTo(initial.subheader * 1.3 * 1.1, 1);
  expect(changed.title).toBeCloseTo(initial.title * 0.9 * 1.1, 1);
  expect(changed.body).toBeCloseTo(initial.body * 1.2 * 1.1, 1);

  const downloadPromise = page.waitForEvent("download");
  await studio.getByRole("button", { name: "Current page" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/page-01\.png$/);
  expect(await download.failure()).toBeNull();

  await backToEditor(page);
  await openStudio(page);
  const reopenedFonts = await fonts(cover);
  expect(reopenedFonts.subheader).toBeCloseTo(changed.subheader, 1);
  expect(reopenedFonts.title).toBeCloseTo(changed.title, 1);
  expect(reopenedFonts.body).toBeCloseTo(changed.body, 1);
  await expect(subheaderSize).toHaveValue("130");
  await expect(titleSize).toHaveValue("90");
  await expect(bodySize).toHaveValue("120");
  await expect(overallSize).toHaveValue("110");
  await studio.getByRole("button", { name: "Reset cover sizes" }).click();
  await expect.poll(() => state.exported().pages?.[0].cover?.subheader_font_scale).toBe(1);
  await expect.poll(() => state.exported().pages?.[0].cover?.title_font_scale).toBe(1);
  await expect.poll(() => state.exported().pages?.[0].cover?.body_font_scale).toBe(1);
  expect((await fonts(cover)).title).toBeCloseTo(initial.title * 1.1, 1);
});

test("a full cover shows a guide banner, pauses downloads, and recovers", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    subtitle: "Cover copy long enough that it cannot fit even at its smallest size. ".repeat(40).trim(),
    initialHeroImageUrl: "/storage/existing-cover.png",
  });
  const studio = await openStudio(page);
  const cover = studio.locator('[data-studio-canvas] [data-page-layout="cover"]');
  const banner = studio.locator("[data-cover-full-banner]");

  await expect(banner).toBeVisible();
  await expect(banner).toContainText("The cover is full");
  await expect(cover).toHaveAttribute("data-cover-fit", "overflow");
  await expect(studio.getByRole("button", { name: "Current page" })).toBeDisabled();
  await expect(studio.getByRole("button", { name: "Download all" })).toBeDisabled();
  // The entry is clipped on the cover instead of pushing the image off it.
  const layout = await cover.evaluate((canvas: HTMLElement) => {
    const main = canvas.querySelector<HTMLElement>("[data-cover-main]")!;
    const hero = canvas.querySelector<HTMLElement>('[data-cover-section="hero"]')!;
    return {
      heroBottom: hero.offsetTop - main.offsetTop + hero.offsetHeight,
      mainHeight: main.clientHeight,
      overflow: main.scrollHeight - main.clientHeight,
    };
  });
  expect(layout.heroBottom).toBeLessThanOrEqual(layout.mainHeight + 1);
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(
    state.exported().pages?.some(
      (item) => item.layout !== "cover" && item.content_source === "cover_entry",
    ),
  ).toBe(false);

  await cover
    .locator('.letter-cover-description [contenteditable="true"]')
    .fill("A short excerpt.");
  await expect(banner).toHaveCount(0);
  await expect(cover).toHaveAttribute("data-cover-fit", "natural");
  await expect(studio.getByText("Saved", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(studio.getByRole("button", { name: "Current page" })).toBeEnabled();
});

test("older exports fold cover continuation pages back into the cover", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    subtitle: "The whole excerpt, Library in",
    legacyCoverContinuation: true,
  });
  const studio = await openStudio(page);
  await expect
    .poll(
      () =>
        state.exported().pages?.some(
          (item) => item.layout !== "cover" && item.content_source === "cover_entry",
        ),
      { timeout: 60_000 },
    )
    .toBe(false);
  await expect(studio.getByRole("button", { name: "Edit page 3", exact: true })).toHaveCount(0);
  await expect(
    studio.locator('[data-studio-canvas] [data-page-layout="cover"] .letter-cover-description'),
  ).toContainText("The whole excerpt, Library in");
});

test("cover controls persist styling, metadata, and image removal", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    initialHeroImageUrl: "http://localhost/storage/existing-cover.png",
    initialHeroAspectRatio: 1.25,
  });
  await openStudio(page);
  const studio = studioRegion(page);

  await studio.getByRole("button", { name: "Dark", exact: true }).click();
  await studio.getByRole("switch", { name: "Show Medasin logo" }).click();
  await studio.getByRole("textbox", { name: "Subheader" }).fill("CIPER DATASETS");
  await openCoverSection(studio, "Author");
  await studio.getByRole("textbox", { name: "Name", exact: true }).fill("Ciper");
  await studio
    .getByRole("slider", { name: "Overall text size", exact: true })
    .evaluate((node) => {
      const input = node as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!
        .set!.call(input, "100");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await openCoverSection(studio, "Arrange");
  await expect(studio.getByRole("button", { name: "Reorder Title" })).toBeVisible();
  await expect(
    studio.getByRole("button", { name: "Reorder Cover body text" }),
  ).toBeVisible();
  await expect(studio.getByRole("button", { name: "Reorder Byline" })).toBeVisible();
  const coverBody = studio.locator(
    '[data-studio-canvas] .letter-cover-description [contenteditable="true"]',
  );
  await coverBody.fill("A formatted cover description");
  const coverCanvas = studio.locator('[data-studio-canvas] [data-page-layout="cover"]');
  const coverTitle = coverCanvas.getByRole("textbox", {
    name: "Cover title",
  });
  const coverSubheader = coverCanvas.locator(
    '[data-cover-section="header"] p',
  );
  const coverHero = coverCanvas.locator('[data-cover-section="hero"]');
  const coverByline = coverCanvas.locator('[data-cover-section="author"]');
  await expect(coverTitle).toHaveCSS("font-size", "75.6px");
  await expect(coverSubheader).toHaveCSS("font-size", "21.6px");
  await expect(coverTitle).toHaveCSS("text-align", "left");
  await expect(coverBody.locator(".bn-block-content").first()).toHaveCSS(
    "text-align",
    "left",
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
  expect(heroFrame.heightFraction).toBeLessThanOrEqual(0.49);
  const bylineTop = await coverByline.evaluate((element) => element.getBoundingClientRect().top);
  const titleBottom = await coverTitle.evaluate((element) => element.getBoundingClientRect().bottom);
  expect(bylineTop).toBeGreaterThan(titleBottom);
  await expect(coverCanvas.locator('[data-cover-section="logo"]')).toHaveCount(0);
  const coverTextAlignment = studio.getByRole("group", { name: "Text alignment" });
  await coverTextAlignment.getByRole("button", { name: "Center", exact: true }).click();
  await expect(
    coverTextAlignment.getByRole("button", { name: "Center", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(coverSubheader).toHaveCSS("text-align", "center");
  await expect(coverTitle).toHaveCSS("text-align", "center");
  await expect(coverBody.locator(".bn-block-content").first()).toHaveCSS(
    "text-align",
    "center",
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
  await expect(studio).toBeVisible();
  await expect(studio.getByText("Saved", { exact: true })).toBeVisible({ timeout: 60_000 });

  const heroControl = await heroImageControl(studio);
  const updateCount = state.updates.length;
  await heroControl.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(studio.locator('[data-cover-section="hero"]')).toHaveCount(0);
  await expect
    .poll(() => state.updates.length, { timeout: 60_000 })
    .toBeGreaterThan(updateCount);

  await expect(coverByline).toBeVisible();

  await expect.poll(() => state.updates.length, { timeout: 60_000 }).toBeGreaterThan(0);
  await expect(studio.getByText("Saved", { exact: true })).toBeVisible();
  const cover = state.exported().pages?.[0].cover;
  expect(cover?.theme).toBe("dark");
  expect(cover?.show_logo).toBe(false);
  expect(cover?.text_alignment).toBe("center");
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
  await openStudio(page);

  const studio = studioRegion(page);
  const heroControl = await heroImageControl(studio);
  const captionInput = studio.getByRole("textbox", { name: "Cover image caption" });
  await expect(captionInput).toBeHidden();

  let cropDialog = await chooseCoverImage(page, heroControl, "first-cover.png");
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 }).toBe("/storage/uploaded-cover-2.png");

  await expect(captionInput).toBeVisible();
  await expect(captionInput).toHaveAttribute("maxlength", "120");
  await captionInput.fill("A quiet view of the city");
  const alignment = studio.getByRole("group", { name: "Caption alignment" });
  const placement = studio.getByRole("group", { name: "Caption placement" });
  const hero = studio.locator('[data-studio-canvas] [data-cover-section="hero"]');
  await expect(placement.getByRole("button", { name: "On image" })).toHaveAttribute("aria-pressed", "true");
  await expect(hero).toHaveAttribute("data-caption-placement", "overlay");
  await alignment.getByRole("button", { name: "Right", exact: true }).click();
  await placement.getByRole("button", { name: "Below image" }).click();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption, { timeout: 60_000 }).toBe("A quiet view of the city");
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption_alignment, { timeout: 60_000 }).toBe("right");
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption_placement, { timeout: 60_000 }).toBe("below");

  cropDialog = await chooseCoverImage(page, heroControl, "second-cover.png");
  expect(state.exported().pages?.[0].cover?.hero_image_url).toBe("/storage/uploaded-cover-2.png");
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 }).toBe("/storage/uploaded-cover-4.png");
  expect(state.mediaUploads()).toBe(4);
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
  await backToEditor(page);
  await expect(studio).toBeHidden();

  await openStudio(page);
  await expect(hero).toContainText("A quiet view of the city");
  await expect(hero).toHaveAttribute("data-caption-placement", "below");
  await heroImageControl(studio);
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
  await expect(studio.locator('[data-studio-canvas] [data-cover-section="hero"]')).toHaveCount(0);
});

test("saved cover edits carry across formats and a letter reload", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    subtitle: "A short cover body.",
    initialCoverDescriptionBlocks: [{
      id: "cover-paragraph",
      type: "paragraph",
      content: [
        { type: "text", text: "A short", styles: { bold: true } },
        { type: "text", text: " cover body.", styles: {} },
      ],
    }],
    updateDelayMs: 500,
  });
  await openStudio(page);
  const studio = studioRegion(page);

  await studio.getByRole("button", { name: "Dark", exact: true }).click();
  await studio.getByRole("textbox", { name: "Subheader" }).fill("SAVED COVER");
  await setRangeValue(studio.getByRole("slider", { name: "Subheader size" }), 90);
  await setRangeValue(studio.getByRole("slider", { name: "Title size" }), 95);
  await setRangeValue(studio.getByRole("slider", { name: "Cover body text size" }), 90);

  const heroControl = await heroImageControl(studio);
  const cropDialog = await chooseCoverImage(page, heroControl, "saved-cover.png");
  await cropDialog.getByRole("button", { name: "4:5" }).click();
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await studio.getByRole("textbox", { name: "Cover image caption" }).fill("Saved caption");
  await studio.getByRole("group", { name: "Caption placement" })
    .getByRole("button", { name: "Below image" }).click();

  await backToEditor(page);
  await expect(studio).toBeHidden({ timeout: 60_000 });
  const savedCover = structuredClone(state.exported().pages?.[0].cover);
  expect(savedCover?.hero_image_url).toBe("/storage/uploaded-cover-2.png");
  expect(JSON.stringify(savedCover?.description_blocks)).toContain('"bold":true');

  await openStudio(page);
  await studio.getByRole("button", { name: "Square 1:1" }).click();
  await expect.poll(() => state.exported().format, { timeout: 60_000 }).toBe("square");
  expect(state.exportsCreated()).toBe(2);
  expect(state.exported().pages?.[0].cover).toEqual(savedCover);
  expect(state.mediaUploads()).toBe(2);

  await backToEditor(page);
  await page.reload();
  await openStudio(page);
  await studio.getByRole("button", { name: "Story 9:16" }).click();
  await expect.poll(() => state.exported().format, { timeout: 60_000 }).toBe("story");
  expect(state.exportsCreated()).toBe(3);
  expect(state.exported().pages?.[0].cover).toEqual(savedCover);
  expect(state.mediaUploads()).toBe(2);
});

test("a new letter title updates the cover while its text, image and styling persist", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    subtitle: "Original description",
    invalidateExportOnLetterUpdate: true,
  });
  await openStudio(page);
  const studio = studioRegion(page);
  await studio.getByRole("textbox", { name: "Subheader" }).fill("LETTER DESIGN");
  const heroControl = await heroImageControl(studio);
  const cropDialog = await chooseCoverImage(page, heroControl, "letter-cover.png");
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await backToEditor(page);
  await expect(studio).toBeHidden({ timeout: 60_000 });

  await page.getByRole("textbox", { name: "Letter title" }).fill("Updated letter title");
  await openStudio(page);
  await expect.poll(() => state.exportsCreated(), { timeout: 60_000 }).toBe(2);
  const updatedCoverPage = state.exported().pages?.[0];
  expect(updatedCoverPage?.title).toBe("Updated letter title");
  expect(text(updatedCoverPage?.cover?.description_blocks)).toBe("Original description");
  expect(updatedCoverPage?.cover?.hero_image_url).toBe("/storage/uploaded-cover-2.png");
  expect(updatedCoverPage?.cover?.subheader).toBe("LETTER DESIGN");

  await waitForCurrentPages(studio);
  await heroImageControl(studio);
  await heroControl.getByRole("button", { name: "Remove", exact: true }).click();
  await backToEditor(page);
  await expect(studio).toBeHidden({ timeout: 60_000 });

  await page.getByRole("textbox", { name: "Letter title" }).fill("Newest letter title");
  await openStudio(page);
  await expect.poll(() => state.exportsCreated(), { timeout: 60_000 }).toBe(3);
  expect(state.exported().pages?.[0].title).toBe("Newest letter title");
  expect(state.exported().pages?.[0].cover?.hero_image_url).toBeNull();
  expect(state.exported().pages?.[0].cover?.subheader).toBe("LETTER DESIGN");
  expect(state.mediaUploads()).toBe(2);
});

test("legacy image captions stay on the image", async ({ page }) => {
  await fixture(page, document(2), "portrait", {
    initialHeroImageUrl: "http://localhost/storage/existing-cover.png",
    legacyCaptionPlacement: true,
  });
  await openStudio(page);

  const studio = studioRegion(page);
  await openCoverSection(studio, "Images");
  await expect(studio.getByRole("group", { name: "Caption placement" }).getByRole("button", { name: "On image" })).toHaveAttribute("aria-pressed", "true");
  const caption = studio.locator('[data-studio-canvas] [data-cover-hero-caption]');
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
    const studio = await openStudio(page);
    if (format !== "portrait") {
      const { name, ratio, width, height } = LETTER_EXPORT_FORMATS[format];
      await studio.getByRole("button", { name: `${name} ${ratio}` }).click();
      await expect.poll(() => state.exported().format, { timeout: 60_000 }).toBe(format);
      await expect(studio.getByText(`${width}×${height}`)).toBeAttached({ timeout: 60_000 });
    }
    if (format === "story") {
      const titleSize = studio.getByRole("slider", { name: "Title size" });
      await titleSize.scrollIntoViewIfNeeded();
      await titleSize.focus();
      await titleSize.press("ArrowRight");
      await expect(titleSize).toHaveValue("105");
      await expect.poll(() => state.exported().pages?.[0].cover?.title_font_scale).toBe(1.05);
    }
    const longCaption = "A city view with layers of quiet detail and people finding their way through an ordinary afternoon. ".repeat(2).slice(0, 120);
    await openCoverSection(studio, "Images");
    await studio.getByRole("textbox", { name: "Cover image caption" }).fill(longCaption);
    await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption, { timeout: 60_000 }).toBe(longCaption);
    const editorCanvas = studio.locator('[data-studio-canvas] [data-page-layout="cover"]');
    await expectCoverColumnAlignment(editorCanvas, "overlay");
    await backToEditor(page);
    await expect(studio).toBeHidden();
    await openStudio(page);
    await expectCoverColumnAlignment(editorCanvas, "overlay");

    await openCoverSection(studio, "Images");
    await studio.getByRole("group", { name: "Caption placement" }).getByRole("button", { name: "Below image" }).click();
    await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption_placement, { timeout: 60_000 }).toBe("below");
    await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_caption, { timeout: 60_000 }).toBe(longCaption);

    const hero = editorCanvas.locator('[data-cover-section="hero"]');
    await expect(hero.locator("[data-cover-hero-caption]")).toHaveText(longCaption);
    const geometry = await expectCoverColumnAlignment(editorCanvas, "below");
    expect(geometry.image.width / geometry.image.height).toBeGreaterThanOrEqual(aspectRatio - 0.01);
    await backToEditor(page);
    await expect(studio).toBeHidden();
    await openStudio(page);
    await expectCoverColumnAlignment(editorCanvas, "below");
  });
}

test("pages with a cover image save while another page is open", async ({ page }) => {
  const state = await fixture(page, document(4), "portrait", {
    initialHeroImageUrl: "/storage/existing-cover.png",
    uncachedCoverImages: true,
  });
  const studio = await openStudio(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const editor = studio.locator('[data-studio-canvas] [data-page-canvas] .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible();
  const updates = state.updates.length;
  await editor.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Still saving.");

  await expect.poll(() => state.updates.length, { timeout: 60_000 }).toBeGreaterThan(updates);
  await expect(studio.getByText("The page could not finish rendering. Please try again.")).toHaveCount(0);
  expect(text(state.exported().pages?.at(-1)?.blocks)).toContain("Still saving.");
  // Off-screen measuring renders never load lazy images, so cover images load eagerly.
  await studio.getByRole("button", { name: "Edit page 1", exact: true }).click();
  await expect(
    studio.locator("[data-studio-canvas] [data-cover-hero-image] img"),
  ).toHaveAttribute("loading", "eager");
});

test("the cover byline sits under the title and its toggles hide it", async ({ page }) => {
  const state = await fixture(page, document(2));
  const studio = await openStudio(page);
  const canvas = studio.locator("[data-studio-canvas] [data-page-canvas]");
  const byline = canvas.locator('[data-cover-section="author"]');

  await expect(byline.locator("[data-cover-byline-name]")).toHaveText("Test Author");
  await expect(byline.locator("[data-cover-byline-meta]")).toHaveText("@author");
  const order = await canvas
    .locator("[data-cover-main] > [data-cover-section]")
    .evaluateAll((sections) => sections.map((section) => section.getAttribute("data-cover-section")));
  expect(order).toEqual(["header", "title", "entry", "author"]);

  await openCoverSection(studio, "Author");
  await studio.getByRole("switch", { name: "Show date" }).click();
  await studio.getByRole("textbox", { name: "Username" }).fill("@reader");
  await expect(byline.locator("[data-cover-byline-meta]")).toHaveText("@reader");
  await studio.getByRole("switch", { name: "Show byline" }).click();
  await expect(byline).toHaveCount(0);
  await expect.poll(() => state.exported().pages?.[0].cover?.show_author, { timeout: 60_000 }).toBe(false);
  expect(state.exported().pages?.[0].cover).toMatchObject({
    author_handle: "@reader",
    show_date: false,
  });
});

test("centered bylines keep the avatar inline with the name", async ({ page }) => {
  await fixture(page, document(2), "portrait", {
    profileImageUrl: "/storage/existing-cover.png",
  });
  const studio = await openStudio(page);
  const byline = studio.locator('[data-studio-canvas] [data-cover-section="author"]');
  const box = (selector: string) =>
    byline.locator(selector).evaluate((element) => {
      const { top, bottom, left, right } = element.getBoundingClientRect();
      return { top, bottom, left, right };
    });

  await expect(byline).toHaveAttribute("data-byline-layout", "stacked");
  let avatar = await box("[data-cover-byline-avatar]");
  let name = await box("[data-cover-byline-name]");
  let meta = await box("[data-cover-byline-meta]");
  expect(avatar.right).toBeLessThan(name.left);
  expect(avatar.right).toBeLessThan(meta.left);

  await studio
    .getByRole("group", { name: "Text alignment" })
    .getByRole("button", { name: "Center", exact: true })
    .click();
  await expect(byline).toHaveAttribute("data-byline-layout", "inline");
  avatar = await box("[data-cover-byline-avatar]");
  name = await box("[data-cover-byline-name]");
  meta = await box("[data-cover-byline-meta]");
  const avatarMiddle = (avatar.top + avatar.bottom) / 2;
  expect(avatarMiddle).toBeGreaterThan(name.top);
  expect(avatarMiddle).toBeLessThan(name.bottom);
  expect(avatar.right).toBeLessThan(name.left);
  expect(meta.top).toBeGreaterThanOrEqual(avatar.bottom - 1);
});

test("the byline can sit beside the logo at the bottom of the cover", async ({ page }) => {
  const state = await fixture(page, document(2));
  const studio = await openStudio(page);
  const canvas = studio.locator("[data-studio-canvas] [data-page-layout='cover']");
  await openCoverSection(studio, "Author");
  await studio
    .getByRole("group", { name: "Byline placement" })
    .getByRole("button", { name: "Beside logo" })
    .click();

  const footer = canvas.locator("[data-cover-footer]");
  await expect(footer.locator('[data-cover-section="author"]')).toContainText("Test Author");
  await expect(canvas.locator('[data-cover-main] [data-cover-section="author"]')).toHaveCount(0);
  const [byline, logo] = await Promise.all(
    ['[data-cover-section="author"]', '[data-cover-section="logo"]'].map((selector) =>
      footer.locator(selector).evaluate((element) => {
        const { top, bottom, left, right } = element.getBoundingClientRect();
        return { middle: (top + bottom) / 2, left, right };
      }),
    ),
  );
  expect(Math.abs(byline.middle - logo.middle)).toBeLessThan(4);
  expect(byline.right).toBeLessThan(logo.left);
  await expect.poll(() => state.exported().pages?.[0].cover?.byline_placement, { timeout: 60_000 }).toBe("bottom");

  await openCoverSection(studio, "Arrange");
  await expect(studio.getByRole("button", { name: "Reorder Byline" })).toHaveCount(0);

  await studio
    .getByRole("group", { name: "Byline placement" })
    .getByRole("button", { name: "Under title" })
    .click();
  await expect(canvas.locator('[data-cover-main] [data-cover-section="author"]')).toContainText("Test Author");
  await expect(studio.getByRole("button", { name: "Reorder Byline" })).toBeVisible();
});

test("editing the cover title draws no box over its neighbours", async ({ page }) => {
  const state = await fixture(page, document(2));
  const studio = await openStudio(page);
  const title = studio.locator("[data-studio-canvas]").getByRole("textbox", { name: "Cover title" });

  await title.dblclick();
  await expect(title).toBeFocused();
  await expect(title).toHaveCSS("box-shadow", "none");
  await expect(title).toHaveCSS("outline-style", "none");

  await page.keyboard.press("End");
  await page.keyboard.type(" today");
  await expect.poll(() => state.exported().pages?.[0].title, { timeout: 60_000 }).toBe("A measured letter today");
});

test("clicking into the cover title and out keeps the cover as it was", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", {
    subtitle: "A short excerpt under the title.",
    initialHeroImageUrl: "/storage/existing-cover.png",
  });
  const studio = await openStudio(page);
  await setRangeValue(studio.getByRole("slider", { name: "Overall text size", exact: true }), 85);
  await expect.poll(() => state.exported().pages?.[0].text_scale_mode, { timeout: 60_000 }).toBe("manual");
  await expect(studio.getByText("Saved", { exact: true })).toBeVisible({ timeout: 60_000 });
  // Let the slider's trailing save settle before counting.
  await page.waitForTimeout(2_500);
  const updates = state.updates.length;

  const canvas = studio.locator("[data-studio-canvas]");
  await canvas.getByRole("textbox", { name: "Cover title" }).dblclick();
  await canvas.click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(2_500);

  expect(state.updates.length).toBe(updates);
  expect(state.exported().pages?.[0]).toMatchObject({ text_scale: 0.85, text_scale_mode: "manual" });
  await expect(studio.getByText("Saved", { exact: true })).toBeVisible();
});

test("cover sections follow a spacing rhythm", async ({ page }) => {
  await fixture(page, document(2), "portrait", {
    subtitle: "A short excerpt under the title.",
    initialHeroImageUrl: "/storage/existing-cover.png",
  });
  const studio = await openStudio(page);
  const canvas = studio.locator("[data-studio-canvas] [data-page-layout='cover']");
  const bounds = await canvas.evaluate((element) =>
    Object.fromEntries(
      ["header", "title", "entry", "author", "hero"].map((name) => {
        const section = element.querySelector(`[data-cover-section="${name}"]`);
        if (!section) throw new Error(`Cover section is missing: ${name}`);
        const { top, bottom } = section.getBoundingClientRect();
        return [name, { top, bottom }];
      }),
    ),
  );

  const kickerGap = bounds.title.top - bounds.header.bottom;
  const bylineGap = bounds.author.top - bounds.entry.bottom;
  const imageGap = bounds.hero.top - bounds.author.bottom;
  expect(kickerGap).toBeLessThan(bylineGap);
  expect(bylineGap).toBeLessThan(imageGap);
});

test("centered cover quotes drop the side bar", async ({ page }) => {
  await fixture(page, document(2), "portrait", {
    initialCoverDescriptionBlocks: [{ type: "quote", content: "A line worth pulling out." }],
  });
  const studio = await openStudio(page);
  const quote = studio.locator("[data-studio-canvas] .letter-cover-description blockquote");
  await expect(quote).toHaveCSS("border-left-style", "solid");

  await studio
    .getByRole("group", { name: "Text alignment" })
    .getByRole("button", { name: "Center", exact: true })
    .click();
  await expect(quote).toHaveCSS("border-left-style", "none");
  await expect(quote).toHaveCSS("font-style", "italic");
});

test("the cover author signs off the last page", async ({ page }) => {
  const state = await fixture(page, document(2));
  const studio = await openStudio(page);
  await openCoverSection(studio, "Author");
  await studio.getByRole("textbox", { name: "Name", exact: true }).fill("Mina Reyes");

  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const signature = studio.locator("[data-studio-canvas] [data-page-canvas] .letter-page-signature");
  await expect(signature).toContainText("Mina Reyes");
  await expect(signature).toContainText("@author");
  await expect(studio.getByText("Signed as Mina Reyes · @author.")).toBeVisible();
  await expect.poll(() => state.exported().pages?.at(-1)?.signature?.name, { timeout: 60_000 }).toBe("Mina Reyes");

  await studio.getByRole("switch", { name: "Show closing signature" }).click();
  await expect(signature).toHaveCount(0);
  await expect.poll(() => state.exported().pages?.[0].cover?.show_signature, { timeout: 60_000 }).toBe(false);
  expect(state.updates.at(-1)?.at(-1)?.signature).toEqual({ name: "", handle: "" });
});

test("page numbers can be hidden from any page", async ({ page }) => {
  const state = await fixture(page, document(60));
  const studio = await openStudio(page);
  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  const pageNumber = studio.locator("[data-studio-canvas] [data-page-number]");
  await expect(pageNumber).toHaveText("1");

  await studio.getByRole("switch", { name: "Show page numbers" }).click();
  await expect(pageNumber).toHaveCount(0);
  await expect.poll(() => state.exported().pages?.[0].cover?.show_page_numbers, { timeout: 60_000 }).toBe(false);
});

test("older covers move the byline under the title and keep one author", async ({ page }) => {
  await fixture(page, document(2), "portrait", {
    initialHeroImageUrl: "/storage/existing-cover.png",
    legacyCover: { order: ["header", "title", "hero", "entry", "author"], authorName: "John Doe" },
  });
  const studio = await openStudio(page);
  const canvas = studio.locator("[data-studio-canvas] [data-page-canvas]");
  const order = await canvas
    .locator("[data-cover-main] > [data-cover-section]")
    .evaluateAll((sections) => sections.map((section) => section.getAttribute("data-cover-section")));
  expect(order).toEqual(["header", "title", "author", "hero", "entry"]);
  await expect(canvas.locator("[data-cover-byline-meta]")).toHaveText("@author");
  // A byline right under the title sits as close to it as the kicker above.
  const gaps = await canvas.evaluate((element) => {
    const box = (name: string) =>
      element.querySelector(`[data-cover-section="${name}"]`)!.getBoundingClientRect();
    return {
      kicker: box("title").top - box("header").bottom,
      byline: box("author").top - box("title").bottom,
    };
  });
  expect(Math.abs(gaps.byline - gaps.kicker)).toBeLessThanOrEqual(1);

  await studio.getByRole("button", { name: "Edit page 2", exact: true }).click();
  await expect(canvas.locator(".letter-page-signature")).toContainText("John Doe");
});

test("failed cover replacement shows the image validation error and keeps the current image", async ({ page }) => {
  const state = await fixture(page, document(2), "portrait", { rejectMediaUploadNumber: 4 });
  await openStudio(page);

  const studio = studioRegion(page);
  const heroControl = await heroImageControl(studio);
  let cropDialog = await chooseCoverImage(page, heroControl, "first-cover.png");
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 }).toBe("/storage/uploaded-cover-2.png");

  cropDialog = await chooseCoverImage(page, heroControl, "invalid-replacement.png");
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog.getByRole("alert")).toContainText("The replacement image could not be saved.");
  expect(state.exported().pages?.[0].cover?.hero_image_url).toBe("/storage/uploaded-cover-2.png");
  await expect(studio.locator('[data-studio-canvas] [data-cover-section="hero"] img')).toHaveAttribute("src", /uploaded-cover-2\.png/);

  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect.poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 }).toBe("/storage/uploaded-cover-5.png");
});

test("re-cropping the cover image starts from the whole original", async ({ page }) => {
  const state = await fixture(page, document(2));
  const studio = await openStudio(page);
  const heroControl = await heroImageControl(studio);

  let cropDialog = await chooseCoverImage(page, heroControl, "wide-cover.png");
  await cropDialog.getByRole("button", { name: "Square" }).click();
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect
    .poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 })
    .toBe("/storage/uploaded-cover-2.png");
  const saved = state.exported().pages?.[0].cover;
  expect(saved?.hero_image_original_url).toBe("/storage/uploaded-cover-1.png");
  expect(saved?.hero_image_crop?.width).toBeCloseTo(0.9, 2);
  expect(saved?.hero_image_crop?.height).toBeCloseTo(0.9, 2);
  expect(saved?.hero_image_crop?.x).toBeCloseTo(0.05, 2);

  await heroControl.getByRole("button", { name: "Crop", exact: true }).click();
  cropDialog = page.getByRole("dialog", { name: "Crop cover image" });
  await expect(cropDialog).toBeVisible();
  await expect(cropDialog.getByRole("button", { name: "Current crop" })).toHaveAttribute("aria-pressed", "true");
  const shown = cropDialog.locator('img[alt="Image being cropped"]');
  await expect.poll(() => shown.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(100);
  const selection = await cropDialog.evaluate((dialog) => {
    const image = dialog.querySelector("img")!.getBoundingClientRect();
    const box = dialog.querySelector(".ReactCrop__crop-selection")!.getBoundingClientRect();
    return {
      x: (box.left - image.left) / image.width,
      width: box.width / image.width,
      height: box.height / image.height,
    };
  });
  expect(selection.x).toBeCloseTo(0.05, 1);
  expect(selection.width).toBeCloseTo(0.9, 1);
  expect(selection.height).toBeCloseTo(0.9, 1);

  await cropDialog.getByRole("button", { name: "Original" }).click();
  await cropDialog.getByRole("button", { name: "Apply crop" }).click();
  await expect(cropDialog).toBeHidden();
  await expect
    .poll(() => state.exported().pages?.[0].cover?.hero_image_url, { timeout: 60_000 })
    .toBe("/storage/uploaded-cover-3.png");
  expect(state.exported().pages?.[0].cover?.hero_image_original_url).toBe("/storage/uploaded-cover-1.png");
  expect(state.mediaUploads()).toBe(3);

  await heroControl.getByRole("button", { name: "Remove", exact: true }).click();
  await expect
    .poll(() => state.exported().pages?.[0].cover?.hero_image_original_url, { timeout: 60_000 })
    .toBeNull();
  expect(state.exported().pages?.[0].cover?.hero_image_crop).toBeNull();
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
