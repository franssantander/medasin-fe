import {
  BookOpen,
  ChartColumn,
  FileText,
  Gift,
  Heart,
  House,
  ImageIcon,
  Leaf,
  Link2,
  Mail,
  PenLine,
  PiggyBank,
  Snowflake,
  Sprout,
  Store,
  type LucideIcon,
} from "lucide-react";

import type { FocusTask } from "@/features/focus/type";
import type { Habit, HabitCheckIn, HabitWeekday } from "@/features/habits/type";
import type { JournalEntrySummary } from "@/features/journal/type";
import type { NoteTreeNode } from "@/features/notes/type";
import type { CalendarPlan } from "@/features/plans/type";
import type { BoardLabel, BoardStage, BoardStageKey, BoardTask } from "@/features/projects/type";

/* One sample story told across every preview screen: a newsletter project in the Writing area. */

export const previewProject = {
  name: "Spring newsletter",
  area: "Writing",
  description: "Write, design, and send the spring issue to 1,200 readers.",
  badge: "#F97316",
};

const labels = {
  writing: { uuid: "label-writing", name: "Writing", color: "blue", hex: "#3b82f6" },
  research: { uuid: "label-research", name: "Research", color: "violet", hex: "#8b5cf6" },
  design: { uuid: "label-design", name: "Design", color: "pink", hex: "#ec4899" },
} satisfies Record<string, BoardLabel>;

let taskIndex = 0;
function task(
  stage: BoardStageKey,
  title: string,
  priority: BoardTask["priority"],
  taskLabels: BoardLabel[],
  links: { resources?: number; notes?: number } = {},
): BoardTask {
  taskIndex += 1;
  return {
    uuid: `preview-task-${taskIndex}`,
    title,
    description: null,
    priority,
    stage,
    position: taskIndex,
    labels: taskLabels,
    resources: Array.from({ length: links.resources ?? 0 }, (_, index) => ({
      uuid: `preview-resource-${taskIndex}-${index}`,
      title: "Interview notes",
      areas: [],
      created_at: null,
      updated_at: null,
    })),
    notes: Array.from({ length: links.notes ?? 0 }, (_, index) => ({
      uuid: `preview-note-${taskIndex}-${index}`,
      title: "Spring issue",
      area: null,
      created_at: null,
      updated_at: null,
    })),
    created_at: null,
    updated_at: null,
  };
}

const stageNames: Record<BoardStageKey, string> = {
  backlog: "Backlog",
  todos: "Todos",
  in_progress: "In Progress",
  done: "Done",
};

const stageTasks: Record<BoardStageKey, BoardTask[]> = {
  backlog: [task("backlog", "Plan the summer issue", "low", [labels.writing])],
  todos: [
    task("todos", "Pick the cover photo", "low", [labels.design]),
    task("todos", "Line up two reader questions", "medium", [labels.research]),
  ],
  in_progress: [
    task("in_progress", "Draft the opening essay", "high", [labels.writing], { notes: 1 }),
    task("in_progress", "Interview Ana about the garden", "medium", [labels.research], { resources: 1 }),
  ],
  done: [
    task("done", "Outline the issue", "medium", [labels.writing]),
    task("done", "Collect last month's feedback", "low", [labels.research]),
  ],
};

export const previewStages: BoardStage[] = (Object.keys(stageNames) as BoardStageKey[]).map((key, position) => ({
  uuid: `preview-stage-${key}`,
  key,
  name: stageNames[key],
  position,
  task_count: stageTasks[key].length,
  tasks: stageTasks[key],
}));

export const previewFocusTasks: FocusTask[] = [
  {
    uuid: "preview-focus-1",
    title: "Draft the opening essay",
    linked: true,
    source: { task_uuid: "preview-task-4", project: "Spring newsletter", board: "Board 1", stage: "in_progress" },
    completed_at: null,
    session_count: 2,
    position: 0,
  },
  {
    uuid: "preview-focus-2",
    title: "Reply to Ana's email",
    linked: false,
    source: null,
    completed_at: null,
    session_count: 0,
    position: 1,
  },
];

/* Dates below are built from the viewer's clock, so these screens only render in the browser. */

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysAgo(now: Date, days: number, hour = 9) {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function habit(index: number, name: string, created: Date, extra: Partial<Habit>): Habit {
  return {
    id: index,
    uuid: `preview-habit-${index}`,
    area_id: null,
    name,
    icon: "Repeat2",
    description: null,
    frequency: "daily",
    schedule: null,
    is_active: true,
    created_at: created.toISOString(),
    updated_at: created.toISOString(),
    area: null,
    ...extra,
  };
}

export function buildPreviewHabits(now: Date) {
  const writing = { uuid: "preview-area-writing", name: "Writing", icon: "PenLine", archived_at: null };
  const health = { uuid: "preview-area-health", name: "Health", icon: "Heart", archived_at: null };
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as HabitWeekday;

  const created = daysAgo(now, 20, 0);
  const habits = [
    habit(1, "Morning pages", created, { icon: "NotebookPen", area: writing, area_id: 1 }),
    habit(2, "Walk 30 minutes", created, { icon: "Footprints", area: health, area_id: 2 }),
    habit(3, "Read 20 pages", created, { icon: "BookOpen" }),
    habit(4, "Send the weekly update", created, {
      icon: "Send",
      frequency: "weekly",
      schedule: { days: [weekday] },
      area: writing,
      area_id: 1,
    }),
  ];

  // Most recent first: true = done, false = missed, undefined = no entry.
  const history: Record<string, (boolean | undefined)[]> = {
    "preview-habit-1": [true, true, true, true, true, true, true, true, true, true, true, true],
    "preview-habit-2": [undefined, true, false, true, true, false, true, true],
    "preview-habit-3": [undefined, true, true, false, true, true, true],
    "preview-habit-4": [],
  };

  const checkIns: Record<string, HabitCheckIn[]> = {};
  for (const [uuid, days] of Object.entries(history)) {
    checkIns[uuid] = days.flatMap((completed, offset) =>
      completed === undefined ? [] : [{ date: dayKey(daysAgo(now, offset)), completed }],
    );
  }

  return { habits, checkIns };
}

const doc = (...paragraphs: string[]) =>
  JSON.stringify({
    version: 1,
    blocks: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text, styles: {} }] })),
  });

export const previewNoteBody = [
  "Open with the frost that took the tomatoes. Readers liked the honest posts more than the tidy ones, so keep the mistakes in.",
  "Then Ana's tips on raised beds, and one question from a reader to close.",
];

export function buildPreviewNotes(now: Date): NoteTreeNode[] {
  const node = (
    uuid: string,
    title: string,
    text: string,
    updated: Date,
    extra: Partial<NoteTreeNode> = {},
  ): NoteTreeNode => ({
    uuid,
    parent_uuid: null,
    title,
    content: doc(text),
    is_pinned: false,
    created_at: daysAgo(now, 30).toISOString(),
    updated_at: updated.toISOString(),
    children: [],
    ...extra,
  });

  const spring = node("preview-note-spring", "Spring issue", previewNoteBody.join(" "), daysAgo(now, 0, Math.max(0, now.getHours() - 1)), {
    parent_uuid: "preview-note-ideas",
  });

  return [
    node("preview-note-ideas", "Newsletter ideas", "Topics worth a full issue.", daysAgo(now, 0, Math.max(0, now.getHours() - 1)), {
      is_pinned: true,
      children: [spring],
    }),
    node("preview-note-style", "Style guide", "Short sentences. One idea per paragraph.", daysAgo(now, 1)),
    node("preview-note-reading", "Reading list", "Books for the autumn.", daysAgo(now, 4)),
    node("preview-note-garden", "Garden log", "Frost on the 12th. Replant in two weeks.", daysAgo(now, 12)),
  ];
}

export function buildPreviewJournal(now: Date): JournalEntrySummary[] {
  const entry = (
    index: number,
    title: string,
    preview: string,
    created: Date,
    source: JournalEntrySummary["source"] = null,
  ): JournalEntrySummary => ({
    uuid: `preview-journal-${index}`,
    title,
    content_preview: preview,
    created_at: created.toISOString(),
    updated_at: created.toISOString(),
    resources: [],
    source,
  });

  const reflectedAt = daysAgo(now, 0, Math.max(0, now.getHours() - 1));
  return [
    entry(1, "Focus reflection", "The first paragraph finally came together.", reflectedAt, {
      type: "focus_reflection",
      session_uuid: "preview-session",
      task_title: "Draft the opening essay",
      completed_at: reflectedAt.toISOString(),
      mood: "calm",
    }),
    entry(2, "A slow, good day", "Coffee on the porch, then the garden.", daysAgo(now, 1, 20)),
    entry(3, "Planning the issue", "Three sections, one question from a reader.", daysAgo(now, 3, 8)),
    entry(4, "Garden notes", "The frost took the tomatoes.", daysAgo(now, 6, 18)),
  ];
}

export const previewJournalBody = [
  "The first paragraph finally came together once I stopped trying to sound clever.",
  "Wrote 600 words. The frost story works as the opening. Tomorrow: cut the middle section in half and send the draft to Ana before lunch.",
];

/* Organize: areas, resources, and archives. Times are fixed phrases, so these render the same everywhere. */

export type PreviewArea = {
  name: string;
  description: string;
  icon: LucideIcon;
  background: string;
  /** Tints the shared cover art so each card looks different. */
  hue: number;
  updated: string;
};

export const previewAreas: PreviewArea[] = [
  {
    name: "Writing",
    description: "The newsletter, the blog, and the essays I keep meaning to finish.",
    icon: PenLine,
    background: "#F97316",
    hue: 0,
    updated: "Updated 1 hour ago",
  },
  {
    name: "Health",
    description: "Walks, sleep, and cooking at home more often than not.",
    icon: Heart,
    background: "#10B981",
    hue: 70,
    updated: "Updated yesterday",
  },
  {
    name: "Garden",
    description: "Raised beds, the seed calendar, and what the frost taught me.",
    icon: Sprout,
    background: "#84CC16",
    hue: 30,
    updated: "Updated 3 days ago",
  },
  {
    name: "Home",
    description: "Repairs, the shed roof, and keeping the house running smoothly.",
    icon: House,
    background: "#6366F1",
    hue: 190,
    updated: "Updated last week",
  },
  {
    name: "Finances",
    description: "Budget, savings goals, and the yearly tax checklist.",
    icon: PiggyBank,
    background: "#0EA5E9",
    hue: 150,
    updated: "Updated 2 weeks ago",
  },
];

export type PreviewResourceType = "note" | "link" | "image" | "file";

export type PreviewResource = {
  title: string;
  icon: LucideIcon;
  background: string;
  types: PreviewResourceType[];
  summary: string;
  tags: string[];
  link?: { kind: "project" | "area"; name: string };
  attachments?: number;
  updated: string;
};

export const previewResources: PreviewResource[] = [
  {
    title: "Interview notes",
    icon: BookOpen,
    background: "#18181B",
    types: ["note"],
    summary: "Ana on raised beds: start small, use untreated cedar, and fill with a 60/40 soil and compost mix.",
    tags: ["interviews", "garden"],
    link: { kind: "project", name: "Spring newsletter" },
    updated: "2h ago",
  },
  {
    title: "Raised bed guide",
    icon: Link2,
    background: "#22C55E",
    types: ["link"],
    summary: "A clear, illustrated walkthrough of building and filling a raised bed in one weekend.",
    tags: ["garden", "how-to"],
    link: { kind: "area", name: "Garden" },
    updated: "1d ago",
  },
  {
    title: "Cover photo ideas",
    icon: ImageIcon,
    background: "#EC4899",
    types: ["image"],
    summary: "Morning light on the beds, seed packets on the table, and the frosted tomatoes.",
    tags: ["design"],
    link: { kind: "project", name: "Spring newsletter" },
    attachments: 6,
    updated: "2d ago",
  },
  {
    title: "Newsletter style guide",
    icon: FileText,
    background: "#3B82F6",
    types: ["note", "file"],
    summary: "Short sentences. One idea per paragraph. Keep the mistakes in.",
    tags: ["writing", "reference"],
    link: { kind: "area", name: "Writing" },
    attachments: 1,
    updated: "4d ago",
  },
  {
    title: "Reader survey results",
    icon: ChartColumn,
    background: "#8B5CF6",
    types: ["file"],
    summary: "312 replies. Readers want more honest posts and fewer lists.",
    tags: ["research", "readers"],
    link: { kind: "project", name: "Spring newsletter" },
    attachments: 2,
    updated: "1w ago",
  },
  {
    title: "Seed catalog",
    icon: Sprout,
    background: "#F59E0B",
    types: ["link", "image"],
    summary: "Heirloom tomatoes, early peas, and the beans that did well last year.",
    tags: ["garden"],
    link: { kind: "area", name: "Garden" },
    updated: "2w ago",
  },
];

export const previewResourceTags = ["design", "garden", "how-to", "interviews", "readers", "reference", "research", "writing"];

export type PreviewArchiveItem = {
  title: string;
  secondary: string;
  icon: LucideIcon;
  background: string;
  archivedAt: string;
  /** Projects only: the area they belonged to. */
  area?: string;
};

export const previewArchives: Record<"areas" | "projects" | "resources", PreviewArchiveItem[]> = {
  areas: [
    {
      title: "Side business",
      secondary: "Selling prints at the weekend market",
      icon: Store,
      background: "#A855F7",
      archivedAt: "2026-03-14T10:00:00Z",
    },
  ],
  projects: [
    {
      title: "Winter newsletter",
      secondary: "The December issue, sent to 1,100 readers",
      icon: Snowflake,
      background: "#0EA5E9",
      archivedAt: "2026-01-08T10:00:00Z",
      area: "Writing",
    },
    {
      title: "Autumn garden plan",
      secondary: "Garlic, cover crops, and putting the beds to sleep",
      icon: Leaf,
      background: "#84CC16",
      archivedAt: "2025-11-20T10:00:00Z",
      area: "Garden",
    },
  ],
  resources: [
    {
      title: "Old email template",
      secondary: "The layout before the redesign",
      icon: Mail,
      background: "#64748B",
      archivedAt: "2026-02-02T10:00:00Z",
    },
    {
      title: "Holiday gift list",
      secondary: "Books and seeds for everyone",
      icon: Gift,
      background: "#F43F5E",
      archivedAt: "2026-01-03T10:00:00Z",
    },
  ],
};

/* Tools: the personal board, letters, and calendar plans. */

const boardTasks: Record<BoardStageKey, BoardTask[]> = {
  backlog: [
    task("backlog", "Fix the shed roof", "low", [labels.design]),
    task("backlog", "Research rain barrels", "low", [labels.research]),
  ],
  todos: [
    task("todos", "Book the dentist", "medium", []),
    task("todos", "Write to the seed library", "medium", [labels.writing]),
  ],
  in_progress: [task("in_progress", "Sort last year's photos", "high", [labels.design], { resources: 1 })],
  done: [
    task("done", "Renew the library card", "low", []),
    task("done", "Order compost", "medium", [labels.research]),
  ],
};

export const previewBoardStages: BoardStage[] = (Object.keys(stageNames) as BoardStageKey[]).map((key, position) => ({
  uuid: `preview-board-stage-${key}`,
  key,
  name: stageNames[key],
  position,
  task_count: boardTasks[key].length,
  tasks: boardTasks[key],
}));

export type PreviewLetter = {
  title: string;
  excerpt: string;
  done: boolean;
  exported?: string;
  words: number;
  minutes: number;
  updated: string;
  cover?: string;
};

export function buildPreviewLetters(now: Date): PreviewLetter[] {
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  return [
    {
      title: "What the frost taught me",
      excerpt: "I lost every tomato in one night. Here is what I would do differently, and why I am glad it happened.",
      done: false,
      words: 842,
      minutes: 4,
      updated: hoursAgo(1),
      cover: "#F97316",
    },
    {
      title: "A letter to new readers",
      excerpt: "Welcome. This newsletter is about small gardens, slow mornings, and writing things down.",
      done: true,
      exported: "Instagram",
      words: 415,
      minutes: 2,
      updated: hoursAgo(30),
      cover: "#10B981",
    },
    {
      title: "Notes from the garden",
      excerpt: "Three things that grew better than expected, and one that did not grow at all.",
      done: true,
      exported: "X",
      words: 620,
      minutes: 3,
      updated: hoursAgo(24 * 5),
      cover: "#6366F1",
    },
    {
      title: "On starting small",
      excerpt: "Nothing written yet.",
      done: false,
      words: 0,
      minutes: 0,
      updated: hoursAgo(24 * 9),
    },
  ];
}

export function buildPreviewPlans(now: Date): CalendarPlan[] {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const plan = (
    index: number,
    title: string,
    days: number,
    hour: number | null,
    link: { project?: string; area?: string } = {},
    reminder: CalendarPlan["reminder_status"] = "none",
  ): CalendarPlan => {
    const start = daysAgo(now, -days, hour ?? 0);
    if (hour !== null && hour % 1 !== 0) start.setMinutes(30);
    return {
      uuid: `preview-plan-${index}`,
      title,
      notes: null,
      date: dayKey(start),
      time: hour === null ? null : `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      timezone,
      starts_at: start.toISOString(),
      is_all_day: hour === null,
      project: link.project ? { uuid: `preview-plan-project-${index}`, name: link.project } : null,
      area: link.area ? { uuid: `preview-plan-area-${index}`, name: link.area } : null,
      reminder_offset_minutes: reminder === "none" ? null : 30,
      remind_at: reminder === "none" ? null : new Date(start.getTime() - 30 * 60 * 1000).toISOString(),
      notified_at: null,
      email_sent_at: null,
      reminder_status: reminder,
    };
  };

  return [
    plan(1, "Call with Ana", -6, 10, { project: "Spring newsletter" }),
    plan(2, "Farmers market", -3, null, { area: "Garden" }),
    plan(3, "Walk with Sam", -1, 7.5, { area: "Health" }),
    // Two hours from now, so it is always the next thing coming up (late at night it moves to tomorrow).
    plan(4, "Edit the opening essay", 0, now.getHours() + 2, { project: "Spring newsletter" }, "scheduled"),
    plan(5, "Dentist", 1, 9),
    plan(6, "Plant the peas", 2, null, { area: "Garden" }),
    plan(7, "Send the spring issue", 4, 8, { project: "Spring newsletter" }, "scheduled"),
    plan(8, "Budget review", 6, 18, { area: "Finances" }),
    plan(9, "Seed swap", 9, 11, { area: "Garden" }),
    plan(10, "Reader Q&A draft due", 12, null, { project: "Spring newsletter" }),
  ];
}
