import type { NoteTreeNode } from "./type";

export type FlatNote = Omit<NoteTreeNode, "children"> & { depth: number };

export function flattenNotes(nodes: NoteTreeNode[], depth = 0): FlatNote[] {
  return nodes.flatMap((node) => {
    const { children, ...summary } = node;
    return [{ ...summary, depth }, ...flattenNotes(children, depth + 1)];
  });
}

export function buildNotePath(notes: FlatNote[], noteUuid?: string) {
  if (!noteUuid) return [];

  const notesByUuid = new Map(notes.map((note) => [note.uuid, note]));
  const path: FlatNote[] = [];
  const visited = new Set<string>();
  let current = notesByUuid.get(noteUuid);

  while (current && !visited.has(current.uuid)) {
    path.unshift(current);
    visited.add(current.uuid);
    current = current.parent_uuid
      ? notesByUuid.get(current.parent_uuid)
      : undefined;
  }

  return path;
}

export function findAncestorUuids(nodes: NoteTreeNode[], selectedUuid?: string) {
  if (!selectedUuid) return [];

  const ancestors: string[] = [];
  const containsSelection = (node: NoteTreeNode): boolean => {
    if (node.uuid === selectedUuid) return true;

    if (node.children.some(containsSelection)) {
      ancestors.push(node.uuid);
      return true;
    }

    return false;
  };

  nodes.some(containsSelection);
  return ancestors;
}

export function countChildNotes(notes: FlatNote[], noteUuid?: string) {
  if (!noteUuid) return 0;
  return notes.filter((note) => note.parent_uuid === noteUuid).length;
}

export function noteTitle(title?: string | null) {
  return title?.trim() || "Untitled";
}

export function formatNoteTimestamp(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dayDifference = calendarDayDifference(now, date);
  if (dayDifference === 0) {
    const time = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
    return `Today ${time}`;
  }

  if (dayDifference >= 1 && dayDifference <= 7) {
    return `${dayDifference} ${dayDifference === 1 ? "day" : "days"} ago`;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

export type NoteTimeGroup = "today" | "yesterday" | "week" | "earlier";

export function noteTimeGroup(value: string, now = new Date()): NoteTimeGroup {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "earlier";

  const days = calendarDayDifference(now, date);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 7) return "week";
  return "earlier";
}

// Short label for the notes list: a time today, then a day name, then a date.
export function formatNoteListTime(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const group = noteTimeGroup(value, now);
  if (group === "today") {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  if (group === "yesterday") return "Yesterday";
  if (group === "week") {
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
}

function calendarDayDifference(later: Date, earlier: Date) {
  const laterDay = Date.UTC(
    later.getFullYear(),
    later.getMonth(),
    later.getDate(),
  );
  const earlierDay = Date.UTC(
    earlier.getFullYear(),
    earlier.getMonth(),
    earlier.getDate(),
  );

  return Math.round((laterDay - earlierDay) / 86_400_000);
}

export function findNoteNode(
  nodes: NoteTreeNode[],
  noteUuid: string,
): NoteTreeNode | undefined {
  for (const node of nodes) {
    if (node.uuid === noteUuid) return node;
    const child = findNoteNode(node.children, noteUuid);
    if (child) return child;
  }
  return undefined;
}
