import type { LetterExportFormat } from "./type";

export const LETTER_EXPORT_FORMATS: Record<
  LetterExportFormat,
  {
    label: string;
    shortLabel: string;
    ratio: string;
    width: number;
    height: number;
  }
> = {
  portrait: {
    label: "Instagram portrait",
    shortLabel: "IG portrait",
    ratio: "4:5",
    width: 1080,
    height: 1350,
  },
  square: {
    label: "Instagram square",
    shortLabel: "IG square",
    ratio: "1:1",
    width: 1080,
    height: 1080,
  },
  story: {
    label: "Instagram story",
    shortLabel: "IG story",
    ratio: "9:16",
    width: 1080,
    height: 1920,
  },
  landscape: {
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
