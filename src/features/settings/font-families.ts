import type { AppFontFamily } from "./types";

export const fontFamilies = [
  { value: "geist", label: "Geist", family: "var(--font-geist)" },
  { value: "newsreader", label: "Newsreader", family: "var(--font-newsreader)" },
  { value: "manrope", label: "Manrope", family: "var(--font-manrope)" },
  { value: "inter", label: "Inter", family: "var(--font-inter)" },
] as const;

export function resolveFontFamily(value: unknown): AppFontFamily {
  return value === "newsreader" || value === "manrope" || value === "inter" ? value : "geist";
}
