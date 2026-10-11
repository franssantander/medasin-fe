import type { LetterExportFormat } from "./type";

export const LETTER_EXPORT_FORMATS: Record<
  LetterExportFormat,
  {
    name: string;
    label: string;
    shortLabel: string;
    ratio: string;
    width: number;
    height: number;
  }
> = {
  portrait: {
    name: "Portrait",
    label: "Instagram portrait",
    shortLabel: "IG portrait",
    ratio: "4:5",
    width: 1080,
    height: 1350,
  },
  square: {
    name: "Square",
    label: "Instagram square",
    shortLabel: "IG square",
    ratio: "1:1",
    width: 1080,
    height: 1080,
  },
  story: {
    name: "Story",
    label: "Instagram story",
    shortLabel: "IG story",
    ratio: "9:16",
    width: 1080,
    height: 1920,
  },
  landscape: {
    name: "Landscape",
    label: "X / Twitter landscape",
    shortLabel: "X landscape",
    ratio: "16:9",
    width: 1920,
    height: 1080,
  },
};

export const LETTER_EXPORT_FORMAT_OPTIONS = Object.entries(
  LETTER_EXPORT_FORMATS,
) as [LetterExportFormat, (typeof LETTER_EXPORT_FORMATS)[LetterExportFormat]][];

export function isLetterExportFormat(
  value: unknown,
): value is LetterExportFormat {
  return typeof value === "string" && Object.hasOwn(LETTER_EXPORT_FORMATS, value);
}
