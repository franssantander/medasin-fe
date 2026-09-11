"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
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
  LetterExport,
  LetterExportFormat,
  LetterPage,
} from "../type";
import { LetterPagePreview, LetterPageThumbnail } from "./letter-page-preview";

const FORMAT_DETAILS: Record<
  LetterExportFormat,
  { label: string; ratio: string; width: number; height: number }
> = {
  portrait: {
    label: "Portrait",
    ratio: "4:5",
    width: 1080,
    height: 1350,
  },
  square: {
    label: "Square",
    ratio: "1:1",
    width: 1080,
    height: 1080,
  },
};

export function LetterExportPanel({
  letterUuid,
  latestExport,
  activeExportUuid,
  onExport,
  exportPending = false,
  hasUnsavedChanges = false,
}: {
  letterUuid?: string;
  latestExport?: LetterExport | null;
  activeExportUuid?: string;
  onExport: (format: LetterExportFormat) => Promise<void>;
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

  const handlePrepare = async () => {
    setPreparationError("");
    setPreparing(true);
    try {
      await onExport(format);
    } catch (error) {
      setPreparationError(
        error instanceof Error
          ? error.message
          : "The pages could not be prepared.",
      );
    } finally {
      setPreparing(false);
    }
  };

  const formatDetails = FORMAT_DETAILS[format];

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
          onValueChange={(value) => setFormat(value as LetterExportFormat)}
        >
          <SelectTrigger size="sm" aria-label="Export format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="portrait">Portrait (4:5)</SelectItem>
              <SelectItem value="square">Square (1:1)</SelectItem>
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
        ) : !currentExport && exportQuery.isLoading ? (
          <ExportPreviewSkeleton />
        ) : !currentExport ? (
          <ExportState
            icon={<FileText className="size-5 text-muted-foreground" />}
            title="Prepare your first page set"
            description={`Choose ${formatDetails.label.toLowerCase()} pages at ${formatDetails.width} × ${formatDetails.height}px, then review the generated split here.`}
          />
        ) : currentExport.status === "failed" ? (
          <ExportState
            icon={<AlertTriangle className="size-5 text-destructive" />}
            title="Page preparation failed"
            description={
              currentExport.error ||
              "Something went wrong while preparing these pages."
            }
          />
        ) : currentExport.status !== "ready" || !isReady ? (
          <ExportState
            icon={<LoaderCircle className="size-5 animate-spin text-muted-foreground" />}
            title="Preparing pages..."
            description="Your page set is being prepared. This panel will update automatically."
          />
        ) : (
          <ReadyExport
            key={exportUuid}
            letterExport={currentExport}
            pages={pages}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        )}
      </div>

      {preparationError && (
        <p role="alert" className="mt-3 shrink-0 text-sm text-destructive">
          {preparationError}
        </p>
      )}

      <div className="mt-4 flex shrink-0 flex-col gap-2 border-t pt-3">
        <Button
          type="button"
          className="w-full"
          disabled={isPreparing}
          aria-busy={isPreparing}
          onClick={() => void handlePrepare()}
        >
          {isPreparing ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          {isPreparing ? "Preparing..." : "Prepare pages"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {currentExport?.status === "ready"
            ? `${currentExport.page_count ?? pages.length} ${pages.length === 1 ? "page" : "pages"} · Prepared as ${FORMAT_DETAILS[currentExport.format].label} ${FORMAT_DETAILS[currentExport.format].ratio}`
            : `${formatDetails.width} × ${formatDetails.height}px canvas`}
        </p>
      </div>
    </section>
  );
}

function ReadyExport({
  letterExport,
  pages,
  hasUnsavedChanges,
}: {
  letterExport: LetterExport;
  pages: LetterPage[];
  hasUnsavedChanges: boolean;
}) {
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
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
            This preview does not include your latest edits. Prepare pages
            again to include them.
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

      <LetterPagePreview page={selectedPage} letterExport={letterExport} />

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
              letterExport={letterExport}
              selected={index === selectedPageIndex}
            />
          </button>
        ))}
      </div>

      <div className="grid gap-2 border-t pt-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Share-ready images</p>
          <p className="text-xs text-muted-foreground">
            Image downloads will be available when the renderer is connected.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            <Download data-icon="inline-start" />
            Download images
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            title="Manual page breaks are coming later."
          >
            Edit page breaks
          </Button>
        </div>
      </div>
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
