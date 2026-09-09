"use client";

import { Check, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit, HabitCalendarColumn, HabitCheckIn } from "../type";
import {
  aggregateMonth,
  dateFromLocal,
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
  onCheckIn,
  onOpenMonth,
}: {
  habit: Habit;
  entries: Map<string, HabitCheckIn>;
  column: HabitCalendarColumn;
  today: Date;
  pending: boolean;
  onCheckIn: (habitUuid: string, date: string, completed: boolean) => void;
  onOpenMonth: (date: Date) => void;
}) {
  if (column.aggregate) {
    const summary = aggregateMonth(habit, entries, column.date, today);
    return (
      <button
        type="button"
        disabled={summary.scheduled === 0}
        onClick={() => onOpenMonth(column.date)}
        aria-label={`${habit.name}, ${column.label}: ${summary.completed} of ${summary.scheduled} complete`}
        className={cn(
          "flex min-h-16 min-w-14 items-center justify-center border-r transition-colors last:border-r-0 hover:bg-muted/50 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40",
          isCurrentColumn(column, today) && "bg-primary/5",
        )}
      >
        <span
          className={cn(
            "flex size-9 flex-col items-center justify-center rounded-full border text-[10px] font-semibold",
            summary.completed === summary.scheduled && summary.scheduled > 0
              ? "border-primary bg-primary text-primary-foreground"
              : summary.completed > 0
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-muted-foreground/30 text-muted-foreground",
          )}
        >
          {summary.scheduled
            ? `${summary.completed}/${summary.scheduled}`
            : "—"}
        </span>
      </button>
    );
  }

  const dateKey = column.key;
  const date = dateFromLocal(dateKey);
  const scheduled = isScheduled(habit, date);
  const entry = entries.get(dateKey);
  const future = date > today;
  const completed = entry?.completed === true;
  const missed = entry?.completed === false || (scheduled && date < today);
  const interactive = scheduled && !future && habit.is_active;

  return (
    <button
      type="button"
      disabled={!interactive || pending}
      onClick={() => onCheckIn(habit.uuid, dateKey, !completed)}
      aria-label={`${habit.name}, ${column.label}: ${completed ? "completed" : missed ? "missed" : scheduled ? "pending" : "not scheduled"}`}
      className={cn(
        "relative flex min-h-16 min-w-14 items-center justify-center border-r transition-colors last:border-r-0 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring",
        interactive && "hover:bg-muted/50",
        isToday(date, today) && "bg-primary/5",
        !scheduled && "bg-muted/20",
        future && "opacity-40",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full border-2",
          completed && "border-primary bg-primary text-primary-foreground",
          missed &&
            !completed &&
            "border-destructive/50 bg-destructive/10 text-destructive",
          scheduled &&
            !completed &&
            !missed &&
            "border-primary/40 text-primary",
          !scheduled && "border-muted-foreground/20 text-muted-foreground/40",
        )}
      >
        {completed ? (
          <Check />
        ) : missed && scheduled ? (
          <span className="text-xs">–</span>
        ) : scheduled ? (
          <CircleDashed />
        ) : null}
      </span>
    </button>
  );
}
