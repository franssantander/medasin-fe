"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

type Axis = "x" | "y";
export type HighlightBox = { offset: number; size: number };

/**
 * Tracks where the active item sits inside its positioned parent, so one highlight can slide between items.
 * Uses layout offsets rather than layout animations: the preview canvas is CSS-scaled, and offsets ignore that.
 */
export function useSlidingHighlight(active: string, axis: Axis) {
  const items = useRef(new Map<string, HTMLElement>());
  const [box, setBox] = useState<HighlightBox>();

  const register = useCallback(
    (key: string) => (element: HTMLElement | null) => {
      if (element) items.current.set(key, element);
      else items.current.delete(key);
    },
    [],
  );

  useLayoutEffect(() => {
    const measure = () => {
      const element = items.current.get(active);
      if (!element) return;
      setBox(
        axis === "y"
          ? { offset: element.offsetTop, size: element.offsetHeight }
          : { offset: element.offsetLeft, size: element.offsetWidth },
      );
    };
    measure();
    // Fonts and the first layout can shift items after mount.
    const observer = new ResizeObserver(measure);
    for (const element of items.current.values()) observer.observe(element);
    return () => observer.disconnect();
  }, [active, axis]);

  return { register, box };
}
