import { parseNoteDocument } from "@/components/ui/note-editor-document";
import type {
  Letter,
  LetterCover,
  LetterCoverSection,
  LetterPage,
} from "./type";

export const LETTER_COVER_CONTENT_SECTIONS: LetterCoverSection[] = [
  "header",
  "title",
  "entry",
  "hero",
];

export const LETTER_COVER_SECTIONS: LetterCoverSection[] = [
  ...LETTER_COVER_CONTENT_SECTIONS,
  "author",
];

/** The fallback crop used by new and legacy cover images. */
export const LETTER_COVER_HERO_ASPECT_RATIO = 16 / 9;
export const LETTER_COVER_HERO_CAPTION_MAX_LENGTH = 120;
const LETTER_COVER_HERO_ASPECT_RATIO_MIN = 0.1;
const LETTER_COVER_HERO_ASPECT_RATIO_MAX = 10;

export const LETTER_COVER_SECTION_LABELS: Record<LetterCoverSection, string> = {
  header: "Header",
  title: "Title",
  entry: "Cover body text",
  author: "Author and date",
  hero: "Cover image",
};

export function createLetterCover(letter?: Letter): LetterCover {
  return {
    theme: "light",
    show_logo: true,
    text_alignment: "center",
    subheader: "A LETTER",
    description_blocks: descriptionBlocks(letter?.subtitle),
    author_name: letter?.author?.name ?? "",
    date_label: formatLetterCoverDate(letter?.created_at),
    avatar_url: null,
    hero_image_url: null,
    hero_image_aspect_ratio: null,
    hero_image_caption: "",
    hero_image_caption_alignment: "center",
    hero_image_caption_placement: "overlay",
    section_order: [...LETTER_COVER_SECTIONS],
  };
}

export function normalizeLetterCover(
  cover?: Partial<LetterCover> | null,
  fallback?: Partial<LetterCover>,
): LetterCover {
  const source = { ...fallback, ...cover };
  const suppliedOrder = Array.isArray(source.section_order)
    ? source.section_order.flatMap((section) => {
        if ((section as unknown) === "content") {
          return ["title", "entry"] satisfies LetterCoverSection[];
        }
        return isLetterCoverSection(section) ? [section] : [];
      })
    : [];
  const sectionOrder = [
    ...new Set([
      ...suppliedOrder.filter((section) => section !== "author"),
      ...LETTER_COVER_CONTENT_SECTIONS,
    ]),
    "author" as const,
  ];
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
    description_blocks: Array.isArray(source.description_blocks)
      ? source.description_blocks
      : descriptionBlocks(),
    author_name:
      typeof source.author_name === "string" ? source.author_name : "",
    date_label:
      typeof source.date_label === "string" ? source.date_label : "",
    avatar_url:
      typeof source.avatar_url === "string" && source.avatar_url
        ? source.avatar_url
        : null,
    hero_image_url: heroImageUrl,
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

export function getLetterPageTheme(
  pages: readonly LetterPage[],
): LetterCover["theme"] {
  const coverPage = pages.find(
    (page) => page.layout === "cover" || page.kind === "cover",
  );

  return normalizeLetterCover(coverPage?.cover).theme;
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
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
