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

export type LetterPage = {
  uuid: string;
  number: number;
  kind: "cover" | "body" | "final";
  layout: LetterPageLayout;
  text_scale: number;
  text_scale_mode: LetterPageTextScaleMode;
  title: string | null;
  subtitle: string | null;
  blocks: unknown[];
  signature: LetterSignature | null;
  truncated: boolean;
  continuation_label: string | null;
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

export type LetterPageResponse = {
  current_page: number;
  data: LetterSummary[];
  last_page: number;
  per_page: number;
  total: number;
};

export type LetterInput = {
  title: string;
  subtitle: string | null;
  content: string;
};

export type LetterUpdateInput = Partial<LetterInput>;

export type LetterExportInput = {
  format?: LetterExportFormat;
};

export type LetterExportPageInput = Pick<
  LetterPage,
  | "uuid"
  | "layout"
  | "text_scale"
  | "text_scale_mode"
  | "title"
  | "subtitle"
  | "blocks"
>;

export type LetterExportUpdateInput = {
  pages: LetterExportPageInput[];
};
