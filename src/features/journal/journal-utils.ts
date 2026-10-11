import { getNoteDocumentPreview } from "@/components/ui/note-editor-document";
import type { JournalEntrySummary, JournalSource } from "./type";

export type JournalTimeOfDay = "morning" | "afternoon" | "evening" | "night";

export const JOURNAL_TIME_OF_DAY_LABEL: Record<JournalTimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export const JOURNAL_MOOD_DOT: Record<
  NonNullable<JournalSource["mood"]>,
  string
> = {
  calm: "bg-emerald-400",
  neutral: "bg-zinc-400",
  tired: "bg-sky-400",
  frustrated: "bg-rose-400",
};

export const JOURNAL_PROMPTS = [
  "What felt meaningful today?",
  "What am I grateful for right now?",
  "What's weighing on me, and why?",
  "What did I learn about myself this week?",
  "What would make tomorrow feel lighter?",
  "Where did I find calm today?",
  "What am I proud of lately?",
  "What do I want to let go of?",
];

export function pickJournalPrompts(seed: number, count = 3) {
  const start = Math.abs(seed) % JOURNAL_PROMPTS.length;
  return Array.from(
    { length: count },
    (_, index) => JOURNAL_PROMPTS[(start + index) % JOURNAL_PROMPTS.length],
  );
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getTimeOfDay(value?: string | Date | null): JournalTimeOfDay {
  const hour = (toDate(value) ?? new Date()).getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function formatDateStamp(value?: string | Date | null) {
  const date = toDate(value) ?? new Date();

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatEntryTimestamp(value: string) {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatListTimestamp(value: string, now = new Date()) {
  const date = toDate(value);
  if (!date) return "";

  if (startOfDay(date).getTime() === startOfDay(now).getTime()) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

export function formatDayTile(value: string | null) {
  const date = toDate(value);
  if (!date) return { day: "–", weekday: "" };

  return {
    day: String(date.getDate()),
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
      date,
    ),
  };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type JournalEntryGroup = {
  key: string;
  label: string;
  entries: JournalEntrySummary[];
};

export function groupEntriesByDate(
  entries: JournalEntrySummary[],
  now = new Date(),
): JournalEntryGroup[] {
  const today = startOfDay(now).getTime();
  const day = 24 * 60 * 60 * 1000;
  const groups = new Map<string, JournalEntryGroup>();

  for (const entry of entries) {
    const date = toDate(entry.updated_at ?? entry.created_at);
    let key: string;
    let label: string;

    if (!date) {
      key = "undated";
      label = "Undated";
    } else {
      const diff = Math.round((today - startOfDay(date).getTime()) / day);
      if (diff <= 0) {
        key = "today";
        label = "Today";
      } else if (diff === 1) {
        key = "yesterday";
        label = "Yesterday";
      } else if (diff < 7) {
        key = "week";
        label = "Previous 7 days";
      } else {
        key = `${date.getFullYear()}-${date.getMonth()}`;
        label = new Intl.DateTimeFormat(undefined, {
          month: "long",
          year: "numeric",
        }).format(date);
      }
    }

    const group = groups.get(key);
    if (group) group.entries.push(entry);
    else groups.set(key, { key, label, entries: [entry] });
  }

  return [...groups.values()];
}

export function countWords(content: string) {
  const text = getNoteDocumentPreview(content);
  return text ? text.split(/\s+/).length : 0;
}

export function journalEntryTitle(title: string) {
  return title.trim() || "Untitled entry";
}
