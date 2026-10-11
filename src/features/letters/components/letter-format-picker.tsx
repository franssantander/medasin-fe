"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  LETTER_EXPORT_FORMATS,
  LETTER_EXPORT_FORMAT_OPTIONS,
} from "../letter-export-formats";
import type { LetterExportFormat } from "../type";

export function LetterFormatPicker({
  value,
  disabled = false,
  onChange,
  className,
}: {
  value: LetterExportFormat;
  disabled?: boolean;
  onChange: (format: LetterExportFormat) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      aria-label="Page format"
      size="sm"
      spacing={0}
      disabled={disabled}
      value={[value]}
      className={cn("gap-0.5 rounded-lg bg-muted p-0.5", className)}
      onValueChange={(next) => {
        const format = next[0] as LetterExportFormat | undefined;
        if (format && format !== value) onChange(format);
      }}
    >
      {LETTER_EXPORT_FORMAT_OPTIONS.map(([format, details]) => (
        <ToggleGroupItem
          key={format}
          value={format}
          aria-label={`${details.name} ${details.ratio}`}
          title={`${details.label} · ${details.width} × ${details.height}px`}
          className="h-7 gap-1.5 rounded-md! px-2! text-xs text-muted-foreground hover:bg-background/60 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
        >
          <FormatGlyph format={format} />
          <span className="hidden xl:inline">{details.name}</span>
          <span className="hidden tabular-nums sm:inline">{details.ratio}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** A small outline drawn at the format's real aspect ratio. */
export function FormatGlyph({
  format,
  className,
}: {
  format: LetterExportFormat;
  className?: string;
}) {
  const { width, height } = LETTER_EXPORT_FORMATS[format];
  const scale = 14 / Math.max(width, height);

  return (
    <span
      aria-hidden="true"
      className={cn("flex size-4 items-center justify-center", className)}
    >
      <span
        className="rounded-[2px] border-[1.5px] border-current"
        style={{ width: width * scale, height: height * scale }}
      />
    </span>
  );
}
