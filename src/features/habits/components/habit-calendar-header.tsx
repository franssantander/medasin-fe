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
  return (
    <div
      role="row"
      className="habit-calendar-grid habit-calendar-header sticky top-0 z-20 border-b bg-muted"
    >
      <div
        role="columnheader"
        className="sticky left-0 z-30 flex min-h-14 items-center border-r bg-muted px-4 text-xs font-medium text-muted-foreground"
      >
        Habit / schedule
      </div>
      {columns.map((column) => (
        <div
          key={column.key}
          role="columnheader"
          aria-label={column.label}
          aria-current={isCurrentColumn(column, today) ? "date" : undefined}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-0.5 border-r px-1 text-center last:border-r-0",
            isCurrentColumn(column, today) && "bg-primary/10 text-primary",
          )}
        >
          <span className="text-sm font-semibold tabular-nums">
            {column.shortLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {column.aggregate
              ? column.date.toLocaleDateString(undefined, { year: "numeric" })
              : column.date.toLocaleDateString(undefined, {
                  month: "short",
                  ...(columns.length === 7 ? { day: "numeric" } : {}),
                })}
          </span>
        </div>
      ))}
    </div>
  );
}
