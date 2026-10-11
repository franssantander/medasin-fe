import { CalendarDays, CirclePile, Target, type LucideIcon } from "lucide-react";
import type { PlanAccent } from "./plan-time";

type PlanAccentStyle = {
  label: string;
  icon: LucideIcon;
  /** Small solid marker (dots, bars). */
  dotClass: string;
  /** Calendar chip fill, as a CSS color for FullCalendar. */
  eventColor: string;
};

// Projects and areas reuse the sidebar icons so a plan's link reads at a glance.
export const PLAN_ACCENTS: Record<PlanAccent, PlanAccentStyle> = {
  project: {
    label: "Project",
    icon: Target,
    dotClass: "bg-sky-500",
    eventColor: "color-mix(in oklab, var(--color-sky-500) 14%, var(--card))",
  },
  area: {
    label: "Area",
    icon: CirclePile,
    dotClass: "bg-emerald-500",
    eventColor: "color-mix(in oklab, var(--color-emerald-500) 14%, var(--card))",
  },
  none: {
    label: "Plan",
    icon: CalendarDays,
    dotClass: "bg-muted-foreground/70",
    eventColor: "var(--muted)",
  },
};
