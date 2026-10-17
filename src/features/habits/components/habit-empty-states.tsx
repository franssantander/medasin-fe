"use client";

import { CalendarDays, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { AreaIcon } from "@/features/areas/components/area-icons";

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
