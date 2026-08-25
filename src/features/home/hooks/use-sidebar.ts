"use client";

import { useState } from "react";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "renthaven.sidebar-collapsed";

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoredCollapsed(value: boolean): void {
  try {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      value ? "1" : "0",
    );
  } catch {
    // localStorage unavailable (private mode, disabled storage) — in-memory state still works
  }
}

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(readStoredCollapsed);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      writeStoredCollapsed(next);
      return next;
    });
  };

  return { isCollapsed, toggleSidebar };
}
