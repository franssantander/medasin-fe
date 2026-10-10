import { useSyncExternalStore } from "react";

export type ProjectCalendarView = "timeline" | "month";

const VIEW_STORAGE_KEY = "medasin.projects.calendar-view";
const viewListeners = new Set<() => void>();

function readStoredView(): ProjectCalendarView {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "month"
      ? "month"
      : "timeline";
  } catch {
    return "timeline";
  }
}

function subscribeToView(listener: () => void) {
  viewListeners.add(listener);
  return () => {
    viewListeners.delete(listener);
  };
}

function storeView(view: ProjectCalendarView) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  viewListeners.forEach((listener) => listener());
}

export function useProjectCalendarView() {
  const view = useSyncExternalStore(
    subscribeToView,
    readStoredView,
    () => "timeline" as const,
  );

  return [view, storeView] as const;
}
