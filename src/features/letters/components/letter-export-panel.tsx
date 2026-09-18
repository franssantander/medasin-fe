"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  FileText,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  letterKeys,
  useLetterExportQuery,
} from "../queries/letter-query";
import type {
  Letter,
  LetterExport,
  LetterExportFormat,
  LetterPage,
} from "../type";
import {
  LETTER_EXPORT_FORMATS,
  LETTER_EXPORT_FORMAT_OPTIONS,
} from "../letter-export-formats";
import { LetterPagePreview, LetterPageThumbnail } from "./letter-page-preview";
import { LetterPageWorkspace } from "./letter-page-workspace";

export function LetterExportPanel({
  letterUuid,
  letterTitle,
  latestExport,
  activeExportUuid,
  onExport,
  onPagesSaved,
  exportPending = false,
  hasUnsavedChanges = false,
}: {
  letterUuid?: string;
  letterTitle: string;
  latestExport?: LetterExport | null;
  activeExportUuid?: string;
  onExport: (format: LetterExportFormat) => Promise<void>;
  onPagesSaved: (letter: Letter) => void;
  exportPending?: boolean;
  hasUnsavedChanges?: boolean;
}) {
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<LetterExportFormat>(
    latestExport?.format ?? "portrait",
  );
  const [preparationError, setPreparationError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const invalidatedExportRef = useRef<string | undefined>(undefined);
  const requestedRenderRef = useRef<string | undefined>(undefined);
  const exportUuid = activeExportUuid ?? latestExport?.uuid;
  const exportQuery = useLetterExportQuery(letterUuid, exportUuid);
  const currentExport = activeExportUuid
    ? exportQuery.data?.data
    : exportQuery.data?.data ?? latestExport;
  const pages = currentExport?.pages ?? [];
  const isReady = currentExport?.status === "ready" && pages.length > 0;
  const isPreparing =
    preparing ||
    exportPending ||
    currentExport?.status === "queued" ||
    currentExport?.status === "processing";
  const isCurrentForLetter =
    currentExport?.uuid === latestExport?.uuid
      ? Boolean(currentExport?.is_current && latestExport?.is_current)
      : Boolean(currentExport?.is_current);

  useEffect(() => {
    if (
      !letterUuid ||
      !exportUuid ||
      !currentExport ||
      currentExport.status !== "ready" ||
      invalidatedExportRef.current === exportUuid
    ) {
      return;
    }

    invalidatedExportRef.current = exportUuid;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: letterKeys.detail(letterUuid) }),
      queryClient.invalidateQueries({ queryKey: letterKeys.list() }),
    ]);
  }, [currentExport, exportUuid, letterUuid, queryClient]);

  const renderFormat = useCallback(
    async (nextFormat: LetterExportFormat) => {
      setPreparationError("");
      setPreparing(true);
      try {
        await onExport(nextFormat);
      } catch (error) {
        setPreparationError(
          error instanceof Error
            ? error.message
            : "The pages could not be rendered.",
        );
      } finally {
        setPreparing(false);
      }
    },
    [onExport],
  );

  useEffect(() => {
    if (
      hasUnsavedChanges ||
      isPreparing ||
      (activeExportUuid && exportQuery.isLoading && !currentExport)
    ) {
      return;
    }

    const needsRender =
      !currentExport ||
      currentExport.format !== format ||
      !isCurrentForLetter;
    if (!needsRender) {
      requestedRenderRef.current = undefined;
      return;
    }

    const requestKey = [
      letterUuid ?? "draft",
      format,
      currentExport?.uuid ?? "new",
      currentExport?.updated_at ?? "",
      String(isCurrentForLetter),
    ].join(":");
    if (requestedRenderRef.current === requestKey) return;

    requestedRenderRef.current = requestKey;
    void renderFormat(format);
  }, [
    currentExport,
    activeExportUuid,
    exportQuery.isLoading,
    format,
    hasUnsavedChanges,
    isCurrentForLetter,
    isPreparing,
    letterUuid,
    renderFormat,
  ]);

  const retryRender = () => {
    requestedRenderRef.current = undefined;
    void renderFormat(format);
  };

  const formatDetails = LETTER_EXPORT_FORMATS[format];

  return (
    <section
      aria-label="Letter export preview"
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-muted/20 p-3 sm:p-4"
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-semibold">Export pages</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the page split before sharing.
          </p>
        </div>
        <Select
          value={format}
          disabled={isPreparing}
          onValueChange={(value) => {
            requestedRenderRef.current = undefined;
            setFormat(value as LetterExportFormat);
          }}
        >
          <SelectTrigger size="sm" aria-label="Export format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {LETTER_EXPORT_FORMAT_OPTIONS.map(([value, details]) => (
                <SelectItem key={value} value={value}>
                  {details.shortLabel} ({details.ratio})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {exportQuery.isError && !currentExport ? (
          <ExportState
            icon={<AlertTriangle className="size-5 text-destructive" />}
            title="Preview could not be loaded"
            description="The export status could not be checked. Try again when you are back online."
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void exportQuery.refetch()}
            >
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </ExportState>
        ) : !currentExport && (exportQuery.isLoading || isPreparing) ? (
          <ExportPreviewSkeleton />
        ) : !currentExport ? (
          <ExportState
            icon={<FileText className="size-5 text-muted-foreground" />}
            title="Rendering your first page set"
            description={`${formatDetails.label} pages render automatically at ${formatDetails.width} × ${formatDetails.height}px.`}
          />
        ) : currentExport.status === "failed" ? (
          <ExportState
            icon={<AlertTriangle className="size-5 text-destructive" />}
            title="Page rendering failed"
            description={
              currentExport.error ||
              "Something went wrong while rendering these pages."
            }
          >
            <Button type="button" variant="outline" size="sm" onClick={retryRender}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </ExportState>
        ) : currentExport.status !== "ready" || !isReady ? (
          <ExportState
            icon={<LoaderCircle className="size-5 animate-spin text-muted-foreground" />}
            title="Rendering pages..."
            description="Your selected page size is rendering. This panel will update automatically."
          />
        ) : (
          <ReadyExport
            key={exportUuid}
            letterExport={currentExport}
            pages={pages}
            letterUuid={letterUuid!}
            letterTitle={letterTitle}
            hasUnsavedChanges={hasUnsavedChanges}
            onPagesSaved={onPagesSaved}
          />
        )}
      </div>

      {preparationError && (
        <div className="mt-3 flex shrink-0 items-center justify-between gap-3" role="alert">
          <p className="text-sm text-destructive">{preparationError}</p>
          <Button type="button" variant="outline" size="sm" onClick={retryRender}>
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
        </div>
      )}

      <div className="mt-4 flex shrink-0 flex-col gap-2 border-t pt-3" aria-live="polite">
        <p className="text-center text-xs text-muted-foreground">
          {isPreparing
            ? `Rendering ${formatDetails.label} at ${formatDetails.width} × ${formatDetails.height}px…`
            : currentExport?.status === "ready"
            ? `${currentExport.page_count ?? pages.length} ${pages.length === 1 ? "page" : "pages"} · Rendered as ${LETTER_EXPORT_FORMATS[currentExport.format].label} ${LETTER_EXPORT_FORMATS[currentExport.format].ratio}`
            : `${formatDetails.width} × ${formatDetails.height}px canvas`}
        </p>
      </div>
    </section>
  );
}

function ReadyExport({
  letterExport,
  pages,
  letterUuid,
  letterTitle,
  hasUnsavedChanges,
  onPagesSaved,
}: {
  letterExport: LetterExport;
  pages: LetterPage[];
  letterUuid: string;
  letterTitle: string;
  hasUnsavedChanges: boolean;
  onPagesSaved: (letter: Letter) => void;
}) {
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const selectedPage = pages[selectedPageIndex] ?? pages[0];

  if (!selectedPage) return null;

  return (
    <div className="grid gap-3">
      {(!letterExport.is_current || hasUnsavedChanges) && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            This preview does not include your latest edits. It will update
            automatically after those edits are saved.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          Page {selectedPage.number} of {pages.length}
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
          Ready
        </span>
      </div>

      <LetterPagePreview
        page={selectedPage}
        exportUuid={letterExport.uuid}
        canvas={letterExport.canvas}
      />

      <div
        className="flex min-w-0 gap-2 overflow-x-auto pb-1"
        aria-label="Letter pages"
      >
        {pages.map((page, index) => (
          <button
            key={`${letterExport.uuid}-${page.number}`}
            type="button"
            aria-label={`View page ${page.number}`}
            aria-current={index === selectedPageIndex ? "page" : undefined}
            className={cn(
              "min-w-20 snap-start rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-w-24",
              index === selectedPageIndex && "ring-2 ring-ring/40",
            )}
            onClick={() => setSelectedPageIndex(index)}
          >
            <LetterPageThumbnail
              page={page}
              canvas={letterExport.canvas}
              selected={index === selectedPageIndex}
            />
          </button>
        ))}
      </div>

      <div className="grid gap-2 border-t pt-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Customize your page set</p>
          <p className="text-xs text-muted-foreground">
            Edit the copy, adjust text size, and download exact-size PNG images.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setWorkspaceOpen(true)}
          >
            <Edit3 data-icon="inline-start" />
            Customize pages
          </Button>
        </div>
      </div>
      <LetterPageWorkspace
        open={workspaceOpen}
        onOpenChange={setWorkspaceOpen}
        letterExport={letterExport}
        letterUuid={letterUuid}
        letterTitle={letterTitle}
        onSaved={onPagesSaved}
      />
    </div>
  );
}

function ExportState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Card className="min-h-64 justify-center py-0 shadow-none">
      <div className="grid justify-items-center gap-3 px-4 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted">
          {icon}
        </span>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="max-w-xs">{description}</CardDescription>
        {children}
      </div>
    </Card>
  );
}

function ExportPreviewSkeleton() {
  return (
    <div className="grid gap-3" aria-label="Loading letter preview">
      <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="aspect-[4/5] min-w-20 rounded-md" />
        <Skeleton className="aspect-[4/5] min-w-20 rounded-md" />
        <Skeleton className="aspect-[4/5] min-w-20 rounded-md" />
      </div>
    </div>
  );
}
