import type { Habit, HabitCheckIn, HabitWeekday } from "../type";

export const weekdayNames: HabitWeekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isScheduled(habit: Habit, date: Date) {
  const created = startOfDay(new Date(habit.created_at));
  if (date < created) return false;
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "monthly") {
    return (habit.schedule?.dates ?? [created.getDate()]).includes(
      date.getDate(),
    );
  }
  const days = habit.schedule?.days ?? [weekdayNames[created.getDay()]];
  return days.includes(weekdayNames[date.getDay()]);
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

export function completionRate(
  habit: Habit,
  entries: Map<string, HabitCheckIn>,
  start: Date,
  end: Date,
) {
  let scheduled = 0;
  let complete = 0;
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (isScheduled(habit, date)) {
      scheduled += 1;
      if (entries.get(localDate(date))?.completed) complete += 1;
    }
  }
  return scheduled ? Math.round((complete / scheduled) * 100) : 0;
}

export function calendarCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
