import type { AmbientSound, FocusSessionType, FocusTask } from "../type";

export const phaseLabels: Record<FocusSessionType, string> = {
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
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
