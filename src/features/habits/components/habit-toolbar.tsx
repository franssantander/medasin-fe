"use client";

import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { useHabitWorkspace } from "../hooks/use-habit-workspace";
import type {
  HabitCalendarRange,
  HabitCalendarView,
  HabitStatusFilter,
} from "../type";
import { rangeLabel } from "./habit-calendar-utils";

const views: { value: HabitCalendarView; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];
const statuses: { value: HabitStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];
const segmented = "rounded-lg bg-muted p-[3px]";
const segment =
  "h-7 px-3 text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm dark:aria-pressed:bg-input/30";

export function HabitToolbar({
  view,
  range,
  workspace,
  loading,
  refreshing,
  onViewChange,
  onShift,
  onToday,
}: {
  view: HabitCalendarView;
  range: HabitCalendarRange;
  workspace: ReturnType<typeof useHabitWorkspace>;
  loading: boolean;
  refreshing: boolean;
  onViewChange: (view: HabitCalendarView) => void;
  onShift: (amount: number) => void;
  onToday: () => void;
}) {
  const label = rangeLabel(range);
  const count = workspace.filteredHabits.length;
  return (
    <div className="@container/toolbar flex shrink-0 flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-72 items-center gap-1">
          {view !== "all" && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Previous range"
              onClick={() => onShift(-1)}
            >
              <ChevronLeft />
            </Button>
          )}
          <div className="min-w-0 px-1">
            <h2
              id="habit-range-title"
              className="truncate text-base font-semibold"
              title={label}
            >
              {label}
            </h2>
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">
                {view === "week"
                  ? "Your weekly rhythm"
                  : view === "month"
                    ? "One check-in at a time"
                    : "Your consistency over time"}
              </span>
              {loading ? (
                <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  {count} {count === 1 ? "habit" : "habits"}
                </Badge>
              )}
            </div>
          </div>
          {view !== "all" && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Next range"
              onClick={() => onShift(1)}
            >
              <ChevronRight />
            </Button>
          )}
          <Button variant="outline" size="sm" className="ml-1" onClick={onToday}>
            Today
          </Button>
        </div>
        <ToggleGroup
          aria-label="Calendar view"
          value={[view]}
          onValueChange={(values) =>
            values[0] && onViewChange(values[0] as HabitCalendarView)
          }
          spacing={1}
          className={segmented + " w-full @2xl/toolbar:w-fit"}
        >
          {views.map((item) => (
            <ToggleGroupItem
              key={item.value}
              value={item.value}
              className={segment + " flex-1 @2xl/toolbar:flex-none"}
            >
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <InputGroup className="h-8 w-full sm:w-60 xl:max-w-80 xl:flex-1">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search habits"
            placeholder="Search habits or Areas…"
            value={workspace.search}
            onChange={(event) => workspace.setSearch(event.target.value)}
          />
          {workspace.search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => workspace.setSearch("")}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <ToggleGroup
          aria-label="Habit status"
          value={[workspace.status]}
          onValueChange={(values) =>
            values[0] && workspace.setStatus(values[0] as HabitStatusFilter)
          }
          spacing={1}
          className={segmented}
        >
          {statuses.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value} className={segment}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select
          items={workspace.areaOptions}
          value={workspace.area}
          onValueChange={(value) => value && workspace.setArea(value)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter by Area"
            className="min-w-36 flex-1 sm:w-40 sm:flex-none"
          >
            <SelectValue>
              {workspace.areaOptions.find((item) => item.value === workspace.area)
                ?.label ?? "Selected Area"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {workspace.areaOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {workspace.hasFilters && (
          <Button variant="ghost" size="sm" onClick={workspace.clearFilters}>
            <X data-icon="inline-start" />
            Clear filters
          </Button>
        )}
        {(refreshing || loading) && (
          <span
            className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {refreshing ? (
              <>
                <Loader2
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Updating…
              </>
            ) : (
              "Loading habits…"
            )}
          </span>
        )}
      </div>
    </div>
  );
}
