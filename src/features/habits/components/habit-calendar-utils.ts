import type {
  Habit,
  HabitCalendarColumn,
  HabitCalendarRange,
  HabitCalendarView,
  HabitCheckIn,
  HabitWeekday,
} from "../type";

const weekdays: HabitWeekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dateFromLocal(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getCalendarRange(
  view: HabitCalendarView,
  anchor: Date,
  habits: Habit[],
): HabitCalendarRange {
  const today = startOfDay(new Date());
  let start = startOfDay(anchor);
  let end = today;

  if (view === "week") {
    start = addDays(anchor, -anchor.getDay());
    end = addDays(start, 6);
  } else if (view === "month") {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  } else if (view === "year") {
    start = new Date(anchor.getFullYear(), 0, 1);
    end = new Date(anchor.getFullYear(), 11, 31);
  } else {
    const earliest = habits.reduce<Date | null>((current, habit) => {
      const created = startOfDay(new Date(habit.created_at));
      return !current || created < current ? created : current;
    }, null);
    start = earliest
      ? new Date(earliest.getFullYear(), earliest.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    end = today;
  }

  return {
    view,
    start,
    end,
    startDate: localDate(start),
    endDate: localDate(end),
  };
}

export function getCalendarColumns(
  range: HabitCalendarRange,
): HabitCalendarColumn[] {
  if (range.view === "year") {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(range.start.getFullYear(), index, 1);
      return {
        key: `${date.getFullYear()}-${String(index + 1).padStart(2, "0")}`,
        date,
        label: date.toLocaleDateString(undefined, { month: "long" }),
        shortLabel: date.toLocaleDateString(undefined, { month: "short" }),
        aggregate: true,
      };
    });
  }

  if (range.view === "all") {
    const columns: HabitCalendarColumn[] = [];
    for (
      let date = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
      date <= range.end;
      date = addMonths(date, 1)
    ) {
      columns.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        date,
        label: date.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        shortLabel: date.toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
        }),
        aggregate: true,
      });
    }
    return columns;
  }

  const columns: HabitCalendarColumn[] = [];
  for (let date = range.start; date <= range.end; date = addDays(date, 1)) {
    columns.push({
      key: localDate(date),
      date,
      label: date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      shortLabel:
        range.view === "week"
          ? date.toLocaleDateString(undefined, { weekday: "short" })
          : String(date.getDate()),
      aggregate: false,
    });
  }
  return columns;
}

export function shiftAnchor(view: HabitCalendarView, anchor: Date, amount: number) {
  if (view === "week") return addDays(anchor, amount * 7);
  if (view === "month") return addMonths(anchor, amount);
  if (view === "year") return new Date(anchor.getFullYear() + amount, 0, 1);
  return anchor;
}

export function rangeLabel(range: HabitCalendarRange) {
  if (range.view === "week") {
    return `${range.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${range.end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  if (range.view === "month") {
    return range.start.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }
  if (range.view === "year") return String(range.start.getFullYear());
  return `${range.start.toLocaleDateString(undefined, { month: "short", year: "numeric" })} – Today`;
}

export function isScheduled(habit: Habit, date: Date) {
  const created = startOfDay(new Date(habit.created_at));
  if (date < created || !habit.is_active) return false;
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "monthly") {
    return (habit.schedule?.dates ?? [created.getDate()]).includes(
      date.getDate(),
    );
  }
  const days = habit.schedule?.days ?? [weekdays[created.getDay()]];
  return days.includes(weekdays[date.getDay()]);
}

export function scheduleLabel(habit: Habit) {
  if (habit.frequency === "daily") return "Every day";
  if (habit.frequency === "monthly") {
    return `Monthly · ${(habit.schedule?.dates ?? []).join(", ") || "creation date"}`;
  }
  const labels = (habit.schedule?.days ?? [])
    .map((day) => day.slice(0, 3))
    .join(", ");
  return habit.frequency === "weekly"
    ? `Weekly · ${labels || "creation day"}`
    : labels || "Selected weekdays";
}

export function checkInMap(entries: HabitCheckIn[] | undefined) {
  return new Map((entries ?? []).map((entry) => [entry.date, entry]));
}

export function isToday(date: Date, today: Date) {
  return date.getTime() === today.getTime();
}

export function isCurrentColumn(column: HabitCalendarColumn, today: Date) {
  return column.aggregate
    ? column.date.getFullYear() === today.getFullYear() &&
        column.date.getMonth() === today.getMonth()
    : isToday(column.date, today);
}

export function aggregateMonth(
  habit: Habit,
  entries: Map<string, HabitCheckIn>,
  month: Date,
  today: Date,
) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  let scheduled = 0;
  let completed = 0;

  for (
    let date = start;
    date <= end;
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  ) {
    if (!isScheduled(habit, date) || date > today) continue;
    scheduled += 1;
    if (entries.get(localDate(date))?.completed) completed += 1;
  }

  return { scheduled, completed };
}

// Streaks only count scheduled days. Today stays open until it is checked in,
// so an unfinished day never breaks the current streak.
export function getStreaks(
  habit: Habit,
  entries: Map<string, HabitCheckIn>,
  today: Date,
) {
  const created = startOfDay(new Date(habit.created_at));
  let best = 0;
  let run = 0;
  for (let date = created; date <= today; date = addDays(date, 1)) {
    if (!isScheduled(habit, date)) continue;
    if (entries.get(localDate(date))?.completed) {
      run += 1;
      best = Math.max(best, run);
    } else if (date < today) run = 0;
  }
  return { current: run, best };
}

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function ordinal(day: number) {
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return day + suffix;
}

export function describeSchedule(
  frequency: Habit["frequency"],
  schedule: Habit["schedule"],
) {
  if (frequency === "daily") return "Repeats every day";
  if (frequency === "monthly") {
    const dates = [...(schedule?.dates ?? [])].sort((a, b) => a - b);
    return dates.length
      ? "Repeats on the " + listJoin(dates.map(ordinal)) + " of each month"
      : "Choose the dates you want to repeat";
  }
  const days = weekdays.filter((day) => schedule?.days?.includes(day));
  if (!days.length) return "Choose the days you want to repeat";
  if (days.length === 7) return "Repeats every day";
  const key = days.join();
  if (key === "monday,tuesday,wednesday,thursday,friday")
    return "Repeats every weekday";
  if (key === "sunday,saturday") return "Repeats every weekend";
  return (
    "Repeats every " +
    listJoin(days.map((day) => weekdayNames[weekdays.indexOf(day)]))
  );
}

export function rateTone(rate: number) {
  if (rate >= 0.85) return "bg-emerald-500 text-white dark:bg-emerald-500/90";
  if (rate >= 0.6)
    return "bg-emerald-500/60 text-emerald-950 dark:bg-emerald-500/55 dark:text-white";
  if (rate >= 0.35)
    return "bg-emerald-500/35 text-emerald-950 dark:bg-emerald-500/30 dark:text-emerald-50";
  if (rate > 0)
    return "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100";
  return "bg-muted text-muted-foreground";
}
