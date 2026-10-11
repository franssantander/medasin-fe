"use client";

import type { ReactNode } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LetterExportFormat } from "../type";
import { LetterFormatPicker } from "./letter-format-picker";

export function LetterStudioTopbar({
  letterTitle,
  format,
  formatDisabled,
  onFormatChange,
  onBack,
  backPending = false,
  status,
  actions,
}: {
  letterTitle: string;
  format: LetterExportFormat;
  formatDisabled: boolean;
  onFormatChange: (format: LetterExportFormat) => void;
  onBack: () => void;
  backPending?: boolean;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b bg-background px-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Back to editor"
          disabled={backPending}
          onClick={onBack}
        >
          {backPending ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <ArrowLeft data-icon="inline-start" />
          )}
          <span className="hidden sm:inline">Editor</span>
        </Button>
        <Separator orientation="vertical" className="hidden h-5 md:block" />
        <div className="hidden min-w-0 md:grid">
          <p className="truncate text-sm font-medium" title={letterTitle}>
            {letterTitle}
          </p>
          <p className="truncate text-xs text-muted-foreground" aria-live="polite">
            {status ?? "Social pages"}
          </p>
        </div>
      </div>

      <LetterFormatPicker
        value={format}
        disabled={formatDisabled}
        onChange={onFormatChange}
      />

      <div className="flex min-w-0 items-center justify-end gap-2">{actions}</div>
    </header>
  );
}
