"use client";

import { Check, Circle, CircleDashed, Loader2, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit, HabitCalendarColumn, HabitCheckIn } from "../type";
import {
  aggregateMonth,
  isCurrentColumn,
  isScheduled,
  isToday,
} from "./habit-calendar-utils";

export function HabitCalendarCell({
  habit,
  entries,
  column,
  today,
  pending,
  saving,
  onCheckIn,
  onOpenMonth,
}: {
  habit: Habit;
  entries: Map<string, HabitCheckIn>;
  column: HabitCalendarColumn;
  today: Date;
  pending: boolean;
  saving: boolean;
  onCheckIn: (habitUuid: string, date: string, completed: boolean) => void;
  onOpenMonth: (date: Date) => void;
}) {
  if (column.aggregate) {
    const summary = aggregateMonth(habit, entries, column.date, today);
    return (
      <div
        role="cell"
        className={cn(
          "border-r last:border-r-0",
          isCurrentColumn(column, today) && "bg-primary/5",
        )}
      >
        <button
          type="button"
          disabled={!summary.scheduled}
          onClick={() => onOpenMonth(column.date)}
          aria-label={
            habit.name +
            ", " +
            column.label +
            ": " +
            summary.completed +
            " of " +
            summary.scheduled +
            " complete. Open month"
          }
          className="flex min-h-16 w-full items-center justify-center p-1.5 outline-none transition-colors enabled:hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default disabled:text-muted-foreground"
        >
          <span className="flex min-w-9 flex-col items-center gap-1.5">
            <span className="text-xs font-medium tabular-nums">
              {summary.scheduled
                ? summary.completed + "/" + summary.scheduled
                : "—"}
            </span>
            {summary.scheduled > 0 && (
              <span
                aria-hidden="true"
                className="h-1 w-8 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{
                    width: (summary.completed / summary.scheduled) * 100 + "%",
                  }}
                />
              </span>
            )}
          </span>
        </button>
      </div>
    );
  }

  const scheduled = isScheduled(habit, column.date);
  const entry = entries.get(column.key);
  const future = column.date > today;
  const completed = entry?.completed === true;
  const state = completed
    ? "completed"
    : entry?.completed === false
      ? "missed"
      : scheduled
        ? future
          ? "upcoming"
          : column.date < today
            ? "missed"
            : "scheduled"
        : "not scheduled";
  const interactive = scheduled && !future;
  const label =
    habit.name +
    ", " +
    column.label +
    ": " +
    (saving ? "saving check-in" : state);
  const Icon = saving
    ? Loader2
    : state === "completed"
      ? Check
      : state === "missed"
        ? X
        : state === "upcoming"
          ? CircleDashed
          : state === "scheduled"
            ? Circle
            : Minus;

  return (
    <div
      role="cell"
      className="habit-day-cell min-w-0 border-r last:border-r-0"
      aria-busy={saving || undefined}
    >
      <button
        type="button"
        disabled={!interactive || pending}
        onClick={() => onCheckIn(habit.uuid, column.key, !completed)}
        aria-label={label}
        aria-pressed={interactive ? completed : undefined}
        title={label}
        className={cn(
          "flex min-h-16 w-full flex-col items-center justify-center gap-2 rounded-[inherit] p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          interactive && "hover:bg-muted/60",
          isToday(column.date, today) && "bg-primary/5",
          saving && "cursor-wait",
        )}
      >
        <span
          aria-hidden="true"
          className="habit-mobile-date hidden flex-col items-center gap-0.5 text-xs text-muted-foreground"
        >
          <span>{column.shortLabel}</span>
          <span className="font-medium tabular-nums">
            {column.date.getDate()}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border transition-colors",
            state === "completed" &&
              "border-primary bg-primary text-primary-foreground",
            state === "missed" &&
              "border-destructive/25 bg-destructive/5 text-destructive",
            state === "scheduled" &&
              "border-primary/35 bg-background text-primary",
            state === "upcoming" &&
              "border-dashed border-muted-foreground/35 text-muted-foreground",
            state === "not scheduled" &&
              "border-transparent text-muted-foreground/50",
            saving && "border-primary/35 bg-muted text-primary",
          )}
        >
          <Icon
            className={cn(
              "size-4",
              saving && "animate-spin motion-reduce:animate-none",
            )}
          />
        </span>
      </button>
    </div>
  );
}
