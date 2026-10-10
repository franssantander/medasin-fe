"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  dateKey,
  dayDifference,
  daysInMonth,
  formatFullDate,
  isSameMonth,
  isWeekend,
  monthBounds,
  overdueClassNames,
  scheduleAriaLabel,
  scheduleBarClassNames,
  scheduleFillClassNames,
  scheduleMarkerClassNames,
  scheduleRangeLabel,
  type ProjectSchedule,
} from "./project-calendar-utils";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";

const INLINE_LABEL_MIN_DAYS = 4;

export function ProjectCalendarTimeline({
  month,
  schedules,
  today,
}: {
  month: Date;
  schedules: ProjectSchedule[];
  today: Date;
}) {
  const days = daysInMonth(month);
  const todayIndex = isSameMonth(today, month) ? today.getDate() - 1 : -1;
  const columns: CSSProperties = {
    gridTemplateColumns: `repeat(${days.length}, minmax(2rem, 1fr))`,
    minWidth: `${days.length * 2}rem`,
  };

  return (
    <div
      role="region"
      aria-label="Project timeline"
      tabIndex={0}
      className="workspace-list-scrollbar min-h-0 overflow-auto rounded-xl border outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="sticky top-0 z-20 flex border-b bg-popover">
        <div className="sticky left-0 z-30 flex w-48 shrink-0 items-end border-r bg-popover px-3 pb-2 text-xs font-medium text-muted-foreground sm:w-60">
          {schedules.length === 1 ? "1 project" : `${schedules.length} projects`}
        </div>
        <div className="grid flex-1" style={columns}>
          {days.map((date, index) => (
            <div
              key={dateKey(date)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 text-[11px] text-muted-foreground",
                isWeekend(date) && "bg-muted/40",
              )}
              aria-label={
                index === todayIndex
                  ? `Today, ${formatFullDate(date)}`
                  : formatFullDate(date)
              }
            >
              <span aria-hidden="true">
                {date.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                  index === todayIndex
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {date.getDate()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ul aria-label="Scheduled projects">
        {schedules.map((schedule) => (
          <TimelineRow
            key={`${schedule.project.uuid}-${schedule.kind}`}
            schedule={schedule}
            month={month}
            days={days}
            todayIndex={todayIndex}
            columns={columns}
          />
        ))}
      </ul>
    </div>
  );
}

function TimelineRow({
  schedule,
  month,
  days,
  todayIndex,
  columns,
}: {
  schedule: ProjectSchedule;
  month: Date;
  days: Date[];
  todayIndex: number;
  columns: CSSProperties;
}) {
  const { project } = schedule;
  const { start: monthStart, end: monthEnd } = monthBounds(month);
  const clippedStart = schedule.start < monthStart ? monthStart : schedule.start;
  const clippedEnd = schedule.end > monthEnd ? monthEnd : schedule.end;
  const startColumn = dayDifference(clippedStart, monthStart) + 1;
  const span = dayDifference(clippedEnd, clippedStart) + 1;
  const endColumn = startColumn + span - 1;
  const continuesBefore = schedule.start < monthStart;
  const continuesAfter = schedule.end > monthEnd;
  const isMilestone = schedule.kind !== "range";
  const label = scheduleAriaLabel(schedule);
  const href = `/projects/${project.uuid}`;
  const inlineLabel = !isMilestone && span >= INLINE_LABEL_MIN_DAYS;
  const labelAfter = endColumn + 3 <= days.length;

  return (
    <li className="group/row flex h-12 border-b last:border-b-0">
      <Link
        href={href}
        aria-label={label}
        className="sticky left-0 z-10 flex w-48 shrink-0 items-center gap-2.5 border-r bg-popover px-3 outline-none transition-colors group-hover/row:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none sm:w-60"
      >
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md"
          style={projectBadgeStyle(project.background)}
        >
          <ProjectIcon name={project.icon} className="size-3.5" />
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate text-sm font-medium">{project.name}</span>
          <span
            className={cn(
              "truncate text-xs",
              project.is_overdue
                ? "font-medium text-red-600 dark:text-red-400"
                : "text-muted-foreground",
            )}
          >
            {project.is_overdue ? "Overdue · " : ""}
            {scheduleRangeLabel(schedule)}
          </span>
        </span>
      </Link>

      <div className="relative grid flex-1 items-center" style={columns}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid"
          style={columns}
        >
          {days.map((date, index) => (
            <div
              key={dateKey(date)}
              className={cn(
                "flex justify-center transition-colors group-hover/row:bg-muted/40 motion-reduce:transition-none",
                isWeekend(date) && "bg-muted/40",
              )}
            >
              {index === todayIndex && (
                <span className="h-full w-0.5 bg-primary/40" />
              )}
            </div>
          ))}
        </div>

        {isMilestone ? (
          <Link
            href={href}
            tabIndex={-1}
            aria-hidden="true"
            title={label}
            className="relative z-[1] flex h-full items-center justify-center"
            style={{ gridColumn: `${startColumn} / span 1`, gridRow: 1 }}
          >
            <span
              className={cn(
                "size-3.5 rotate-45 rounded-[3px] border-2 transition-transform hover:scale-125 motion-reduce:transition-none",
                scheduleMarkerClassNames[project.status],
                project.is_overdue && "border-red-500 bg-red-100 dark:bg-red-950",
              )}
            />
          </Link>
        ) : (
          <Link
            href={href}
            tabIndex={-1}
            aria-hidden="true"
            title={label}
            className={cn(
              "relative z-[1] mx-0.5 flex h-7 min-w-0 items-center overflow-hidden rounded-md border text-xs font-medium shadow-xs transition-colors motion-reduce:transition-none",
              scheduleBarClassNames[project.status],
              project.is_overdue && overdueClassNames,
              continuesBefore && "ml-0 rounded-l-none border-l-0",
              continuesAfter && "mr-0 rounded-r-none border-r-0",
            )}
            style={{ gridColumn: `${startColumn} / span ${span}`, gridRow: 1 }}
          >
            {project.status === "in_progress" && (
              <span
                className={cn(
                  "absolute inset-y-0 left-0",
                  scheduleFillClassNames[project.status],
                )}
                style={{ width: `${visibleProgress(schedule, clippedStart, span) * 100}%` }}
              />
            )}
            <span className="relative flex min-w-0 flex-1 items-center gap-1 px-1.5">
              {continuesBefore && <ChevronLeft className="size-3 shrink-0 opacity-60" />}
              {inlineLabel && <span className="truncate">{project.name}</span>}
              {inlineLabel && project.status === "in_progress" && span >= 7 && (
                <span className="ml-auto shrink-0 tabular-nums opacity-70">
                  {project.progress_percentage}%
                </span>
              )}
              {continuesAfter && (
                <ChevronRight className="ml-auto size-3 shrink-0 opacity-60" />
              )}
            </span>
          </Link>
        )}

        {!inlineLabel && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none relative z-[1] truncate px-1.5 text-xs font-medium text-muted-foreground",
              !labelAfter && "text-right",
            )}
            style={{
              gridColumn: labelAfter
                ? `${endColumn + 1} / -1`
                : `1 / ${startColumn}`,
              gridRow: 1,
            }}
          >
            {isMilestone && (
              <span className="font-normal">
                {schedule.kind === "start" ? "Start · " : "Due · "}
              </span>
            )}
            {project.name}
          </span>
        )}
      </div>
    </li>
  );
}

/** Share of the visible bar that the project's progress covers, measured across its full range. */
function visibleProgress(
  schedule: ProjectSchedule,
  clippedStart: Date,
  span: number,
) {
  const totalDays = dayDifference(schedule.end, schedule.start) + 1;
  const doneDays = (totalDays * schedule.project.progress_percentage) / 100;
  const offset = dayDifference(clippedStart, schedule.start);
  return Math.min(1, Math.max(0, (doneDays - offset) / span));
}
