"use client";

import { CalendarDays, Plus, RefreshCw, Search } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaIcon } from "@/features/areas/components/area-icons";
import { cn } from "@/lib/utils";
import type { HabitCalendarColumn, HabitCalendarView } from "../type";
import { HabitCalendarHeader } from "./habit-calendar-header";
import { isCurrentColumn, startOfDay } from "./habit-calendar-utils";

export const habitSuggestions = [
  { name: "Drink water", icon: "GlassWater" },
  { name: "Read 10 pages", icon: "BookOpen" },
  { name: "Morning walk", icon: "Footprints" },
  { name: "Meditate", icon: "Flower2" },
  { name: "Stretch", icon: "PersonStanding" },
];

export function HabitFirstRun({
  onAdd,
}: {
  onAdd: (defaults?: { name: string; icon: string }) => void;
}) {
  return (
    <Empty className="min-h-64 p-6">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          <CalendarDays />
        </EmptyMedia>
        <EmptyTitle>A small habit is a good start</EmptyTitle>
        <EmptyDescription>
          Add your first habit and choose when you want to practice it.
          Habits created in Areas appear here too.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="max-w-md gap-4">
        <Button onClick={() => onAdd()}>
          <Plus data-icon="inline-start" />
          Add your first habit
        </Button>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">Or start with an idea</p>
          <div className="flex flex-wrap justify-center gap-2">
            {habitSuggestions.map((item) => (
              <Button
                key={item.name}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => onAdd(item)}
              >
                <AreaIcon name={item.icon} className="size-3.5" />
                {item.name}
              </Button>
            ))}
          </div>
        </div>
      </EmptyContent>
    </Empty>
  );
}

export function HabitNoMatches({ onClear }: { onClear: () => void }) {
  return (
    <Empty className="min-h-64 p-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search />
        </EmptyMedia>
        <EmptyTitle>No matching habits</EmptyTitle>
        <EmptyDescription>
          Try another search or clear your filters to see all habits.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function HabitLoadError({
  kind,
  onRetry,
}: {
  kind: "list" | "calendar";
  onRetry: () => void;
}) {
  return (
    <Empty className="min-h-64 p-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RefreshCw />
        </EmptyMedia>
        <EmptyTitle>
          {kind === "list"
            ? "Habits could not be loaded"
            : "Habit history could not be loaded"}
        </EmptyTitle>
        <EmptyDescription>Check your connection and try again.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" />
          {kind === "list" ? "Try again" : "Refresh range"}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

const nameWidths = ["w-36", "w-44", "w-28", "w-40", "w-32", "w-24"];
const metaWidths = ["w-16", "w-20", "w-14", "w-24", "w-16", "w-12"];

// Pulses a little later on each row so the list loads like a gentle wave.
function Bone({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <Skeleton
      className={cn("motion-reduce:animate-none", className)}
      style={delay ? { animationDelay: delay + "ms" } : undefined}
    />
  );
}

// Built on the real calendar grid, so the columns, today band and phone
// Week strips match the loaded calendar exactly.
export function HabitCalendarSkeleton({
  columns,
  view,
}: {
  columns: HabitCalendarColumn[];
  view: HabitCalendarView;
}) {
  const [today] = useState(() => startOfDay(new Date()));
  const compact = columns.length > 7;
  return (
    <div
      role="status"
      aria-label="Loading habit calendar"
      className="flex min-h-64 flex-1 flex-col overflow-hidden"
    >
      <span className="sr-only">Loading habit calendar…</span>
      <div
        aria-hidden="true"
        className="habit-calendar-scroll min-h-0 flex-1 overflow-hidden!"
      >
        <div
          className="habit-calendar-table w-full"
          data-view={view}
          style={{ "--habit-columns": columns.length } as CSSProperties}
        >
          <HabitCalendarHeader columns={columns} today={today} />
          {nameWidths.map((width, row) => {
            const delay = row * 120;
            return (
              <div
                key={row}
                className="habit-calendar-grid habit-calendar-row border-b last:border-b-0"
              >
                <div className="habit-identity sticky left-0 z-10 flex min-w-0 items-center gap-3 border-r bg-card px-3 py-3 md:px-4">
                  <Bone
                    delay={delay}
                    className="habit-identity-icon hidden size-9 shrink-0 rounded-lg md:flex"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Bone delay={delay} className={cn("h-4 max-w-full", width)} />
                    <div className="flex items-center gap-1.5">
                      <Bone delay={delay} className={cn("h-3", metaWidths[row])} />
                      {row % 2 === 0 && (
                        <Bone delay={delay} className="h-4 w-14 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="habit-date-cells">
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className={cn(
                        "habit-column habit-day-cell flex min-h-16 min-w-0 flex-col items-center justify-center gap-2 py-1",
                        isCurrentColumn(column, today) && "habit-column-current",
                      )}
                    >
                      <span className="habit-mobile-date hidden flex-col items-center gap-1">
                        <Bone delay={delay} className="h-2.5 w-6" />
                        <Bone delay={delay} className="h-2.5 w-3" />
                      </span>
                      {column.aggregate ? (
                        <Bone
                          delay={delay}
                          className="mx-1.5 h-11 w-[calc(100%-0.75rem)] max-w-16 rounded-lg"
                        />
                      ) : (
                        <Bone
                          delay={delay}
                          className={cn(
                            "rounded-full",
                            compact ? "size-7" : "size-9",
                            isCurrentColumn(column, today) &&
                              "border-2 border-emerald-500/35 bg-transparent",
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
