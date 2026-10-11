export type LetterApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type LetterStatus = "draft" | "exported";

export type LetterExportFormat =
  | "portrait"
  | "square"
  | "story"
  | "landscape";

export type LetterPageLayout = "cover" | "body" | "quote";

export type LetterPageTextScaleMode = "auto" | "manual";

export type LetterPageContentSource = "cover_entry" | "letter_body";

export type LetterCoverTextAlignment = "left" | "center" | "right";

export type LetterCoverCaptionPlacement = "overlay" | "below";

export type LetterCoverBylinePlacement = "top" | "bottom";

export type LetterExportStatus =
  | "queued"
  | "processing"
  | "ready"
  | "failed";

export type LetterAuthor = {
  name: string;
  handle: string;
};

export type LetterCanvas = {
  width: number;
  height: number;
};

export type LetterSignature = {
  name: string;
  handle: string;
};

export type LetterCoverSection =
  | "header"
  | "title"
  | "entry"
  | "author"
  | "hero";

/** A crop area as fractions (0–1) of the original image. */
export type LetterCoverImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LetterCover = {
  theme: "light" | "dark";
  show_logo: boolean;
  text_alignment: LetterCoverTextAlignment;
  subheader: string;
  subheader_font_scale: number;
  title_font_scale: number;
  body_font_scale: number;
  description_blocks: unknown[];
  author_name: string;
  author_handle: string;
  date_label: string;
  avatar_url: string | null;
  /** Byline (avatar, name, and username) on the cover. */
  show_author: boolean;
  /** Under the title in the cover order, or pinned beside the logo. */
  byline_placement: LetterCoverBylinePlacement;
  show_date: boolean;
  /** Page numbers on every page after the cover. */
  show_page_numbers: boolean;
  /** The author sign-off at the end of the last page. */
  show_signature: boolean;
  hero_image_url: string | null;
  /** The uncropped upload, so a later crop can start from the whole image. */
  hero_image_original_url: string | null;
  /** Where `hero_image_url` was cut from the original. */
  hero_image_crop: LetterCoverImageCrop | null;
  hero_image_aspect_ratio: number | null;
  hero_image_caption: string;
  hero_image_caption_alignment: LetterCoverTextAlignment;
  hero_image_caption_placement: LetterCoverCaptionPlacement;
  section_order: LetterCoverSection[];
};

export type LetterPage = {
  uuid: string;
  number: number;
  kind: "cover" | "body" | "final";
  layout: LetterPageLayout;
  text_scale: number;
  text_scale_mode: LetterPageTextScaleMode;
  title: string | null;
  subtitle: string | null;
  cover?: LetterCover | null;
  blocks: unknown[];
  signature: LetterSignature | null;
  truncated: boolean;
  continuation_label: string | null;
  content_source?: LetterPageContentSource;
};

export type LetterExport = {
  uuid: string;
  letter_uuid: string | null;
  format: LetterExportFormat;
  canvas: LetterCanvas;
  status: LetterExportStatus;
  is_current: boolean;
  page_count: number | null;
  pages: LetterPage[] | null;
  error: string | null;
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type LetterSummary = {
  uuid: string;
  title: string;
  subtitle: string | null;
  content_preview: string;
  word_count: number;
  read_time_minutes: number;
  status: LetterStatus;
  exported_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  author: LetterAuthor | null;
  latest_export: LetterExport | null;
};

export type Letter = LetterSummary & {
  content: string;
};

export type LetterMedia = {
  uuid: string;
  url: string;
  kind: "image";
  mime_type: string;
  name: string;
  size: number;
};

export type LetterPageResponse = {
  current_page: number;
  data: LetterSummary[];
  last_page: number;
  per_page: number;
  total: number;
};

export type LetterInput = {
  title: string;
  /** Written by the Studio cover; the editor leaves it out. */
  subtitle?: string | null;
  content: string;
};

export type LetterUpdateInput = Partial<LetterInput>;

export type LetterExportInput = {
  format?: LetterExportFormat;
  pages?: LetterExportPageInput[];
};

export type LetterExportPageInput = Pick<
  LetterPage,
  | "uuid"
  | "layout"
  | "text_scale"
  | "text_scale_mode"
  | "title"
  | "subtitle"
  | "cover"
  | "content_source"
  | "blocks"
> & {
  signature?: LetterSignature;
};

export type LetterExportUpdateInput = {
  pages: LetterExportPageInput[];
};

export type LetterExportUpdateResult = {
  export: LetterExport;
  letter: Letter;
};
