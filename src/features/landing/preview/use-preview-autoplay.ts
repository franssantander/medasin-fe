"use client";

import { useEffect, useRef } from "react";

export const AUTOPLAY_DELAY = 5000;

/**
 * Moves the preview on to the next screen after a pause. The pause restarts whenever the screen changes,
 * so a screen picked mid-countdown still gets its full time.
 */
export function usePreviewAutoplay({ enabled, value, onAdvance }: { enabled: boolean; value: string; onAdvance: () => void }) {
  const advance = useRef(onAdvance);
  useEffect(() => {
    advance.current = onAdvance;
  });

  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => advance.current(), AUTOPLAY_DELAY);
    return () => window.clearTimeout(id);
  }, [enabled, value]);
}
