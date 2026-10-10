"use client";

import { cn } from "@/lib/utils";
import type { Habit, HabitCheckIn } from "../type";
import { dayState } from "./habit-tracker-utils";

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
  const state = dayState(habit, date, entry, today);

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
        state === "done" && "border-emerald-500 bg-emerald-500 text-white",
        state === "missed" &&
          "border-destructive/40 bg-destructive/10 text-destructive",
        state === "skipped" && "border-border bg-muted text-muted-foreground",
        (state === "due" || state === "upcoming") &&
          "border-primary/30 bg-primary/10 text-primary",
        state === "rest" &&
          "border-transparent bg-muted/50 text-muted-foreground",
        onClick && "hover:border-primary",
      )}
    >
      <span>{compact ? label : date.getDate()}</span>
      {compact && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            state === "done"
              ? "bg-white"
              : state === "missed"
                ? "bg-destructive"
                : state === "due" || state === "upcoming"
                  ? "bg-primary"
                  : "bg-muted-foreground/30",
          )}
        />
      )}
    </button>
  );
}
