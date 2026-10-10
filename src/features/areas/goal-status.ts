import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import {
  Circle,
  CircleCheckBig,
  CircleDot,
  CircleSlash,
  type LucideIcon,
} from "lucide-react";
import type { Goal, GoalFilter, GoalStatus } from "./type";

export const goalStatusLabels: Record<GoalStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const goalStatusBadgeClassNames: Record<GoalStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  in_progress:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export const goalStatusIcons: Record<GoalStatus, LucideIcon> = {
  pending: Circle,
  in_progress: CircleDot,
  completed: CircleCheckBig,
  cancelled: CircleSlash,
};

export const goalStatusTintClassNames: Record<GoalStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground",
};

export const goalStatusOptions = (
  ["pending", "in_progress", "completed", "cancelled"] as const
).map((value) => ({ value, label: goalStatusLabels[value] }));

export type GoalTimelineTone = "normal" | "soon" | "overdue" | "done" | "muted";

export type GoalTimeline = {
  label: string;
  tone: GoalTimelineTone;
  progress?: number;
  range?: string;
};

/** Date-only API values arrive as UTC timestamps; read the calendar date in local time. */
export function parseGoalDate(value?: string | null) {
  if (!value) return undefined;
  const date = parseISO(value.slice(0, 10));
  return isValid(date) ? date : undefined;
}

export function formatGoalDate(value?: string | null, pattern = "MMM d, yyyy") {
  const date = parseGoalDate(value);
  return date ? format(date, pattern) : "";
}

function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function goalTimeline(goal: Goal, today = new Date()): GoalTimeline {
  const start = parseGoalDate(goal.start_date);
  const due = parseGoalDate(goal.due_date);
  const range =
    start && due
      ? `${format(start, "MMM d")} → ${format(due, "MMM d, yyyy")}`
      : undefined;

  if (goal.status === "completed") {
    const completed = goal.completed_at ? new Date(goal.completed_at) : undefined;
    return {
      label:
        completed && isValid(completed)
          ? `Achieved ${format(completed, "MMM d, yyyy")}`
          : "Achieved",
      tone: "done",
      progress: start && due ? 100 : undefined,
      range,
    };
  }
  if (goal.status === "cancelled") return { label: "Cancelled", tone: "muted", range };

  if (!due) {
    return {
      label: start ? `Started ${format(start, "MMM d, yyyy")}` : "No dates set",
      tone: "muted",
    };
  }

  const daysLeft = differenceInCalendarDays(due, today);
  const progress =
    start && due > start
      ? Math.min(
          100,
          Math.max(
            0,
            (differenceInCalendarDays(today, start) /
              differenceInCalendarDays(due, start)) *
              100,
          ),
        )
      : undefined;

  if (daysLeft < 0) {
    return {
      label: `Overdue by ${plural(-daysLeft, "day")}`,
      tone: "overdue",
      progress: progress ?? 100,
      range,
    };
  }
  if (daysLeft === 0) return { label: "Due today", tone: "soon", progress, range };
  if (daysLeft <= 7) {
    return { label: `Due in ${plural(daysLeft, "day")}`, tone: "soon", progress, range };
  }

  return {
    label: start ? `${plural(daysLeft, "day")} left` : `Due ${format(due, "MMM d, yyyy")}`,
    tone: "normal",
    progress,
    range,
  };
}

export function goalMatchesFilter(status: GoalStatus, filter: GoalFilter) {
  if (filter === "all") return true;
  if (filter === "active") return status === "pending" || status === "in_progress";
  return status === filter;
}
