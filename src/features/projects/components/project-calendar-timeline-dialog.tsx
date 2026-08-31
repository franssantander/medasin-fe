"use client";

import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { projectStatusLabels } from "../project-status";
import type { ProjectListCard, ProjectStatus } from "../type";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fullWeekdayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const timelineClassNames: Record<ProjectStatus, string> = {
  not_started:
    "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
  in_progress:
    "border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900",
  completed:
    "border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900",
};

const legendClassNames: Record<ProjectStatus, string> = {
  not_started: "bg-slate-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
};

type ProjectSchedule = {
  project: ProjectListCard;
  start: Date;
  end: Date;
  kind: "range" | "start" | "due";
};

type PositionedSchedule = ProjectSchedule & {
  clippedStart: Date;
  clippedEnd: Date;
  startColumn: number;
  span: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

type ProjectCalendarTimelineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectListCard[];
};

export function ProjectCalendarTimelineDialog({
  open,
  onOpenChange,
  projects,
}: ProjectCalendarTimelineDialogProps) {
  const schedules = useMemo(() => projectSchedules(projects), [projects]);
  const [month, setMonth] = useState(() => initialTimelineMonth(schedules));
  const wasOpen = useRef(open);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setMonth(initialTimelineMonth(schedules));
    }
    wasOpen.current = open;
  }, [open, schedules]);

  const calendarStart = useMemo(() => startOfCalendar(month), [month]);
  const weeks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, weekIndex) => {
        const start = addDays(calendarStart, weekIndex * 7);
        return {
          start,
          days: Array.from({ length: 7 }, (_, dayIndex) =>
            addDays(start, dayIndex),
          ),
          layout: layoutWeek(schedules, start),
        };
      }),
    [calendarStart, schedules],
  );
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const projectsInMonth = schedules.filter(
    (schedule) => schedule.start <= monthEnd && schedule.end >= monthStart,
  ).length;
  const today = startOfDay(new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,54rem)] max-w-6xl gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b p-5 pr-14 sm:p-6 sm:pr-16">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-xl">Project calendar</DialogTitle>
              <DialogDescription>
                See when active projects start, run, and reach their due date.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
          <p className="text-lg font-semibold tracking-tight" aria-live="polite">
            {month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={isSameMonth(month, today)}
            onClick={() =>
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
            }
          >
            Today
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:px-6">
          {schedules.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
              <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
                <CalendarOff className="size-5" />
              </div>
              <p className="font-medium">No project dates yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add a start date or due date to a project to place it on this
                calendar.
              </p>
            </div>
          ) : (
            <div
              className="min-w-[56rem] overflow-hidden rounded-xl border"
              role="region"
              aria-label="Project calendar timeline"
              tabIndex={0}
            >
              {projectsInMonth === 0 && (
                <div className="border-b bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
                  No projects are scheduled in this month. Use the arrows to
                  browse the timeline.
                </div>
              )}
              <div className="grid grid-cols-7 border-b bg-muted/40">
                {weekdayLabels.map((label, index) => (
                  <div
                    key={label}
                    className="px-3 py-2 text-xs font-semibold text-muted-foreground"
                    title={fullWeekdayLabels[index]}
                  >
                    {label}
                  </div>
                ))}
              </div>
              {weeks.map((week) => (
                <CalendarWeek
                  key={dateKey(week.start)}
                  days={week.days}
                  layout={week.layout}
                  displayedMonth={month}
                  today={today}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 items-start justify-between border-t px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Status</span>
            {(
              ["not_started", "in_progress", "completed"] as ProjectStatus[]
            ).map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span
                  className={cn("size-2 rounded-full", legendClassNames[status])}
                />
                {projectStatusLabels[status]}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Click a project to open its details
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalendarWeek({
  days,
  layout,
  displayedMonth,
  today,
}: {
  days: Date[];
  layout: { items: PositionedSchedule[]; laneCount: number };
  displayedMonth: Date;
  today: Date;
}) {
  const height = Math.max(96, 42 + layout.laneCount * 28);

  return (
    <div
      className="relative grid grid-cols-7 border-b last:border-b-0"
      style={{ minHeight: `${height}px` }}
    >
      {days.map((date) => {
        const outside = date.getMonth() !== displayedMonth.getMonth();
        const currentDay = dateKey(date) === dateKey(today);

        return (
          <div
            key={dateKey(date)}
            className={cn(
              "border-r p-2 last:border-r-0",
              outside && "bg-muted/25 text-muted-foreground/60",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs",
                currentDay && "bg-primary font-semibold text-primary-foreground",
              )}
              aria-label={
                currentDay
                  ? `Today, ${formatFullDate(date)}`
                  : formatFullDate(date)
              }
            >
              {date.getDate()}
            </span>
          </div>
        );
      })}

      <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
        {layout.items.map((item) => {
          const isMilestone = item.kind !== "range";
          const prefix = item.kind === "start" ? "Start · " : "Due · ";

          return (
            <Link
              key={`${item.project.uuid}-${item.kind}`}
              href={`/projects/${item.project.uuid}`}
              className={cn(
                "pointer-events-auto z-10 mx-1 flex h-6 min-w-0 items-center truncate border px-2 text-[11px] font-semibold shadow-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                timelineClassNames[item.project.status],
                "rounded-md",
                item.continuesBefore && "ml-0 rounded-l-none border-l-0",
                item.continuesAfter && "mr-0 rounded-r-none border-r-0",
              )}
              style={{
                gridColumn: `${item.startColumn + 1} / span ${item.span}`,
                gridRow: "1",
                marginTop: `${34 + item.lane * 28}px`,
              }}
              title={scheduleAriaLabel(item)}
              aria-label={scheduleAriaLabel(item)}
            >
              <span className="truncate">
                {isMilestone && prefix}
                {item.project.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function projectSchedules(projects: ProjectListCard[]) {
  return projects.flatMap<ProjectSchedule>((project) => {
    const start = parseProjectDate(project.start_date);
    const due = parseProjectDate(project.due_date);

    if (start && due) {
      return [
        {
          project,
          start: start <= due ? start : due,
          end: start <= due ? due : start,
          kind: "range",
        },
      ];
    }
    if (start) return [{ project, start, end: start, kind: "start" }];
    if (due) return [{ project, start: due, end: due, kind: "due" }];
    return [];
  });
}

function layoutWeek(schedules: ProjectSchedule[], weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const items = schedules
    .filter(
      (schedule) => schedule.start <= weekEnd && schedule.end >= weekStart,
    )
    .map<Omit<PositionedSchedule, "lane">>((schedule) => {
      const clippedStart = schedule.start < weekStart ? weekStart : schedule.start;
      const clippedEnd = schedule.end > weekEnd ? weekEnd : schedule.end;
      const startColumn = dayDifference(clippedStart, weekStart);

      return {
        ...schedule,
        clippedStart,
        clippedEnd,
        startColumn,
        span: dayDifference(clippedEnd, clippedStart) + 1,
        continuesBefore: schedule.start < weekStart,
        continuesAfter: schedule.end > weekEnd,
      };
    })
    .sort(
      (first, second) =>
        first.startColumn - second.startColumn ||
        second.span - first.span ||
        first.project.name.localeCompare(second.project.name),
    );
  const laneEnds: number[] = [];
  const positioned = items.map<PositionedSchedule>((item) => {
    const itemEnd = item.startColumn + item.span - 1;
    let lane = laneEnds.findIndex((laneEnd) => laneEnd < item.startColumn);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = itemEnd;
    return { ...item, lane };
  });

  return { items: positioned, laneCount: laneEnds.length };
}

function initialTimelineMonth(schedules: ProjectSchedule[]) {
  const today = startOfDay(new Date());
  const currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (
    schedules.some(
      (schedule) =>
        schedule.start <= currentEnd && schedule.end >= currentStart,
    )
  ) {
    return currentStart;
  }

  const dates = schedules
    .flatMap((schedule) => [schedule.start, schedule.end])
    .sort((first, second) => first.getTime() - second.getTime());
  const nearestUpcoming = dates.find((date) => date >= today);
  const nearestPast = [...dates].reverse().find((date) => date < today);
  const nearest = nearestUpcoming ?? nearestPast ?? today;

  return new Date(nearest.getFullYear(), nearest.getMonth(), 1);
}

function parseProjectDate(value: string | null) {
  if (!value) return undefined;
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return undefined;
  }
  return startOfDay(date);
}

function startOfCalendar(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  return addDays(first, -first.getDay());
}

function shiftMonth(month: Date, amount: number) {
  return new Date(month.getFullYear(), month.getMonth() + amount, 1);
}

function isSameMonth(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth()
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

function dayDifference(later: Date, earlier: Date) {
  return Math.round(
    (Date.UTC(later.getFullYear(), later.getMonth(), later.getDate()) -
      Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate())) /
      86_400_000,
  );
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scheduleAriaLabel(schedule: ProjectSchedule) {
  if (schedule.kind === "start") {
    return `${schedule.project.name} starts ${formatShortDate(schedule.start)}`;
  }
  if (schedule.kind === "due") {
    return `${schedule.project.name} is due ${formatShortDate(schedule.end)}`;
  }
  return `${schedule.project.name}, ${formatShortDate(schedule.start)} through ${formatShortDate(schedule.end)}`;
}
