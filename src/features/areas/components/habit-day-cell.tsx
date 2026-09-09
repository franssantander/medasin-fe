"use client";

import { cn } from "@/lib/utils";
import type { Habit, HabitCheckIn } from "../type";
import { isScheduled } from "./habit-tracker-utils";

export function DayCell({
  date,
  habit,
  entry,
  today,
  compact = false,
  label,
  outside,
  selected,
  onClick,
}: {
  date: Date;
  habit: Habit;
  entry?: HabitCheckIn;
  today: Date;
  compact?: boolean;
  label?: string;
  outside?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const scheduled = isScheduled(habit, date);
  const past = date < today;
  const state =
    entry?.completed === true
      ? "complete"
      : entry?.completed === false || (scheduled && past)
        ? "missed"
        : scheduled
          ? "pending"
          : "off";

  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border text-xs transition-colors",
        compact ? "h-12 gap-1" : "h-10",
        outside && "opacity-30",
        selected && "ring-2 ring-primary ring-offset-1",
        state === "complete" && "border-emerald-500 bg-emerald-500 text-white",
        state === "missed" &&
          "border-destructive/40 bg-destructive/10 text-destructive",
        state === "pending" && "border-primary/30 bg-primary/10 text-primary",
        state === "off" &&
          "border-transparent bg-muted/50 text-muted-foreground",
        onClick && "hover:border-primary",
      )}
    >
      <span>{compact ? label : date.getDate()}</span>
      {compact && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            state === "complete"
              ? "bg-white"
              : state === "missed"
                ? "bg-destructive"
                : state === "pending"
                  ? "bg-primary"
                  : "bg-muted-foreground/30",
          )}
        />
      )}
    </button>
  );
}
