"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarOff,
  CalendarSearch,
  ChevronLeft,
  ChevronRight,
  GanttChart,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  useProjectCalendarView,
  type ProjectCalendarView,
} from "../hooks/use-project-calendar-view";
import { projectStatusDotClassNames, projectStatusLabels } from "../project-status";
import type { ProjectListCard, ProjectStatus } from "../type";
import { ProjectCalendarMonth } from "./project-calendar-month";
import { ProjectCalendarTimeline } from "./project-calendar-timeline";
import {
  formatMonth,
  initialTimelineMonth,
  isSameMonth,
  nearestScheduledMonth,
  projectSchedules,
  schedulesInMonth,
  shiftMonth,
  startOfDay,
} from "./project-calendar-utils";

const STATUSES: ProjectStatus[] = ["not_started", "in_progress", "completed"];

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
  const [view, setView] = useProjectCalendarView();
  const wasOpen = useRef(open);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setMonth(initialTimelineMonth(schedules));
    }
    wasOpen.current = open;
  }, [open, schedules]);

  const monthSchedules = useMemo(
    () => schedulesInMonth(schedules, month),
    [schedules, month],
  );
  const overdueCount = monthSchedules.filter(
    (schedule) => schedule.project.is_overdue,
  ).length;
  const undatedCount = projects.length - schedules.length;
  const today = startOfDay(new Date());
  const previousScheduled = nearestScheduledMonth(schedules, month, -1);
  const nextScheduled = nearestScheduledMonth(schedules, month, 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,54rem)] max-w-6xl gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-5 py-4 pr-14 sm:px-6 sm:pr-16">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <CalendarDays className="size-4" />
            </div>
            <div className="grid gap-0.5">
              <DialogTitle>Project calendar</DialogTitle>
              <DialogDescription>
                See when projects start, how they&apos;re progressing, and when
                they&apos;re due.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-y bg-muted/20 px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border bg-background shadow-xs">
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-r-none"
                aria-label="Previous month"
                onClick={() => setMonth(shiftMonth(month, -1))}
              >
                <ChevronLeft />
              </Button>
              <p
                className="min-w-36 px-2 text-center text-sm font-semibold tabular-nums"
                aria-live="polite"
              >
                {formatMonth(month)}
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-l-none"
                aria-label="Next month"
                onClick={() => setMonth(shiftMonth(month, 1))}
              >
                <ChevronRight />
              </Button>
            </div>
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
            {schedules.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {monthSchedules.length === 1
                  ? "1 project"
                  : `${monthSchedules.length} projects`}
                {overdueCount > 0 && (
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {" "}
                    · {overdueCount} overdue
                  </span>
                )}
              </p>
            )}
          </div>

          <ToggleGroup
            aria-label="Calendar view"
            variant="outline"
            size="sm"
            spacing={0}
            value={[view]}
            onValueChange={(value) => {
              const next = value[0] as ProjectCalendarView | undefined;
              if (next) setView(next);
            }}
            className="bg-background"
          >
            <ToggleGroupItem
              value="timeline"
              className="px-3 text-muted-foreground aria-pressed:text-foreground"
            >
              <GanttChart />
              Timeline
            </ToggleGroupItem>
            <ToggleGroupItem
              value="month"
              className="px-3 text-muted-foreground aria-pressed:text-foreground"
            >
              <CalendarDays />
              Month
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4 sm:px-6">
          {schedules.length === 0 ? (
            <CalendarEmptyState
              icon={<CalendarOff className="size-5" />}
              title="No project dates yet"
              description="Add a start date or due date to a project to place it on this calendar."
            />
          ) : monthSchedules.length === 0 ? (
            <CalendarEmptyState
              icon={<CalendarSearch className="size-5" />}
              title={`Nothing scheduled in ${month.toLocaleDateString(undefined, { month: "long" })}`}
              description="Jump to the nearest month with projects, or keep browsing."
            >
              {previousScheduled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonth(previousScheduled)}
                >
                  <ArrowLeft data-icon="inline-start" />
                  Previous: {formatMonth(previousScheduled, { short: true })}
                </Button>
              )}
              {nextScheduled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonth(nextScheduled)}
                >
                  Next: {formatMonth(nextScheduled, { short: true })}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              )}
            </CalendarEmptyState>
          ) : view === "timeline" ? (
            <ProjectCalendarTimeline
              month={month}
              schedules={monthSchedules}
              today={today}
            />
          ) : (
            <ProjectCalendarMonth
              month={month}
              schedules={schedules}
              today={today}
            />
          )}
        </div>

        <DialogFooter className="shrink-0 items-start justify-between gap-2 border-t bg-muted/20 px-5 py-3 sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    projectStatusDotClassNames[status],
                  )}
                />
                {projectStatusLabels[status]}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full ring-2 ring-red-400/70" />
              Overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rotate-45 rounded-[2px] border-[1.5px] border-muted-foreground" />
              Start or due date only
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {undatedCount > 0 && (
              <>
                {undatedCount === 1
                  ? "1 project has no dates"
                  : `${undatedCount} projects have no dates`}
                <span className="max-sm:hidden"> · </span>
              </>
            )}
            <span className="max-sm:hidden">Select a project to open it</span>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalendarEmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {children && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>
      )}
    </div>
  );
}
