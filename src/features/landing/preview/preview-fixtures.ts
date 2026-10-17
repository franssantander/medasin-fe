import type { FocusTask } from "@/features/focus/type";
import type { Habit, HabitCheckIn, HabitWeekday } from "@/features/habits/type";
import type { JournalEntrySummary } from "@/features/journal/type";
import type { NoteTreeNode } from "@/features/notes/type";
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
