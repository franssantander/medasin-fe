"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useLetterStudioExport } from "../hooks/use-letter-studio-export";
import { LETTER_EXPORT_FORMATS } from "../letter-export-formats";
import { letterDisplayTitle } from "../letter-format";
import { useLetterQuery } from "../queries/letter-query";
import type { Letter, LetterExportFormat } from "../type";
import { LetterStudio } from "./letter-studio";
import { LetterStudioTopbar } from "./letter-studio-topbar";

export function LetterStudioPage({
  letterUuid,
  initialFormat,
}: {
  letterUuid: string;
  initialFormat?: LetterExportFormat;
}) {
  const detailQuery = useLetterQuery(letterUuid);
  const letter = detailQuery.data?.data;

  if (letter?.uuid === letterUuid) {
    return <LetterStudioSession letter={letter} initialFormat={initialFormat} />;
  }

  if (detailQuery.isError) {
    return (
      <div className="flex h-full flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center border-b px-2 sm:px-4">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/letters" />}
          >
            <ArrowLeft data-icon="inline-start" />
            Letters
          </Button>
        </header>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Letter could not be opened</EmptyTitle>
            <EmptyDescription>
              This letter may have been removed or is unavailable.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => void detailQuery.refetch()}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background" aria-label="Loading studio">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-28" />
      </div>
      <StudioCanvasPlaceholder />
    </div>
  );
}

function LetterStudioSession({
  letter,
  initialFormat,
}: {
  letter: Letter;
  initialFormat?: LetterExportFormat;
}) {
  const router = useRouter();
  const studio = useLetterStudioExport({ letter, initialFormat });
  const letterTitle = letterDisplayTitle(letter.title);
  const formatDetails = LETTER_EXPORT_FORMATS[studio.format];

  if (studio.readyExport) {
    return (
      <LetterStudio
        key={studio.readyExport.uuid}
        letterExport={studio.readyExport}
        letterUuid={letter.uuid}
        letterTitle={letterTitle}
        format={studio.format}
        formatDisabled={studio.isPreparing}
        onFormatChange={studio.setFormat}
        stale={studio.isStale}
        staleError={studio.error || undefined}
        onRetry={studio.retry}
      />
    );
  }

  const failed = studio.phase === "failed" || studio.phase === "error";

  return (
    <section
      aria-label="Letter studio"
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <LetterStudioTopbar
        letterTitle={letterTitle}
        format={studio.format}
        formatDisabled={studio.isPreparing}
        onFormatChange={studio.setFormat}
        onBack={() => router.push(`/letters/${letter.uuid}`)}
        status={failed ? "Needs attention" : "Arranging pages…"}
      />
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/50 p-6">
        {failed ? (
          <Empty className="max-w-md rounded-xl border bg-background shadow-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
                <AlertTriangle />
              </EmptyMedia>
              <EmptyTitle>
                {studio.phase === "failed"
                  ? "Page rendering failed"
                  : "Pages could not be prepared"}
              </EmptyTitle>
              <EmptyDescription role="alert">{studio.error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" onClick={studio.retry}>
                <RefreshCw data-icon="inline-start" />
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col items-center gap-5" aria-live="polite">
            <div
              className="relative w-[min(18rem,60vw)] overflow-hidden rounded-xl bg-background shadow-xl ring-1 ring-black/5"
              style={{
                aspectRatio: `${formatDetails.width} / ${formatDetails.height}`,
                maxHeight: "55dvh",
              }}
            >
              <div className="flex h-full flex-col gap-3 p-[10%]">
                <Skeleton className="h-2 w-1/4" />
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Arranging your {formatDetails.name.toLowerCase()} pages at{" "}
              {formatDetails.width} × {formatDetails.height}px…
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function StudioCanvasPlaceholder() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/50 p-6">
      <Skeleton className="aspect-[4/5] w-[min(18rem,60vw)] rounded-xl" />
    </div>
  );
}
