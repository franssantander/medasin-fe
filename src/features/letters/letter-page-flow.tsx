import { parseNoteDocument } from "@/components/ui/note-editor-document";
import type { NoteEditorSelection } from "@/components/ui/note-rich-text-editor-client";
import { LETTER_EXPORT_FORMATS } from "./letter-export-formats";
import {
  LETTER_PAGE_AUTO_FIT_SCALE_MIN,
  LETTER_PAGE_TEXT_SCALE_STEP,
  getLetterPageAutoFitScale,
  getLetterPageCanvasBaseline,
  normalizeLetterPageTextScale,
  normalizeLetterPageTextScaleMode,
} from "./letter-page-text-scale";
import {
  createLetterPageRenderer,
  letterPageFits,
  measureLetterPage,
} from "./letter-page-renderer";
import type { Letter, LetterCanvas, LetterExportFormat, LetterExportPageInput, LetterPage } from "./type";

type Block = Record<string, unknown>;
type Span = { id: string; base: string; start: number; length: number; pageUuid: string };
export type LetterPageFlowResult = {
  pages: LetterPage[];
  selectionMap: { before: Span[]; after: Span[] };
};
const splittable = new Set(["paragraph", "heading", "quote", "bulletListItem", "numberedListItem", "checkListItem"]);
const fragmentSeparator = "::letter-part::";

export async function prepareLetterPages(letter: Letter, format: LetterExportFormat): Promise<LetterExportPageInput[]> {
  const canvas = LETTER_EXPORT_FORMATS[format];
  const body = bodyPage(canvas);
  body.blocks = parseNoteDocument(letter.content).blocks;
  body.signature = letter.author;
  const cover: LetterPage = { ...bodyPage(canvas), number: 1, kind: "cover", layout: "cover", title: letter.title, subtitle: letter.subtitle };
  const result = await flowLetterPages([cover, body], canvas, `prepare-${letter.uuid}`);
  return result.pages.map(({ uuid, layout, text_scale, text_scale_mode, title, subtitle, blocks }) =>
    ({ uuid, layout, text_scale, text_scale_mode, title, subtitle, blocks }));
}

export async function flowLetterPages(source: LetterPage[], canvas: LetterCanvas, exportUuid: string, signal?: AbortSignal): Promise<LetterPageFlowResult> {
  // Never mutate editor snapshots while an asynchronous measurement is running.
  const pages = structuredClone(source);
  const before: Span[] = [];
  const signature = [...pages].reverse().find((page) => page.signature)?.signature ?? null;
  if (pages.some((page) => page.truncated)) {
    throw new Error("This older page set contains only part of your Letter. Prepare pages again from the full Letter before editing it.");
  }
  if (!pages.length) {
    const empty = bodyPage(canvas);
    const after = spans(empty.blocks, empty.uuid);
    return { pages: [empty], selectionMap: { before, after } };
  }
  const renderer = createLetterPageRenderer(canvas, exportUuid, signal);
  const fits = async (page: LetterPage) => letterPageFits(await renderer.render(page));
  const output: LetterPage[] = [];

  try {
    output.push(
      await autoFitFixedPage(
        { ...pages[0], signature: null },
        renderer.render,
        signal,
      ),
    );
    let index = 1;
    while (index < pages.length) {
      signal?.throwIfAborted();
      const first = pages[index];
      if (first.layout === "quote") {
        assignBlockIds(first.blocks);
        before.push(...spans(first.blocks, first.uuid));
        output.push(
          await autoFitFixedPage(
            {
              ...first,
              signature: index === pages.length - 1 ? signature : null,
            },
            renderer.render,
            signal,
          ),
        );
        index += 1;
        continue;
      }
      const templates: LetterPage[] = [];
      while (index < pages.length && pages[index].layout !== "quote") templates.push(pages[index++]);
      const terminal = index === pages.length;
      const blocks = flattenBodyBlocks(templates, before);
      if (!blocks.length && !terminal) continue;
      output.push(...await paginateBodyBlocks(templates, blocks, terminal, signature, canvas, fits, signal));
    }
    if (output.length === 1) {
      const template = pages[1] ?? bodyPage(canvas);
      output.push(createBodyPage(template, canvas, template.uuid, [], signature));
    }
    const normalized = output.map((page, index): LetterPage => ({
      ...page, number: index + 1, kind: index === 0 ? "cover" : index === output.length - 1 ? "final" : "body",
      signature: index === output.length - 1 ? signature : null,
    }));
    const after = normalized.flatMap((page) => spans(page.blocks, page.uuid));
    return { pages: normalized, selectionMap: { before, after } };
  } finally { renderer.dispose(); }
}

async function autoFitFixedPage(
  page: LetterPage,
  render: (page: LetterPage) => Promise<HTMLElement>,
  signal?: AbortSignal,
): Promise<LetterPage> {
  if (page.layout === "body") return page;

  const scaleMode = normalizeLetterPageTextScaleMode(
    page.text_scale_mode,
    page.text_scale,
  );
  let scale = normalizeLetterPageTextScale(page.text_scale);
  let fitted = { ...page, text_scale: scale, text_scale_mode: scaleMode };

  // Follow the same target-density rule as the live workspace. Repeat because
  // text wrapping is nonlinear and a single ratio is only an estimate.
  if (scaleMode === "auto") {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      signal?.throwIfAborted();
      const measurement = measureLetterPage(await render(fitted));
      if (!measurement) return fitted;
      const nextScale = getLetterPageAutoFitScale(
        scale,
        measurement.availableHeight,
        measurement.contentHeight,
      );
      if (nextScale === scale) break;
      scale = nextScale;
      fitted = { ...fitted, text_scale: scale };
    }
  }

  // Fixed layouts cannot paginate. Reduce them below the manual slider minimum
  // when necessary so page preparation never fails because of text overflow.
  while (scale > LETTER_PAGE_AUTO_FIT_SCALE_MIN) {
    signal?.throwIfAborted();
    if (letterPageFits(await render(fitted))) return fitted;
    scale = normalizeLetterPageTextScale(scale - LETTER_PAGE_TEXT_SCALE_STEP);
    fitted = { ...fitted, text_scale: scale, text_scale_mode: "auto" };
  }

  return fitted;
}

export function mapFlowSelection(selection: NoteEditorSelection, result: LetterPageFlowResult): { selection: NoteEditorSelection; pageUuid: string } | null {
  const map = (point: NoteEditorSelection["anchor"]) => {
    const original = result.selectionMap.before.find((span) => span.id === point.blockId);
    if (!original) return null;
    const offset = original.start + Math.max(0, point.offset);
    const candidates = result.selectionMap.after.filter((span) => span.base === original.base);
    const span = candidates.find((item) => offset >= item.start && offset < item.start + item.length) ?? candidates.at(-1);
    return span ? { point: { blockId: span.id, offset: Math.max(0, offset - span.start) }, pageUuid: span.pageUuid } : null;
  };
  const head = map(selection.head);
  const anchor = map(selection.anchor);
  if (!head) return null;
  return { pageUuid: head.pageUuid, selection: { ...selection, head: head.point, anchor: anchor?.pageUuid === head.pageUuid ? anchor.point : head.point } };
}

async function paginateBodyBlocks(
  templates: LetterPage[],
  remainingBlocks: Block[],
  terminal: boolean,
  signature: LetterPage["signature"],
  canvas: LetterCanvas,
  fits: (page: LetterPage) => Promise<boolean>,
  signal?: AbortSignal,
): Promise<LetterPage[]> {
  const pages: LetterPage[] = [];
  const blocks = remainingBlocks.slice();
  let slot = 0;
  let signaturePending = terminal && Boolean(signature);

  while (blocks.length || signaturePending || !pages.length) {
    signal?.throwIfAborted();
    const template = templates[Math.min(slot, templates.length - 1)] ?? bodyPage(canvas);
    const page = createBodyPage(
      template,
      canvas,
      slot < templates.length ? template.uuid : crypto.randomUUID(),
      [],
      null,
    );
    slot += 1;

    if (!blocks.length) {
      page.signature = signaturePending ? signature : null;
      pages.push(page);
      break;
    }

    while (blocks.length) {
      signal?.throwIfAborted();
      const block = blocks[0];
      const isLastBlock = terminal && blocks.length === 1;
      const candidate = {
        ...page,
        blocks: [...page.blocks, block],
        signature: isLastBlock ? signature : null,
      };

      if (await fits(candidate)) {
        page.blocks.push(blocks.shift()!);
        if (isLastBlock) signaturePending = false;
        continue;
      }

      // If the block fits without the signature, keep the content together and
      // put the signature on the next page instead of splitting needlessly.
      if (isLastBlock && await fits({ ...candidate, signature: null })) {
        page.blocks.push(blocks.shift()!);
        signaturePending = Boolean(signature);
        continue;
      }

      const split = await splitToFit(block, page, fits);
      if (split) {
        page.blocks.push(split[0]);
        blocks[0] = split[1];
      } else if (!page.blocks.length) {
        page.blocks.push(blocks.shift()!);
        if (isLastBlock) signaturePending = Boolean(signature);
        const fitted = await shrinkBodyPageToFit(page, fits, signal);
        page.text_scale = fitted.text_scale;
        page.text_scale_mode = fitted.text_scale_mode;
      }
      break;
    }

    if (page.blocks.length || page.signature || !pages.length) pages.push(page);
  }

  return pages;
}

async function shrinkBodyPageToFit(
  page: LetterPage,
  fits: (page: LetterPage) => Promise<boolean>,
  signal?: AbortSignal,
): Promise<LetterPage> {
  let scale = normalizeLetterPageTextScale(page.text_scale);
  let fitted = page;

  while (scale > LETTER_PAGE_AUTO_FIT_SCALE_MIN) {
    signal?.throwIfAborted();
    if (await fits(fitted)) return fitted;
    scale = normalizeLetterPageTextScale(scale - LETTER_PAGE_TEXT_SCALE_STEP);
    fitted = { ...fitted, text_scale: scale, text_scale_mode: "auto" };
  }

  return fitted;
}

function flattenBodyBlocks(templates: LetterPage[], before: Span[]): Block[] {
  const blocks: Block[] = [];

  for (const page of templates) {
    assignBlockIds(page.blocks);
    for (const value of page.blocks) {
      const block = value as Block;
      const id = String(block.id);
      const { base, start } = identity(id);
      before.push({ id, base, start, length: inlineText(block.content).length, pageUuid: page.uuid });
      if (Array.isArray(block.children)) before.push(...spans(block.children, page.uuid));

      const previous = blocks.at(-1);
      const merge = previous && id.includes(fragmentSeparator) &&
        identity(String(previous.id)).base === base &&
        previous.type === block.type &&
        JSON.stringify(previous.props) === JSON.stringify(block.props) &&
        !hasChildren(previous) && !hasChildren(block);

      if (merge) previous.content = concatInline(previous.content, block.content);
      else blocks.push({ ...block, id: base });
    }
  }

  return blocks;
}

function createBodyPage(
  template: LetterPage,
  canvas: LetterCanvas,
  uuid: string,
  blocks: Block[],
  signature: LetterPage["signature"],
): LetterPage {
  const textScaleMode = normalizeLetterPageTextScaleMode(
    template.text_scale_mode,
    template.text_scale,
  );

  return {
    ...template,
    uuid,
    number: 0,
    kind: "body",
    layout: "body",
    text_scale: textScaleMode === "auto"
      ? getLetterPageCanvasBaseline(canvas)
      : normalizeLetterPageTextScale(template.text_scale),
    text_scale_mode: textScaleMode,
    title: null,
    subtitle: null,
    blocks,
    signature,
    truncated: false,
    continuation_label: null,
  };
}

async function splitToFit(block: Block, page: LetterPage, fits: (page: LetterPage) => Promise<boolean>): Promise<[Block, Block] | null> {
  if (!splittable.has(String(block.type)) || hasChildren(block)) return null;
  const text = inlineText(block.content);
  const cuts = Array.from(text.matchAll(/\s+(?=\S)/gu), (match) => match.index! + match[0].length);
  // A long URL or an unspaced language can still wrap between graphemes.
  if (!cuts.length) {
    for (const part of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) {
      if (part.index > 0) cuts.push(part.index);
    }
  }
  let low = 0, high = cuts.length - 1;
  let best: [Block, Block] | null = null;
  const { base, start } = identity(String(block.id));
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const cut = cuts[middle];
    const [leftContent, rightContent] = splitInline(block.content, cut);
    const left = { ...block, content: leftContent };
    const right = { ...block, id: `${base}${fragmentSeparator}${start + cut}`, content: rightContent };
    if (await fits({ ...page, blocks: [...page.blocks, left] })) { best = [left, right]; low = middle + 1; }
    else high = middle - 1;
  }
  return best;
}

function bodyPage(canvas: LetterCanvas): LetterPage {
  return { uuid: crypto.randomUUID(), number: 2, kind: "body", layout: "body", text_scale: getLetterPageCanvasBaseline(canvas), text_scale_mode: "auto", title: null, subtitle: null, blocks: [], signature: null, truncated: false, continuation_label: null };
}
function identity(id: string) {
  const [base, offset] = id.split(fragmentSeparator);
  return { base, start: Number(offset) || 0 };
}
function assignBlockIds(blocks: unknown[]) {
  for (const block of blocks as Block[]) {
    if (typeof block.id !== "string") block.id = crypto.randomUUID();
    if (Array.isArray(block.children)) assignBlockIds(block.children);
  }
}
function spans(blocks: unknown[], pageUuid: string): Span[] {
  return (blocks as Block[]).flatMap((block) => [{ id: String(block.id), ...identity(String(block.id)), length: inlineText(block.content).length, pageUuid }, ...(Array.isArray(block.children) ? spans(block.children, pageUuid) : [])]);
}
function hasChildren(block: Block) { return Array.isArray(block.children) && block.children.length > 0; }
function inlineText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(inlineText).join("");
  if (!value || typeof value !== "object") return "";
  const item = value as Block;
  return typeof item.text === "string" ? item.text : inlineText(item.content);
}
function concatInline(left: unknown, right: unknown): unknown {
  if (typeof left === "string" && typeof right === "string") return left + right;
  const array = (value: unknown) => typeof value === "string" ? [{ type: "text", text: value, styles: {} }] : Array.isArray(value) ? value : [];
  return [...array(left), ...array(right)];
}
function splitInline(value: unknown, offset: number): [unknown, unknown] {
  if (typeof value === "string") return [value.slice(0, offset), value.slice(offset)];
  if (Array.isArray(value)) {
    const left: unknown[] = [], right: unknown[] = [];
    let remaining = offset;
    for (const child of value) {
      const length = inlineText(child).length;
      if (remaining <= 0) right.push(child);
      else if (remaining >= length) { left.push(child); remaining -= length; }
      else { const parts = splitInline(child, remaining); left.push(parts[0]); right.push(parts[1]); remaining = 0; }
    }
    return [left, right];
  }
  const item = value as Block;
  if (typeof item.text === "string") return [{ ...item, text: item.text.slice(0, offset) }, { ...item, text: item.text.slice(offset) }];
  const parts = splitInline(item.content, offset);
  return [{ ...item, content: parts[0] }, { ...item, content: parts[1] }];
}
