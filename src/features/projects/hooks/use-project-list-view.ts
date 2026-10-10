import { useCallback, useDeferredValue, useState, useSyncExternalStore } from "react";
import type {
  ProjectListTab,
  ProjectSort,
  ProjectStatusFilter,
  ProjectView,
} from "../project-list-utils";

const VIEW_STORAGE_KEY = "medasin.projects.view";
const viewListeners = new Set<() => void>();

function readStoredView(): ProjectView {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "list"
      ? "list"
      : "grid";
  } catch {
    return "grid";
  }
}

function subscribeToView(listener: () => void) {
  viewListeners.add(listener);
  return () => {
    viewListeners.delete(listener);
  };
}

function storeView(view: ProjectView) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  viewListeners.forEach((listener) => listener());
}

export function useProjectListView() {
  const [tab, setTab] = useState<ProjectListTab>("active");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatusFilter>("all");
  const [sort, setSort] = useState<ProjectSort>("recent");
  const deferredSearch = useDeferredValue(search);
  const view = useSyncExternalStore(
    subscribeToView,
    readStoredView,
    () => "grid" as const,
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("all");
  }, []);

  return {
    tab,
    setTab,
    search,
    deferredSearch,
    setSearch,
    status,
    setStatus,
    sort,
    setSort,
    view,
    setView: storeView,
    clearFilters,
    hasFilters: search.trim() !== "" || status !== "all",
  };
}
