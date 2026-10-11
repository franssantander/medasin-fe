import { Brain, Coffee, Sofa, type LucideIcon } from "lucide-react";
import type { AmbientSound, FocusSessionType, FocusTask } from "../type";

export const phaseLabels: Record<FocusSessionType, string> = {
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

// Static class strings so Tailwind can see every phase tint.
export const phaseMeta: Record<FocusSessionType, {
  icon: LucideIcon;
  text: string;
  dot: string;
  chip: string;
  wash: string;
  accent: string;
  glow: string;
}> = {
  focus: {
    icon: Brain,
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
    chip: "bg-orange-500/10 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400",
    wash: "bg-linear-to-b from-orange-500/[0.06] to-transparent to-60% dark:from-orange-400/[0.08]",
    accent: "before:bg-orange-500",
    glow: "bg-orange-500/15 dark:bg-orange-400/10",
  },
  short_break: {
    icon: Coffee,
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400",
    wash: "bg-linear-to-b from-emerald-500/[0.06] to-transparent to-60% dark:from-emerald-400/[0.08]",
    accent: "before:bg-emerald-500",
    glow: "bg-emerald-500/15 dark:bg-emerald-400/10",
  },
  long_break: {
    icon: Sofa,
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400",
    wash: "bg-linear-to-b from-sky-500/[0.06] to-transparent to-60% dark:from-sky-400/[0.08]",
    accent: "before:bg-sky-500",
    glow: "bg-sky-500/15 dark:bg-sky-400/10",
  },
};

export const ambientOptions: { value: AmbientSound; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "brown", label: "Brown noise" },
  { value: "pink", label: "Pink noise" },
  { value: "white", label: "White noise" },
];

export function formatFocused(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
}

export function formatCountdown(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}

export function getNextType(
  completedType: FocusSessionType,
  suggestedNextType: FocusSessionType,
): FocusSessionType {
  if (completedType !== "focus") return "focus";
  return suggestedNextType === "long_break" ? "long_break" : "short_break";
}

export function getActiveTaskUuid(tasks: FocusTask[], preferred?: string) {
  return tasks.find((task) => task.uuid === preferred && !task.completed_at)?.uuid
    ?? tasks.find((task) => !task.completed_at)?.uuid;
}

export function phaseMinutes(settings: { focus_minutes: number; short_break_minutes: number; long_break_minutes: number }): Record<FocusSessionType, number> {
  return {
    focus: settings.focus_minutes,
    short_break: settings.short_break_minutes,
    long_break: settings.long_break_minutes,
  };
}

// Completed focus sessions in the current long-break cycle (1-based round of the next focus session).
export function getRoundProgress(completed: number, perCycle: number, suggestedNext: FocusSessionType) {
  const size = Math.max(1, perCycle);
  const filled = suggestedNext === "long_break" ? size : completed % size;
  return { size, filled, round: Math.min(size, filled + 1) };
}
