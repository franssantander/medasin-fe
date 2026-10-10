import type { NoteTreeNode } from "@/features/notes/type";
import type {
  Board,
  BoardStageKey,
  BoardTask,
  BoardTaskPriority,
} from "../type";

export const priorityStyles: Record<BoardTaskPriority, string> = {
  low: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export const stageCountStyles: Record<BoardStageKey, string> = {
  backlog: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  todos: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export const stageColumnStyles: Record<
  BoardStageKey,
  { column: string; header: string; footer: string }
> = {
  backlog: {
    column: "border-slate-500/15 bg-slate-500/[0.03] dark:border-slate-400/15 dark:bg-slate-400/[0.04]",
    header: "border-b-slate-500/15 border-t-slate-500/60 bg-slate-500/[0.06] dark:border-b-slate-400/15 dark:bg-slate-400/[0.06]",
    footer: "border-slate-500/15 dark:border-slate-400/15",
  },
  todos: {
    column: "border-blue-500/15 bg-blue-500/[0.03] dark:border-blue-400/15 dark:bg-blue-400/[0.04]",
    header: "border-b-blue-500/15 border-t-blue-500/60 bg-blue-500/[0.06] dark:border-b-blue-400/15 dark:bg-blue-400/[0.06]",
    footer: "border-blue-500/15 dark:border-blue-400/15",
  },
  in_progress: {
    column: "border-amber-500/15 bg-amber-500/[0.03] dark:border-amber-400/15 dark:bg-amber-400/[0.04]",
    header: "border-b-amber-500/15 border-t-amber-500/60 bg-amber-500/[0.06] dark:border-b-amber-400/15 dark:bg-amber-400/[0.06]",
    footer: "border-amber-500/15 dark:border-amber-400/15",
  },
  done: {
    column: "border-emerald-500/15 bg-emerald-500/[0.03] dark:border-emerald-400/15 dark:bg-emerald-400/[0.04]",
    header: "border-b-emerald-500/15 border-t-emerald-500/60 bg-emerald-500/[0.06] dark:border-b-emerald-400/15 dark:bg-emerald-400/[0.06]",
    footer: "border-emerald-500/15 dark:border-emerald-400/15",
  },
};

export const stageDotColors: Record<BoardStageKey, string> = {
  backlog: "#64748b",
  todos: "#3b82f6",
  in_progress: "#f59e0b",
  done: "#10b981",
};

export const priorityDotColors: Record<BoardTask["priority"], string> = {
  low: "#64748b",
  medium: "#f59e0b",
  high: "#ef4444",
};

export const priorityLabels: Record<BoardTaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Case-insensitive match on task title or any label name. */
export function filterBoardTasks(tasks: BoardTask[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return tasks;
  return tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(needle) ||
      task.labels.some((label) => label.name.toLowerCase().includes(needle)),
  );
}

export const kanbanGridStyles =
  "grid w-full min-w-0 grid-flow-col auto-cols-[minmax(18rem,1fr)] gap-4 overflow-x-auto pb-4 @[64rem]:grid-flow-row @[64rem]:grid-cols-4 @[64rem]:auto-cols-auto @[64rem]:overflow-x-visible @[64rem]:pb-0";

export type FlatNote = Omit<NoteTreeNode, "children"> & { depth: number };

export function flattenNotes(nodes: NoteTreeNode[], depth = 0): FlatNote[] {
  return nodes.flatMap((node) => {
    const { children, ...summary } = node;
    return [{ ...summary, depth }, ...flattenNotes(children, depth + 1)];
  });
}

export function toggleSelection(items: string[], uuid: string) {
  return items.includes(uuid)
    ? items.filter((item) => item !== uuid)
    : [...items, uuid];
}

export function getLabelTextColor(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character.repeat(2))
          .join("")
      : normalized;
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#ffffff";

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160
    ? "#111827"
    : "#ffffff";
}

export function formatTaskTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatTaskDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

export function moveTaskLocally(
  board: Board,
  taskUuid: string,
  targetKey: BoardStageKey,
  targetPosition: number,
): Board {
  const task = board.stages
    .flatMap((stage) => stage.tasks)
    .find((item) => item.uuid === taskUuid);
  if (!task) return board;

  const stages = board.stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.filter((item) => item.uuid !== taskUuid),
  }));
  const target = stages.find((stage) => stage.key === targetKey);
  if (!target) return board;

  const tasks = [...target.tasks];
  tasks.splice(Math.min(targetPosition, tasks.length), 0, {
    ...task,
    stage: targetKey,
  });
  target.tasks = tasks.map((item, position) => ({ ...item, position }));

  return {
    ...board,
    stages: stages.map((stage) => ({
      ...stage,
      task_count: stage.tasks.length,
    })),
  };
}
