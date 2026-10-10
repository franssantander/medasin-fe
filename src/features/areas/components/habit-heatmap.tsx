"use client";

import { cn } from "@/lib/utils";
import type { Habit, HabitCheckIn } from "../type";
import {
  addDays,
  dayState,
  localDate,
  type HabitDayState,
} from "./habit-tracker-utils";

const WEEKS = 12;

const cellClassNames: Record<HabitDayState | "future", string> = {
  done: "bg-emerald-500",
  missed: "bg-destructive/25",
  skipped: "bg-muted-foreground/25",
  due: "bg-muted ring-1 ring-primary/50 ring-inset",
  upcoming: "bg-muted",
  rest: "ring-1 ring-border ring-inset",
  future: "bg-transparent",
};

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "short" });
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export function HabitHeatmap({
  habit,
  checkIns,
  today,
}: {
  habit: Habit;
  checkIns: Map<string, HabitCheckIn>;
  today: Date;
}) {
  const firstDay = addDays(today, -today.getDay() - (WEEKS - 1) * 7);
  const columns = Array.from({ length: WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(firstDay, week * 7 + day);
      const future = date > today;
      const state = future
        ? "future"
        : dayState(habit, date, checkIns.get(localDate(date)), today);
      return { date, state } as const;
    }),
  );
  const cells = columns.flat().filter((cell) => cell.state !== "future");
  const scheduled = cells.filter(
    (cell) => cell.state !== "rest" && cell.state !== "upcoming",
  ).length;
  const done = cells.filter((cell) => cell.state === "done").length;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Last {WEEKS} weeks</span>
        <span className="tabular-nums">
          {done} of {scheduled} done
        </span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div
          role="img"
          aria-label={`Last ${WEEKS} weeks: ${done} of ${scheduled} scheduled days done`}
          className="grid w-max gap-1"
        >
          <div className="grid grid-cols-[repeat(12,0.875rem)] gap-1 text-[10px] leading-none text-muted-foreground">
            {columns.map((column, index) => {
              const month = column[0].date.getMonth();
              const showLabel =
                index === 0 || month !== columns[index - 1][0].date.getMonth();
              return (
                <span key={index} className="h-3 overflow-visible whitespace-nowrap">
                  {showLabel ? monthFormat.format(column[0].date) : ""}
                </span>
              );
            })}
          </div>
          <div className="grid grid-flow-col grid-cols-[repeat(12,0.875rem)] grid-rows-7 gap-1">
            {columns.flat().map(({ date, state }) => (
              <span
                key={localDate(date)}
                title={
                  state === "future"
                    ? undefined
                    : `${dayFormat.format(date)}: ${state}`
                }
                className={cn("size-3.5 rounded-[3px]", cellClassNames[state])}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        className="flex items-center gap-3 text-[11px] text-muted-foreground"
        aria-hidden="true"
      >
        <LegendItem className={cellClassNames.done} label="Done" />
        <LegendItem className={cellClassNames.missed} label="Missed" />
        <LegendItem className={cellClassNames.rest} label="Rest day" />
      </div>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-[2px]", className)} />
      {label}
    </span>
  );
}
