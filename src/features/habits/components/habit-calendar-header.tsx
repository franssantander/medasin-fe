"use client";

import { cn } from "@/lib/utils";
import type { HabitCalendarColumn } from "../type";
import { isCurrentColumn } from "./habit-calendar-utils";

export function HabitCalendarHeader({
  columns,
  today,
}: {
  columns: HabitCalendarColumn[];
  today: Date;
}) {
  const week = columns.length === 7;
  return (
    <div
      role="row"
      className="habit-calendar-grid habit-calendar-header sticky top-0 z-20 border-b bg-card"
    >
      <div
        role="columnheader"
        className="sticky left-0 z-30 flex min-h-14 items-center border-r bg-card px-4 text-xs font-medium text-muted-foreground"
      >
        Habit
      </div>
      {columns.map((column) => {
        const current = isCurrentColumn(column, today);
        return (
          <div
            key={column.key}
            role="columnheader"
            aria-label={column.label}
            aria-current={current ? "date" : undefined}
            className={cn(
              "habit-column flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-center",
              current && "habit-column-current",
            )}
          >
            <span
              className={cn(
                "text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase",
                current && "text-foreground",
              )}
            >
              {column.aggregate
                ? column.date.toLocaleDateString(undefined, { month: "short" })
                : week
                  ? column.shortLabel
                  : column.date.toLocaleDateString(undefined, {
                      weekday: "narrow",
                    })}
            </span>
            <span
              className={cn(
                "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums",
                current && "bg-primary text-primary-foreground",
              )}
            >
              {column.aggregate
                ? column.date.getFullYear()
                : column.date.getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
