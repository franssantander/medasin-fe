"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { projectStatusDotClassNames, projectStatusLabels } from "../project-status";
import {
  addDays,
  dateKey,
  formatFullDate,
  isWeekend,
  layoutWeek,
  overdueClassNames,
  scheduleAriaLabel,
  scheduleBarClassNames,
  scheduleMarkerClassNames,
  scheduleRangeLabel,
  startOfCalendar,
  type PositionedSchedule,
  type ProjectSchedule,
} from "./project-calendar-utils";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";

const MAX_LANES = 3;
const DAY_HEADER = 32;
const LANE_HEIGHT = 24;
const MORE_HEIGHT = 22;

export function ProjectCalendarMonth({
  month,
  schedules,
  today,
}: {
  month: Date;
  schedules: ProjectSchedule[];
  today: Date;
}) {
  const weeks = useMemo(() => {
    const calendarStart = startOfCalendar(month);
    return Array.from({ length: 6 }, (_, weekIndex) => {
      const start = addDays(calendarStart, weekIndex * 7);
      return {
        start,
        days: Array.from({ length: 7 }, (_, dayIndex) => addDays(start, dayIndex)),
        layout: layoutWeek(schedules, start),
      };
    }).filter((week) =>
      // Drop trailing weeks that sit entirely in the next month.
      week.days.some((date) => date.getMonth() === month.getMonth()),
    );
  }, [month, schedules]);

  return (
    <div
      role="region"
      aria-label="Project month calendar"
      tabIndex={0}
      className="workspace-list-scrollbar min-h-0 overflow-auto rounded-xl border outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-[44rem]">
        <div className="sticky top-0 z-20 grid grid-cols-7 border-b bg-popover">
          {weeks[0].days.map((date) => (
            <div
              key={date.getDay()}
              className="px-2.5 py-2 text-xs font-medium text-muted-foreground"
              title={date.toLocaleDateString(undefined, { weekday: "long" })}
            >
              {date.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <CalendarWeek
            key={dateKey(week.start)}
            days={week.days}
            items={week.layout.items}
            laneCount={week.layout.laneCount}
            month={month}
            today={today}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarWeek({
  days,
  items,
  laneCount,
  month,
  today,
}: {
  days: Date[];
  items: PositionedSchedule[];
  laneCount: number;
  month: Date;
  today: Date;
}) {
  const visibleLanes = Math.min(laneCount, MAX_LANES);
  const dayItems = days.map((_, column) =>
    items.filter(
      (item) =>
        item.startColumn <= column && item.startColumn + item.span > column,
    ),
  );
  const hiddenCounts = dayItems.map(
    (list) => list.filter((item) => item.lane >= MAX_LANES).length,
  );
  const hasHidden = hiddenCounts.some(Boolean);
  const height = Math.max(
    104,
    DAY_HEADER + visibleLanes * LANE_HEIGHT + (hasHidden ? MORE_HEIGHT : 0) + 8,
  );

  return (
    <div
      className="relative grid grid-cols-7 border-b last:border-b-0"
      style={{ minHeight: `${height}px` }}
    >
      {days.map((date) => {
        const outside = date.getMonth() !== month.getMonth();
        const isToday = dateKey(date) === dateKey(today);

        return (
          <div
            key={dateKey(date)}
            className={cn(
              "border-r px-1.5 pt-1.5 last:border-r-0",
              isWeekend(date) && "bg-muted/30",
              outside && "bg-muted/50 text-muted-foreground/60",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                isToday && "bg-primary font-semibold text-primary-foreground",
              )}
              aria-label={isToday ? `Today, ${formatFullDate(date)}` : formatFullDate(date)}
            >
              {date.getDate()}
            </span>
          </div>
        );
      })}

      <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
        {items
          .filter((item) => item.lane < MAX_LANES)
          .map((item) => (
            <MonthBar key={`${item.project.uuid}-${item.kind}`} item={item} />
          ))}

        {hiddenCounts.map((count, column) =>
          count ? (
            <DayOverflow
              key={column}
              date={days[column]}
              count={count}
              items={dayItems[column]}
              column={column}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}

function MonthBar({ item }: { item: PositionedSchedule }) {
  const { project } = item;
  const isMilestone = item.kind !== "range";
  const label = scheduleAriaLabel(item);

  return (
    <Link
      href={`/projects/${project.uuid}`}
      title={label}
      aria-label={label}
      className={cn(
        "pointer-events-auto z-10 mx-1 flex h-5 min-w-0 items-center gap-1.5 rounded-md border px-1.5 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        scheduleBarClassNames[project.status],
        project.is_overdue && overdueClassNames,
        item.continuesBefore && "ml-0 rounded-l-none border-l-0",
        item.continuesAfter && "mr-0 rounded-r-none border-r-0",
      )}
      style={{
        gridColumn: `${item.startColumn + 1} / span ${item.span}`,
        gridRow: 1,
        marginTop: `${DAY_HEADER + item.lane * LANE_HEIGHT}px`,
      }}
    >
      {isMilestone ? (
        <span
          className={cn(
            "size-2 shrink-0 rotate-45 rounded-[2px] border-[1.5px]",
            scheduleMarkerClassNames[project.status],
          )}
        />
      ) : (
        !item.continuesBefore && (
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              projectStatusDotClassNames[project.status],
            )}
          />
        )
      )}
      <span className="truncate">
        {isMilestone && (
          <span className="font-normal opacity-75">
            {item.kind === "start" ? "Start · " : "Due · "}
          </span>
        )}
        {project.name}
      </span>
    </Link>
  );
}

function DayOverflow({
  date,
  count,
  items,
  column,
}: {
  date: Date;
  count: number;
  items: PositionedSchedule[];
  column: number;
}) {
  return (
    <Popover>
      <PopoverTrigger
        className="pointer-events-auto z-10 mx-1 h-5 w-fit rounded-md px-1.5 text-left text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        style={{
          gridColumn: `${column + 1} / span 1`,
          gridRow: 1,
          marginTop: `${DAY_HEADER + MAX_LANES * LANE_HEIGHT}px`,
        }}
        aria-label={`Show all ${items.length} projects on ${formatFullDate(date)}`}
      >
        +{count} more
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-2 p-2">
        <PopoverHeader className="px-2 pt-1">
          <PopoverTitle>
            {date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </PopoverTitle>
        </PopoverHeader>
        <ul className="grid gap-0.5">
          {items.map((item) => (
            <li key={`${item.project.uuid}-${item.kind}`}>
              <Link
                href={`/projects/${item.project.uuid}`}
                aria-label={scheduleAriaLabel(item)}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-md"
                  style={projectBadgeStyle(item.project.background)}
                >
                  <ProjectIcon name={item.project.icon} className="size-3" />
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm font-medium">
                    {item.project.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {projectStatusLabels[item.project.status]} ·{" "}
                    {scheduleRangeLabel(item)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
