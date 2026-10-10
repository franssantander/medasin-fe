"use client";

import { LoadingRegion } from "@/components/shared/loading-region";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ProjectView } from "../project-list-utils";
import type { BoardStageKey } from "../type";
import {
  kanbanGridStyles,
  stageColumnStyles,
  stageDotColors,
} from "./project-kanban-utils";

// Loading placeholders shaped like the real Projects components, so content
// swaps in without the layout jumping.

const titleWidths = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/4"];
const subtitleWidths = ["w-1/3", "w-1/4", "w-2/5", "w-1/5"];
const stages: { key: BoardStageKey; cards: number; nameWidth: string }[] = [
  { key: "backlog", cards: 3, nameWidth: "w-16" },
  { key: "todos", cards: 2, nameWidth: "w-12" },
  { key: "in_progress", cards: 2, nameWidth: "w-20" },
  { key: "done", cards: 1, nameWidth: "w-10" },
];

const pick = (widths: string[], index: number) => widths[index % widths.length];

function ProjectCardSkeleton({ index }: { index: number }) {
  return (
    <Card size="sm" className="h-full gap-0 p-0 shadow-none">
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="grid min-w-0 flex-1 gap-1.5 pt-0.5">
            <Skeleton className={cn("h-4", pick(titleWidths, index))} />
            <Skeleton className={cn("h-3", pick(subtitleWidths, index))} />
          </div>
          <Skeleton className="-mt-1 -mr-2 size-8 shrink-0" />
        </div>
        <div className="grid gap-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className={cn("h-3.5", index % 2 ? "w-1/2" : "w-4/5")} />
        </div>
        <div className="mt-auto grid gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
        <div className="-mb-1.5 flex min-h-7 items-center justify-between gap-3 border-t pt-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </Card>
  );
}

function ProjectListRowSkeleton({ index }: { index: number }) {
  return (
    <div className="flex min-h-16 items-center gap-3 px-4 py-3 sm:gap-4">
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <Skeleton className={cn("h-3.5", pick(titleWidths, index))} />
        <Skeleton className={cn("h-3", pick(subtitleWidths, index))} />
      </div>
      <div className="hidden w-28 shrink-0 sm:block">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="hidden w-36 shrink-0 items-center gap-2.5 md:flex">
        <Skeleton className="h-1 flex-1 rounded-full" />
        <Skeleton className="h-3 w-7" />
      </div>
      <div className="hidden w-32 shrink-0 justify-end sm:flex">
        <Skeleton className="h-3.5 w-20" />
      </div>
      <Skeleton className="-mr-1.5 size-8 shrink-0" />
    </div>
  );
}

export function ProjectListSkeleton({ view }: { view: ProjectView }) {
  return (
    <LoadingRegion label="Loading projects" className="grid gap-6">
      <div className="flex gap-4 border-b pb-2.5">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="grid gap-5">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 min-w-0 flex-1 basis-56 sm:max-w-sm" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-[4.5rem]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {["w-14", "w-20", "w-24", "w-20", "w-24"].map((width, index) => (
              <Skeleton key={index} className={cn("h-8 rounded-full", width)} />
            ))}
          </div>
        </div>
        {view === "list" ? (
          <div className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {[0, 1, 2, 3, 4].map((index) => (
              <ProjectListRowSkeleton key={index} index={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <ProjectCardSkeleton key={index} index={index} />
            ))}
          </div>
        )}
      </div>
    </LoadingRegion>
  );
}

function TaskCardSkeleton({ index }: { index: number }) {
  return (
    <div className="grid gap-2.5 rounded-lg border bg-card p-3 shadow-xs">
      <div className="grid gap-1.5">
        <Skeleton className={cn("h-3.5", index % 2 ? "w-3/5" : "w-4/5")} />
        {index % 3 === 0 && <Skeleton className="h-3 w-full" />}
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-10" />
        {index % 2 === 0 && <Skeleton className="h-3 w-14" />}
        <Skeleton className="ml-auto h-3 w-6" />
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton({
  label = "Loading board",
}: {
  label?: string;
}) {
  return (
    <LoadingRegion label={label} className={kanbanGridStyles}>
      {stages.map((stage, stageIndex) => (
        <div
          key={stage.key}
          className={cn(
            "flex min-h-64 min-w-0 flex-col overflow-hidden rounded-xl border",
            stageColumnStyles[stage.key].column,
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-2 border-b border-t-2 px-3 py-2",
              stageColumnStyles[stage.key].header,
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full opacity-60"
                style={{ backgroundColor: stageDotColors[stage.key] }}
              />
              <Skeleton className={cn("h-3.5", stage.nameWidth)} />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <span className="size-8" />
          </div>
          <div className="grid flex-1 content-start gap-2 p-2">
            {Array.from({ length: stage.cards }, (_, index) => (
              <TaskCardSkeleton key={index} index={stageIndex + index} />
            ))}
          </div>
          <div
            className={cn("shrink-0 border-t p-1.5", stageColumnStyles[stage.key].footer)}
          >
            <Skeleton className="h-8 w-full bg-muted/60" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

function KanbanToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-6 w-40" />
      <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
        <Skeleton className="h-8 flex-1 sm:w-56 sm:flex-none" />
        <Skeleton className="size-8" />
      </div>
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <LoadingRegion label="Loading project" className="grid min-w-0 gap-6">
      <div className="grid gap-3">
        <div className="flex items-center gap-2 py-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Card className="gap-0 py-0">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <Skeleton className="size-12 shrink-0 rounded-xl" />
                <div className="grid min-w-0 flex-1 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-7 w-56 max-w-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-xl" />
                  <Skeleton className="h-4 w-2/3 max-w-md" />
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="size-8" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-36" />
            </div>
            <div className="grid gap-2.5 border-t pt-4">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex flex-wrap justify-between gap-3">
                <div className="flex gap-3">
                  {stages.map((stage) => (
                    <span key={stage.key} className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full opacity-60"
                        style={{ backgroundColor: stageDotColors[stage.key] }}
                      />
                      <Skeleton className="h-3 w-12" />
                    </span>
                  ))}
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="grid gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-card p-3",
                  index === 2 && "hidden lg:flex",
                  index === 3 && "hidden xl:flex",
                )}
              >
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <Skeleton className={cn("h-3.5", pick(titleWidths, index))} />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="@container grid min-w-0 gap-4">
        <KanbanToolbarSkeleton />
        <KanbanBoardSkeleton />
      </div>
    </LoadingRegion>
  );
}

export function GoalsMenuSkeleton() {
  return (
    <LoadingRegion label="Loading goals" className="grid gap-1 p-1">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex min-h-9 items-center justify-between gap-3 px-2.5">
          <Skeleton className={cn("h-3.5", pick(titleWidths, index + 1))} />
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function ResourceOptionsSkeleton({
  label = "Loading resources",
}: {
  label?: string;
}) {
  return (
    <LoadingRegion label={label} className="grid gap-1">
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-4 shrink-0 rounded-[4px]" />
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Skeleton className={cn("h-3.5", pick(titleWidths, index))} />
            <Skeleton className={cn("h-3", index % 2 ? "w-1/2" : "w-3/4")} />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function LinkPickerSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="grid gap-3">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-2"
        >
          <Skeleton className="size-4 shrink-0" />
          <Skeleton className={cn("h-3.5", pick(titleWidths, index))} />
        </div>
      ))}
    </LoadingRegion>
  );
}
