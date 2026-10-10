import type { ProjectListCard, ProjectStatus } from "../type";

export type ProjectSchedule = {
  project: ProjectListCard;
  start: Date;
  end: Date;
  kind: "range" | "start" | "due";
};

export type PositionedSchedule = ProjectSchedule & {
  clippedStart: Date;
  clippedEnd: Date;
  startColumn: number;
  span: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export function projectSchedules(projects: ProjectListCard[]) {
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

export function layoutWeek(schedules: ProjectSchedule[], weekStart: Date) {
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

export function initialTimelineMonth(schedules: ProjectSchedule[]) {
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

export function monthBounds(month: Date) {
  return {
    start: new Date(month.getFullYear(), month.getMonth(), 1),
    end: new Date(month.getFullYear(), month.getMonth() + 1, 0),
  };
}

export function daysInMonth(month: Date) {
  const { start, end } = monthBounds(month);
  return Array.from({ length: end.getDate() }, (_, index) =>
    addDays(start, index),
  );
}

export function schedulesInMonth(schedules: ProjectSchedule[], month: Date) {
  const { start, end } = monthBounds(month);
  return schedules
    .filter((schedule) => schedule.start <= end && schedule.end >= start)
    .sort(
      (first, second) =>
        first.start.getTime() - second.start.getTime() ||
        first.end.getTime() - second.end.getTime() ||
        first.project.name.localeCompare(second.project.name),
    );
}

/** The closest month before (-1) or after (1) `month` that has a scheduled project. */
export function nearestScheduledMonth(
  schedules: ProjectSchedule[],
  month: Date,
  direction: -1 | 1,
) {
  const { start, end } = monthBounds(month);
  const candidates = schedules
    .map((schedule) =>
      direction === 1
        ? schedule.end > end
          ? schedule.start > end
            ? schedule.start
            : addDays(end, 1)
          : undefined
        : schedule.start < start
          ? schedule.end < start
            ? schedule.end
            : addDays(start, -1)
          : undefined,
    )
    .filter((date): date is Date => Boolean(date))
    .sort((first, second) =>
      direction === 1
        ? first.getTime() - second.getTime()
        : second.getTime() - first.getTime(),
    );
  const nearest = candidates[0];
  return nearest
    ? new Date(nearest.getFullYear(), nearest.getMonth(), 1)
    : undefined;
}

export function parseProjectDate(value: string | null) {
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

export function startOfCalendar(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  return addDays(first, -first.getDay());
}

export function shiftMonth(month: Date, amount: number) {
  return new Date(month.getFullYear(), month.getMonth() + amount, 1);
}

export function isSameMonth(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth()
  );
}

export function isWeekend(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

export function dayDifference(later: Date, earlier: Date) {
  return Math.round(
    (Date.UTC(later.getFullYear(), later.getMonth(), later.getDate()) -
      Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate())) /
      86_400_000,
  );
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatFullDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonth(date: Date, options: { short?: boolean } = {}) {
  return date.toLocaleDateString(undefined, {
    month: options.short ? "short" : "long",
    year: "numeric",
  });
}

/** Compact range for list rows, e.g. "Oct 1 – Nov 20" or "Due Oct 4". */
export function scheduleRangeLabel(schedule: ProjectSchedule) {
  const short = (date: Date) =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() !== new Date().getFullYear()
        ? { year: "numeric" }
        : {}),
    });
  if (schedule.kind === "start") return `Starts ${short(schedule.start)}`;
  if (schedule.kind === "due") return `Due ${short(schedule.end)}`;
  return `${short(schedule.start)} – ${short(schedule.end)}`;
}

export function scheduleAriaLabel(schedule: ProjectSchedule) {
  if (schedule.kind === "start") {
    return `${schedule.project.name} starts ${formatShortDate(schedule.start)}`;
  }
  if (schedule.kind === "due") {
    return `${schedule.project.name} is due ${formatShortDate(schedule.end)}`;
  }
  return `${schedule.project.name}, ${formatShortDate(schedule.start)} through ${formatShortDate(schedule.end)}`;
}

export const scheduleBarClassNames: Record<ProjectStatus, string> = {
  not_started:
    "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
  in_progress:
    "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900",
};

export const scheduleFillClassNames: Record<ProjectStatus, string> = {
  not_started: "bg-slate-200/70 dark:bg-slate-700/60",
  in_progress: "bg-blue-200/80 dark:bg-blue-800/60",
  completed: "bg-emerald-200/80 dark:bg-emerald-800/60",
};

export const scheduleMarkerClassNames: Record<ProjectStatus, string> = {
  not_started: "border-slate-400 bg-slate-100 dark:bg-slate-800",
  in_progress: "border-blue-500 bg-blue-100 dark:bg-blue-900",
  completed: "border-emerald-500 bg-emerald-100 dark:bg-emerald-900",
};

export const overdueClassNames =
  "border-red-300 ring-1 ring-red-400/60 dark:border-red-800 dark:ring-red-500/50";
