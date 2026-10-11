import { parseNoteDocument } from "@/components/ui/note-editor-document";
import { normalizeLetterPageTextScale } from "./letter-page-text-scale";
import type {
  Letter,
  LetterCover,
  LetterCoverImageCrop,
  LetterCoverSection,
  LetterPage,
  LetterSignature,
} from "./type";

/** Blog-post order: kicker, title, excerpt, byline, then the image. */
export const LETTER_COVER_SECTIONS: LetterCoverSection[] = [
  "header",
  "title",
  "entry",
  "author",
  "hero",
];

/** The fallback crop used by new and legacy cover images. */
export const LETTER_COVER_HERO_ASPECT_RATIO = 16 / 9;
export const LETTER_COVER_HERO_CAPTION_MAX_LENGTH = 120;
export const LETTER_COVER_FONT_SCALE_DEFAULT = 1;
export const LETTER_COVER_FONT_SCALE_MIN = 0.7;
export const LETTER_COVER_FONT_SCALE_MAX = 1.4;
export const LETTER_COVER_FONT_SCALE_STEP = 0.05;
const LETTER_COVER_HERO_ASPECT_RATIO_MIN = 0.1;
const LETTER_COVER_HERO_ASPECT_RATIO_MAX = 10;

export const LETTER_COVER_SECTION_LABELS: Record<LetterCoverSection, string> = {
  header: "Header",
  title: "Title",
  entry: "Cover body text",
  author: "Byline",
  hero: "Cover image",
};

export type LetterCoverDefaults = {
  /** The account photo, used as the byline avatar until one is uploaded. */
  avatarUrl?: string | null;
};

export function createLetterCover(
  letter?: Letter,
  defaults?: LetterCoverDefaults,
): LetterCover {
  return {
    theme: "light",
    show_logo: true,
    text_alignment: "left",
    subheader: "A LETTER",
    subheader_font_scale: LETTER_COVER_FONT_SCALE_DEFAULT,
    title_font_scale: LETTER_COVER_FONT_SCALE_DEFAULT,
    body_font_scale: LETTER_COVER_FONT_SCALE_DEFAULT,
    description_blocks: descriptionBlocks(letter?.subtitle),
    author_name: letter?.author?.name ?? "",
    author_handle: letter?.author?.handle ?? "",
    date_label: formatLetterCoverDate(letter?.created_at),
    avatar_url: defaults?.avatarUrl || null,
    show_author: true,
    byline_placement: "top",
    show_date: true,
    show_page_numbers: true,
    show_signature: true,
    hero_image_url: null,
    hero_image_original_url: null,
    hero_image_crop: null,
    hero_image_aspect_ratio: null,
    hero_image_caption: "",
    hero_image_caption_alignment: "center",
    hero_image_caption_placement: "overlay",
    section_order: [...LETTER_COVER_SECTIONS],
  };
}

export function carryLetterCover(
  letter: Letter,
  previousPage?: LetterPage | null,
  coverDefaults?: LetterCoverDefaults,
): LetterCover {
  const defaults = createLetterCover(letter, coverDefaults);
  if (!previousPage?.cover) return defaults;

  // Older captions without a saved placement stay on the image.
  const cover = normalizeLetterCover(previousPage.cover, {
    ...defaults,
    hero_image_caption_placement: "overlay",
  });
  // Page edits also update the letter subtitle; only editor changes replace the cover body.
  return previousPage.subtitle === letter.subtitle
    ? cover
    : { ...cover, description_blocks: defaults.description_blocks };
}

export function normalizeLetterCover(
  cover?: Partial<LetterCover> | null,
  fallback?: Partial<LetterCover>,
): LetterCover {
  const source = { ...fallback, ...cover };
  // Covers saved before the byline existed pinned the author to the bottom.
  const legacy = cover ? !("show_author" in cover) : false;
  const suppliedOrder = Array.isArray(source.section_order)
    ? source.section_order.flatMap((section) => {
        if ((section as unknown) === "content") {
          return ["title", "entry"] satisfies LetterCoverSection[];
        }
        return isLetterCoverSection(section) ? [section] : [];
      })
    : [];
  const sectionOrder = [
    ...new Set([...suppliedOrder, ...LETTER_COVER_SECTIONS]),
  ];
  if (legacy) moveBylineUnderTitle(sectionOrder);
  const heroImageUrl =
    typeof source.hero_image_url === "string" && source.hero_image_url
      ? source.hero_image_url
      : null;

  return {
    theme: source.theme === "dark" ? "dark" : "light",
    show_logo: source.show_logo !== false,
    text_alignment:
      source.text_alignment === "left" || source.text_alignment === "right"
        ? source.text_alignment
        : "center",
    subheader:
      typeof source.subheader === "string" ? source.subheader : "A LETTER",
    subheader_font_scale: normalizeLetterCoverFontScale(
      source.subheader_font_scale,
    ),
    title_font_scale: normalizeLetterCoverFontScale(source.title_font_scale),
    body_font_scale: normalizeLetterCoverFontScale(source.body_font_scale),
    description_blocks: Array.isArray(source.description_blocks)
      ? source.description_blocks
      : descriptionBlocks(),
    author_name:
      typeof source.author_name === "string" ? source.author_name : "",
    author_handle:
      typeof source.author_handle === "string" ? source.author_handle : "",
    date_label:
      typeof source.date_label === "string" ? source.date_label : "",
    avatar_url:
      typeof source.avatar_url === "string" && source.avatar_url
        ? source.avatar_url
        : legacy && fallback?.avatar_url
          ? fallback.avatar_url
          : null,
    show_author: source.show_author !== false,
    byline_placement: source.byline_placement === "bottom" ? "bottom" : "top",
    show_date: source.show_date !== false,
    show_page_numbers: source.show_page_numbers !== false,
    show_signature: source.show_signature !== false,
    hero_image_url: heroImageUrl,
    hero_image_original_url:
      heroImageUrl &&
      typeof source.hero_image_original_url === "string" &&
      source.hero_image_original_url
        ? source.hero_image_original_url
        : null,
    hero_image_crop: heroImageUrl
      ? normalizeLetterCoverImageCrop(source.hero_image_crop)
      : null,
    hero_image_aspect_ratio: heroImageUrl
      ? normalizeLetterCoverHeroAspectRatio(source.hero_image_aspect_ratio)
      : null,
    hero_image_caption:
      heroImageUrl && typeof source.hero_image_caption === "string"
        ? source.hero_image_caption.slice(0, LETTER_COVER_HERO_CAPTION_MAX_LENGTH)
        : "",
    hero_image_caption_alignment:
      heroImageUrl && (source.hero_image_caption_alignment === "left" ||
      source.hero_image_caption_alignment === "right")
        ? source.hero_image_caption_alignment
        : "center",
    hero_image_caption_placement:
      heroImageUrl && source.hero_image_caption_placement === "below"
        ? "below"
        : "overlay",
    section_order: sectionOrder,
  };
}

function findLetterCover(pages: readonly LetterPage[]): LetterCover {
  const coverPage = pages.find(
    (page) => page.layout === "cover" || page.kind === "cover",
  );

  return normalizeLetterCover(coverPage?.cover);
}

export function getLetterPageTheme(
  pages: readonly LetterPage[],
): LetterCover["theme"] {
  return findLetterCover(pages).theme;
}

export function getLetterPageNumbersShown(pages: readonly LetterPage[]) {
  return findLetterCover(pages).show_page_numbers;
}

/** The closing signature always mirrors the cover author. */
export function letterSignatureFromCover(cover: LetterCover): LetterSignature {
  return cover.show_signature
    ? { name: cover.author_name, handle: cover.author_handle }
    : { name: "", handle: "" };
}

/** Places the byline after the title, and after an excerpt directly under it. */
function moveBylineUnderTitle(order: LetterCoverSection[]) {
  order.splice(order.indexOf("author"), 1);
  let index = order.indexOf("title") + 1;
  if (order[index] === "entry") index += 1;
  order.splice(index, 0, "author");
}

export function normalizeLetterCoverHeroAspectRatio(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return LETTER_COVER_HERO_ASPECT_RATIO;
  }

  return Math.min(
    LETTER_COVER_HERO_ASPECT_RATIO_MAX,
    Math.max(LETTER_COVER_HERO_ASPECT_RATIO_MIN, value),
  );
}

export function normalizeLetterCoverImageCrop(
  value: unknown,
): LetterCoverImageCrop | null {
  if (!value || typeof value !== "object") return null;
  const crop = value as Record<string, unknown>;
  const fraction = (key: string) => {
    const numeric = Number(crop[key]);
    return Number.isFinite(numeric) ? Math.min(1, Math.max(0, numeric)) : null;
  };
  const x = fraction("x");
  const y = fraction("y");
  const width = fraction("width");
  const height = fraction("height");
  if (x === null || y === null || !width || !height) return null;

  return {
    x,
    y,
    width: Math.min(width, 1 - x),
    height: Math.min(height, 1 - y),
  };
}

export function normalizeLetterCoverFontScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return LETTER_COVER_FONT_SCALE_DEFAULT;
  }

  const clamped = Math.min(
    LETTER_COVER_FONT_SCALE_MAX,
    Math.max(LETTER_COVER_FONT_SCALE_MIN, value),
  );
  return Number(
    (
      Math.round(clamped / LETTER_COVER_FONT_SCALE_STEP) *
      LETTER_COVER_FONT_SCALE_STEP
    ).toFixed(2),
  );
}

export function letterCoverTextSize(
  baseCqw: number,
  pageScale: unknown,
  sectionScale: unknown,
): string {
  return `${(
    baseCqw *
    normalizeLetterPageTextScale(pageScale) *
    normalizeLetterCoverFontScale(sectionScale)
  ).toFixed(3)}cqw`;
}

export function normalizeLetterPageCover(
  page: LetterPage,
  fallback?: Partial<LetterCover>,
): LetterPage {
  if (page.layout !== "cover") return page;

  return {
    ...page,
    cover: normalizeLetterCover(page.cover, {
      ...fallback,
      description_blocks: descriptionBlocks(page.subtitle),
      author_name: page.signature?.name ?? fallback?.author_name ?? "",
      author_handle: page.signature?.handle ?? fallback?.author_handle ?? "",
    }),
  };
}

function descriptionBlocks(value?: string | null): unknown[] {
  return parseNoteDocument(value ?? "").blocks;
}

function isLetterCoverSection(value: unknown): value is LetterCoverSection {
  return LETTER_COVER_SECTIONS.includes(value as LetterCoverSection);
}

function formatLetterCoverDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
