"use client";

import { LoadingRegion } from "@/components/shared/loading-region";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NotePagesSkeleton } from "@/features/notes/components/note-workspace";
import { cn } from "@/lib/utils";
import type { AreaTab } from "./area-detail-types";

// Loading placeholders shaped like the real Areas components, so content
// swaps in without the layout jumping.

const titleWidths = ["w-2/5", "w-1/3", "w-1/2", "w-1/4"];
const descriptionWidths = ["w-3/4", "w-2/3", "w-1/2", "w-3/5"];

function SectionHeaderSkeleton({ actions = 1 }: { actions?: 1 | 2 }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="flex gap-2">
        {actions === 2 && <Skeleton className="h-9 w-32" />}
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

function RecordRowSkeleton({
  index,
  compact = false,
}: {
  index: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center border bg-card",
        compact ? "gap-3 rounded-xl p-3" : "gap-3.5 rounded-md px-4 py-3.5",
      )}
    >
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="grid min-w-0 flex-1 gap-2">
        <Skeleton className={cn("h-4", titleWidths[index % titleWidths.length])} />
        <Skeleton
          className={cn("h-3.5", descriptionWidths[index % descriptionWidths.length])}
        />
      </div>
      {compact ? (
        <Skeleton className="size-5 shrink-0 rounded-full" />
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
          <Skeleton className="size-8" />
        </div>
      )}
    </div>
  );
}

export function RecordsSkeleton({ label = "Loading records" }: { label?: string }) {
  return (
    <LoadingRegion label={label} className="grid gap-4">
      <SectionHeaderSkeleton />
      <div className="grid gap-2">
        {[0, 1, 2].map((index) => (
          <RecordRowSkeleton key={index} index={index} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function LinkOptionsSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="grid content-start gap-2">
      {[0, 1, 2, 3].map((index) => (
        <RecordRowSkeleton key={index} index={index} compact />
      ))}
    </LoadingRegion>
  );
}

function StatTileSkeleton({ valueWidth = "w-8" }: { valueWidth?: string }) {
  return (
    <div className="grid gap-1.5 rounded-lg bg-muted/50 px-3 py-2">
      <Skeleton className="h-3 w-14 bg-muted-foreground/10" />
      <Skeleton className={cn("h-5 bg-muted-foreground/10", valueWidth)} />
    </div>
  );
}

function GoalRowSkeleton({ index }: { index: number }) {
  return (
    <div className="flex items-start gap-3.5 rounded-md border bg-card px-4 py-3.5 sm:items-center">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="grid min-w-0 flex-1 gap-2">
        <Skeleton className={cn("h-4", titleWidths[index % titleWidths.length])} />
        <div className="grid max-w-md gap-1.5">
          <Skeleton className="h-1.5 w-full rounded-full" />
          <div className="flex justify-between gap-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Skeleton className="hidden h-9 w-24 sm:block" />
        <Skeleton className="size-8" />
      </div>
    </div>
  );
}

export function GoalsSkeleton({
  label = "Loading goals",
  showHeader = true,
}: {
  label?: string;
  showHeader?: boolean;
}) {
  return (
    <LoadingRegion label={label} className="grid gap-5">
      {showHeader && <SectionHeaderSkeleton />}
      <Card className="flex-row items-center gap-5 px-5 py-5 sm:gap-6 sm:px-6">
        <Skeleton className="size-20 shrink-0 rounded-full" />
        <div className="grid min-w-0 flex-1 gap-3">
          <div className="grid gap-1.5">
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:max-w-sm">
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
          </div>
        </div>
      </Card>
      <div className="flex flex-wrap gap-1">
        {["w-16", "w-20", "w-24", "w-24"].map((width, index) => (
          <Skeleton key={index} className={cn("h-8 rounded-full", width)} />
        ))}
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-3.5 w-24" />
        {[0, 1, 2].map((index) => (
          <GoalRowSkeleton key={index} index={index} />
        ))}
      </div>
    </LoadingRegion>
  );
}

function TodaySummaryCardSkeleton() {
  return (
    <Card className="gap-5 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-5">
        <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:w-72">
        <StatTileSkeleton valueWidth="w-24" />
        <StatTileSkeleton />
      </div>
    </Card>
  );
}

export function TodaySummarySkeleton({
  label = "Loading today's habits",
}: {
  label?: string;
}) {
  return (
    <LoadingRegion label={label}>
      <TodaySummaryCardSkeleton />
    </LoadingRegion>
  );
}

export function HabitHistorySkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="grid gap-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-3 w-2" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="grid w-max grid-flow-col grid-cols-[repeat(12,0.875rem)] grid-rows-7 gap-1">
          {Array.from({ length: 84 }, (_, index) => (
            <Skeleton key={index} className="size-3.5 rounded-[3px] bg-muted/70" />
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitCardSkeleton({ index }: { index: number }) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className={cn("h-4", titleWidths[index % titleWidths.length])} />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="size-14 shrink-0 rounded-full" />
        </div>
        <HabitHistorySkeleton />
        <Skeleton className="h-9 w-36" />
      </CardContent>
    </Card>
  );
}

export function HabitsSkeleton({ label = "Loading habits" }: { label?: string }) {
  return (
    <LoadingRegion label={label} className="grid gap-5">
      <SectionHeaderSkeleton actions={2} />
      <TodaySummaryCardSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <HabitCardSkeleton index={0} />
        <HabitCardSkeleton index={1} />
      </div>
    </LoadingRegion>
  );
}

export function ArchivedAreaCardSkeleton() {
  return (
    <Card className="h-full gap-0">
      <CardContent className="grid h-full gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <div className="grid min-h-10 gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
        <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TabContentSkeleton({ tab }: { tab: AreaTab }) {
  if (tab === "goals") return <GoalsSkeleton />;
  if (tab === "habits") return <HabitsSkeleton />;
  if (tab === "notes") return <NotePagesSkeleton />;
  return <RecordsSkeleton label={`Loading ${tab}`} />;
}
