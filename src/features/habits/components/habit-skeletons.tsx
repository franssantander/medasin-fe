"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { PageHeaderSkeleton } from "@/components/shared/page-header-skeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { HabitCalendarColumn, HabitCalendarView } from "../type";
import { HabitCalendarHeader } from "./habit-calendar-header";
import {
  getCalendarColumns,
  getCalendarRange,
  isCurrentColumn,
  startOfDay,
} from "./habit-calendar-utils";

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

const segmented = "flex gap-1 rounded-lg bg-muted p-[3px]";

function HabitToolbarSkeleton() {
  return (
    <div className="@container/toolbar flex shrink-0 flex-col gap-3 px-4 py-4 sm:px-5" aria-hidden="true">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-72 items-center gap-1">
          <Skeleton className="size-8 shrink-0" />
          <div className="grid min-w-0 gap-1 px-1">
            <div className="flex h-6 items-center">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex h-5 items-center gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
          <Skeleton className="size-8 shrink-0" />
          <Skeleton className="ml-1 h-8 w-16 shrink-0" />
        </div>
        <div className={cn(segmented, "w-full @2xl/toolbar:w-fit")}>
          {["w-14", "w-16", "w-12", "w-20"].map((width, index) => (
            <Skeleton key={index} className={cn("h-7 flex-1 bg-background/70 @2xl/toolbar:flex-none", width)} />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full sm:w-60" />
        <div className={segmented}>
          {["w-9", "w-14", "w-14"].map((width, index) => (
            <Skeleton key={index} className={cn("h-6 bg-background/70", width)} />
          ))}
        </div>
        <Skeleton className="h-8 min-w-36 flex-1 sm:w-40 sm:flex-none" />
      </div>
    </div>
  );
}

function HabitFooterSkeleton() {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t px-4 py-3 sm:px-5" aria-hidden="true">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {["w-16", "w-12", "w-14", "w-14", "w-14"].map((width, index) => (
          <span key={index} className="flex items-center gap-1.5">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className={cn("h-3", width)} />
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-1.5 w-24 rounded-full" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}

function HabitTodaySkeleton() {
  return (
    <Card
      aria-hidden="true"
      className="habit-today-panel order-first min-w-0 shrink-0 gap-0 py-0 @4xl:order-none @4xl:min-h-0"
    >
      <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 @4xl:flex-col @4xl:gap-3 @4xl:px-5 @4xl:pt-5 @4xl:pb-4">
        <div className="grid size-12 shrink-0 animate-pulse place-items-center rounded-full border-[5px] border-foreground/[0.07] motion-reduce:animate-none @4xl:size-28 @4xl:border-[11px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 @4xl:flex-none @4xl:items-center">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>
      </div>
      <div className="hidden min-h-0 flex-1 flex-col border-t @4xl:flex">
        <Skeleton className="mx-5 mt-4 mb-2 h-3 w-16" />
        <div className="flex flex-col gap-0.5 px-3 pb-3">
          {["w-32", "w-40", "w-28"].map((width) => (
            <div key={width} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className={cn("h-3.5 max-w-full", width)} />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="size-6 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden grid-cols-3 border-t @4xl:grid">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex min-w-0 flex-col gap-1.5 border-r px-3 py-3 last:border-r-0">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        ))}
      </div>
    </Card>
  );
}

const subscribeNever = () => () => {};

// The calendar header prints local dates, so it waits for the browser to
// avoid a server/client mismatch; until then the body keeps its height.
function WeekCalendarSkeleton() {
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [columns] = useState(() => getCalendarColumns(getCalendarRange("week", new Date(), [])));
  if (!mounted) return <div className="flex min-h-64 flex-1" aria-hidden="true" />;
  return <HabitCalendarSkeleton columns={columns} view="week" />;
}

export function HabitsPageSkeleton() {
  return (
    <div
      data-page-skeleton="habits"
      className="habits-workspace @container mx-auto flex w-full max-w-[110rem] min-w-0 flex-col gap-4"
    >
      <div className="shrink-0">
        <PageHeaderSkeleton titleWidth="w-16" descriptionWidth="w-80" actions={["w-28"]} />
      </div>
      <div className="habits-layout flex min-h-0 min-w-0 flex-1 flex-col gap-4 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:grid-rows-[minmax(0,1fr)]">
        <Card className="habits-workspace-card min-w-0 gap-0 py-0">
          <HabitToolbarSkeleton />
          <div className="flex min-h-0 flex-1 flex-col border-t">
            <WeekCalendarSkeleton />
          </div>
          <HabitFooterSkeleton />
        </Card>
        <HabitTodaySkeleton />
      </div>
    </div>
  );
}
