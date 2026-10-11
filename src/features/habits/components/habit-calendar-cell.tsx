"use client";

import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit, HabitCalendarColumn, HabitCheckIn } from "../type";
import {
  aggregateMonth,
  isCurrentColumn,
  isScheduled,
  isToday,
  rateTone,
} from "./habit-calendar-utils";

export type HabitDayState =
  | "completed"
  | "missed"
  | "scheduled"
  | "upcoming"
  | "not scheduled";

export function habitDayState(
  habit: Habit,
  entry: HabitCheckIn | undefined,
  date: Date,
  today: Date,
): HabitDayState {
  if (entry?.completed === true) return "completed";
  if (entry?.completed === false) return "missed";
  if (!isScheduled(habit, date)) return "not scheduled";
  if (date > today) return "upcoming";
  return date < today ? "missed" : "scheduled";
}

export function HabitCalendarCell({
  habit,
  entries,
  column,
  today,
  compact,
  chainBefore,
  chainAfter,
  pending,
  saving,
  onCheckIn,
  onOpenMonth,
}: {
  habit: Habit;
  entries: Map<string, HabitCheckIn>;
  column: HabitCalendarColumn;
  today: Date;
  compact: boolean;
  chainBefore: boolean;
  chainAfter: boolean;
  pending: boolean;
  saving: boolean;
  onCheckIn: (habitUuid: string, date: string, completed: boolean) => void;
  onOpenMonth: (date: Date) => void;
}) {
  if (column.aggregate) {
    const summary = aggregateMonth(habit, entries, column.date, today);
    const rate = summary.scheduled ? summary.completed / summary.scheduled : 0;
    return (
      <div
        role="cell"
        className={cn(
          "habit-column",
          isCurrentColumn(column, today) && "habit-column-current",
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
          className="group/agg flex min-h-16 w-full items-center justify-center p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default"
        >
          {summary.scheduled ? (
            <span
              className={cn(
                "flex h-11 w-full max-w-16 flex-col items-center justify-center rounded-lg leading-tight transition-[transform,box-shadow] group-hover/agg:shadow-sm group-hover/agg:ring-2 group-hover/agg:ring-emerald-500/40 motion-safe:group-hover/agg:scale-105",
                rateTone(rate),
              )}
            >
              <span className="text-xs font-semibold tabular-nums">
                {Math.round(rate * 100)}%
              </span>
              <span className="text-[0.625rem] tabular-nums opacity-80">
                {summary.completed}/{summary.scheduled}
              </span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">—</span>
          )}
        </button>
      </div>
    );
  }

  const state = habitDayState(habit, entries.get(column.key), column.date, today);
  const completed = state === "completed";
  const interactive = isScheduled(habit, column.date) && column.date <= today;
  const label =
    habit.name +
    ", " +
    column.label +
    ": " +
    (saving ? "saving check-in" : state);

  return (
    <div
      role="cell"
      className={cn(
        "habit-column habit-day-cell min-w-0",
        isToday(column.date, today) && "habit-column-current",
      )}
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
          "group/day flex min-h-16 w-full flex-col items-center justify-center gap-2 rounded-[inherit] py-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
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
        <span aria-hidden="true" className="relative flex w-full justify-center">
          {completed && chainBefore && (
            <span className="habit-chain absolute inset-y-0 left-0 right-1/2 my-auto h-1.5 bg-emerald-500/25" />
          )}
          {completed && chainAfter && (
            <span className="habit-chain absolute inset-y-0 left-1/2 right-0 my-auto h-1.5 bg-emerald-500/25" />
          )}
          <span
            className={cn(
              "relative flex items-center justify-center rounded-full transition-[background-color,border-color,color,transform] duration-200",
              compact ? "size-7" : "size-9",
              completed &&
                "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 motion-safe:animate-in motion-safe:zoom-in-75",
              state === "missed" && "bg-destructive/10 text-destructive/70",
              state === "scheduled" &&
                "border-2 border-emerald-500/70 text-emerald-600 dark:text-emerald-400",
              state === "upcoming" && "text-muted-foreground",
              state === "not scheduled" &&
                "border border-dashed border-muted-foreground/20",
              interactive &&
                !completed &&
                !saving &&
                "group-hover/day:bg-emerald-500/10 group-hover/day:text-emerald-600 motion-safe:group-hover/day:scale-110 dark:group-hover/day:text-emerald-400",
              interactive &&
                completed &&
                "motion-safe:group-hover/day:scale-105",
              saving && "border-0 bg-muted text-muted-foreground",
            )}
          >
            {saving ? (
              <Loader2
                className={cn(
                  "animate-spin motion-reduce:animate-none",
                  compact ? "size-3.5" : "size-4",
                )}
              />
            ) : completed ? (
              <Check
                className={compact ? "size-3.5" : "size-4"}
                strokeWidth={3}
              />
            ) : state === "missed" ? (
              <X className={compact ? "size-3" : "size-3.5"} strokeWidth={2.5} />
            ) : state === "upcoming" ? (
              <span className="size-1.5 rounded-full bg-muted-foreground/35" />
            ) : state === "scheduled" ? (
              <Check
                className={cn(
                  "opacity-0 transition-opacity group-hover/day:opacity-60",
                  compact ? "size-3.5" : "size-4",
                )}
                strokeWidth={3}
              />
            ) : null}
          </span>
        </span>
      </button>
    </div>
  );
}
