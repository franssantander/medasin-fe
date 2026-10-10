"use client";

import { useEffect, useRef } from "react";
import { formatCountdown, phaseLabels } from "../lib/focus-utils";
import type { FocusSession } from "../type";

const timerTitle = /^(?:⏸ )?\d{2,}:\d{2} · /;

// Mirrors the countdown in the browser tab. Next replaces the title on navigation,
// so it is re-applied on every tick and the page's own title is restored afterwards.
export function useFocusDocumentTitle(session: FocusSession | null, remaining: number, pathname: string) {
  const baseRef = useRef<string | null>(null);
  const label = session ? `${session.status === "paused" ? "⏸ " : ""}${formatCountdown(remaining)} · ${phaseLabels[session.type]}` : null;

  useEffect(() => {
    if (!label) return;
    const current = document.title;
    if (!timerTitle.test(current)) baseRef.current = current;
    const base = baseRef.current;
    document.title = base ? `${label} — ${base}` : label;
  }, [label, pathname]);

  useEffect(() => {
    if (label) return;
    if (baseRef.current !== null && timerTitle.test(document.title)) document.title = baseRef.current;
    baseRef.current = null;
  }, [label]);

  useEffect(() => () => {
    if (baseRef.current !== null && timerTitle.test(document.title)) document.title = baseRef.current;
  }, []);
}
