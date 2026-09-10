import type { ResourceType } from "@/features/resources/type";

export type JournalApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type JournalResource = {
  uuid: string;
  title: string;
  type: ResourceType | string | null;
  archived_at: string | null;
};

export type JournalSource = {
  type: "focus_reflection";
  session_uuid: string;
  task_title: string | null;
  completed_at: string | null;
  mood: "calm" | "frustrated" | "neutral" | "tired" | null;
};

export type JournalEntrySummary = {
  uuid: string;
  title: string;
  content_preview: string;
  created_at: string | null;
  updated_at: string | null;
  resources: JournalResource[];
  source: JournalSource | null;
};

export type JournalEntry = JournalEntrySummary & {
  content: string;
};

export type JournalPage = {
  current_page: number;
  data: JournalEntrySummary[];
  last_page: number;
  per_page: number;
  total: number;
};

export type JournalEntryInput = {
  title: string;
  content: string;
  resource_uuids: string[];
};

export type JournalEntryUpdateInput = Partial<JournalEntryInput>;
