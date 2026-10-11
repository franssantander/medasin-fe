import type { CalendarPlan } from "./type";

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function previousDateKey(exclusiveEnd: string) {
  const [year, month, day] = exclusiveEnd.slice(0, 10).split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1, day));
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

export function formatPlanWhen(plan: CalendarPlan, options?: { short?: boolean }) {
  if (plan.is_all_day) {
    const day = new Date(`${plan.date}T12:00:00`);
    return `${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      ...(options?.short ? {} : { year: "numeric" as const }),
    }).format(day)} · All day`;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(options?.short ? {} : { year: "numeric" as const }),
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(plan.starts_at));
}

export function reminderLabel(plan: CalendarPlan, now = new Date()) {
  if (plan.reminder_status === "none") return "No reminder";
  if (plan.reminder_status === "fired") return "Reminder sent";
  if (plan.reminder_status === "skipped") return "Reminder passed";
  if (!plan.remind_at) return "Reminder pending";

  const minutes = Math.ceil(
    (new Date(plan.remind_at).getTime() - now.getTime()) / 60_000,
  );
  if (minutes <= 0) return "Reminder pending";
  if (minutes < 60) return `Reminder in ${minutes}m`;
  if (minutes < 1440) return `Reminder in ${Math.ceil(minutes / 60)}h`;
  return `Reminder in ${Math.ceil(minutes / 1440)}d`;
}

export type PlanAccent = "project" | "area" | "none";

export function planAccent(plan: Pick<CalendarPlan, "project" | "area">): PlanAccent {
  if (plan.project) return "project";
  if (plan.area) return "area";
  return "none";
}

/** The plan's calendar day in the viewer's timezone, as YYYY-MM-DD. */
export function planDayKey(plan: CalendarPlan) {
  return plan.is_all_day ? plan.date : localDateKey(new Date(plan.starts_at));
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDaysToKey(key: string, days: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

/** "Mon, Oct 12" */
export function formatDayKey(key: string, options?: { year?: boolean }) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(options?.year ? { year: "numeric" as const } : {}),
  }).format(dateFromKey(key));
}

/** "10:00 AM", or "All day". */
export function formatPlanTime(plan: CalendarPlan) {
  if (plan.is_all_day) return "All day";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(plan.starts_at));
}

/** "Today", "Tomorrow", or "Mon, Oct 12". */
export function dayGroupLabel(key: string, todayKey: string) {
  if (key === todayKey) return "Today";
  if (key === addDaysToKey(todayKey, 1)) return "Tomorrow";
  return formatDayKey(key);
}
