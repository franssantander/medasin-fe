"use client";

import { useSyncExternalStore } from "react";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "renthaven.sidebar-collapsed";
const SIDEBAR_STORAGE_EVENT = "medasin:sidebar-state-change";

function getStoredCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeToSidebarState(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_COLLAPSED_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);
  };
}

function writeStoredCollapsed(value: boolean): void {
  try {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      value ? "1" : "0",
    );
    window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
  } catch {
    // The sidebar remains usable when browser storage is unavailable.
  }
}

export function useSidebar() {
  const isCollapsed = useSyncExternalStore(
    subscribeToSidebarState,
    getStoredCollapsed,
    () => false,
  );

  const toggleSidebar = () => {
    writeStoredCollapsed(!isCollapsed);
  };

  return { isCollapsed, toggleSidebar };
}
