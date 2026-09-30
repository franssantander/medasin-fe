import type { AppFontFamily } from "./types";

export const fontFamilies = [
  { value: "manrope", label: "Manrope", family: "var(--font-manrope)" },
  { value: "geist", label: "Geist", family: "var(--font-geist)" },
  { value: "inter", label: "Inter", family: "var(--font-inter)" },
] as const;

export function resolveFontFamily(value: unknown): AppFontFamily {
  return value === "geist" || value === "inter" ? value : "manrope";
}
