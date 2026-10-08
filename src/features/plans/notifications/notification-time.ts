import type { PlanNotification } from "./type";

export function notificationSchedule(
  item: PlanNotification,
): string | undefined {
  const dateKey = item.data.date;
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;

  const date = new Date(`${dateKey}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateKey
  )
    return;

  // The payload contains wall-clock fields in the plan's timezone, not an instant.
  // Format them in UTC to preserve that date and time in every browser timezone.
  const parts = [
    new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date),
  ];
  if (!item.data.time) {
    parts.push("All day");
  } else {
    const time = item.data.time.match(
      /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/,
    );
    if (time) {
      date.setUTCHours(Number(time[1]), Number(time[2]));
      parts.push(
        new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "UTC",
        }).format(date),
      );
    }
  }
  if (item.data.timezone) parts.push(item.data.timezone.replaceAll("_", " "));
  return parts.join(" · ");
}

export function notificationReceived(item: PlanNotification, now: number) {
  if (!item.created_at) return;
  const date = new Date(item.created_at);
  if (!Number.isFinite(date.getTime())) return;

  const elapsed = Math.max(0, now - date.getTime());
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 86_400_000],
    ["month", 30 * 86_400_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const unit = units.find(([, duration]) => elapsed >= duration);
  return {
    dateTime: date.toISOString(),
    absolute: new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date),
    relative: unit
      ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
          -Math.floor(elapsed / unit[1]),
          unit[0],
        )
      : "Just now",
  };
}
