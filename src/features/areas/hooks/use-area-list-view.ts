import { useDeferredValue, useState, useSyncExternalStore } from "react";
import type { AreaSort, AreaView } from "../area-list-utils";

const VIEW_STORAGE_KEY = "medasin.areas.view";
const viewListeners = new Set<() => void>();

function readStoredView(): AreaView {
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

function storeView(view: AreaView) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  viewListeners.forEach((listener) => listener());
}

export function useAreaListView() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AreaSort>("recent");
  const deferredSearch = useDeferredValue(search);
  const view = useSyncExternalStore(
    subscribeToView,
    readStoredView,
    () => "grid" as const,
  );

  return {
    search,
    deferredSearch,
    setSearch,
    sort,
    setSort,
    view,
    setView: storeView,
  };
}
