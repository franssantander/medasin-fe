"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { HabitCalendarColumn } from "../type";
import { isCurrentColumn } from "./habit-calendar-utils";

export function HabitCalendarHeader({
  columns,
  today,
  style,
}: {
  columns: HabitCalendarColumn[];
  today: Date;
  style: CSSProperties;
}) {
  return (
    <div
      className="sticky top-0 z-20 grid grid-cols-[minmax(16rem,1.80fr)_repeat(var(--habit-columns),minmax(3.25rem,1fr))] border-b bg-muted/95 shadow-sm backdrop-blur"
      style={style}
    >
      <div className="sticky left-0 top-0 z-30 flex min-h-14 items-center border-r bg-muted/95 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
        Habit
      </div>
      {columns.map((column) => (
        <div
          key={column.key}
          aria-current={isCurrentColumn(column, today) ? "date" : undefined}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-0.5 border-r px-1.5 text-center last:border-r-0",
            isCurrentColumn(column, today) && "bg-primary/10 text-primary",
          )}
        >
          <span className="text-sm font-semibold">{column.shortLabel}</span>
          <span className="truncate text-xs text-muted-foreground">
            {column.aggregate
              ? column.label
              : column.date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
          </span>
        </div>
      ))}
    </div>
  );
}
