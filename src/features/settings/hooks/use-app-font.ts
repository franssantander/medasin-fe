"use client";

import { useLayoutEffect } from "react";
import { resolveFontFamily } from "../font-families";

export function useAppFont(userId: number | undefined, fontFamily: unknown) {
  const font = resolveFontFamily(fontFamily);

  useLayoutEffect(() => {
    const root = document.documentElement;

    if (userId !== undefined) {
      root.dataset.appFont = font;
    } else {
      delete root.dataset.appFont;
    }

    return () => {
      delete root.dataset.appFont;
    };
  }, [userId, font]);
}
