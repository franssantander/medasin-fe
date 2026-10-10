import { LoadingRegion } from "@/components/shared/loading-region";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ResourceView } from "../hooks/use-resource-list";

// Loading placeholders shaped like the real Resources components, so content
// swaps in without the layout jumping.

const titleWidths = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/4"];
const previewWidths = ["w-4/5", "w-2/3", "w-3/4", "w-1/2", "w-3/5", "w-5/6"];
const tagWidths = ["w-20", "w-14", "w-16", "w-12"];

function ResourceCardSkeleton({ index }: { index: number }) {
  return (
    <Card size="sm" className="h-full gap-0 p-0 shadow-none">
      <div className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="grid min-w-0 flex-1 gap-2 pt-0.5">
            <Skeleton className={cn("h-4", titleWidths[index % titleWidths.length])} />
            <div className="flex gap-2.5">
              <Skeleton className="h-3 w-12" />
              {index % 2 === 0 && <Skeleton className="h-3 w-10" />}
            </div>
          </div>
          <Skeleton className="-mr-1 size-7 shrink-0" />
        </div>
        <div className="grid gap-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className={cn("h-3.5", previewWidths[index % previewWidths.length])} />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className={cn("h-5 rounded-full", tagWidths[index % tagWidths.length])} />
          {index % 3 !== 2 && (
            <Skeleton className={cn("h-5 rounded-full", tagWidths[(index + 1) % tagWidths.length])} />
          )}
        </div>
        <div className="mt-auto -mb-1.5 flex min-h-7 items-center gap-2 border-t pt-3">
          {index % 3 !== 1 && <Skeleton className="h-5 w-24 rounded-full" />}
          <Skeleton className="ml-auto h-3 w-12" />
        </div>
      </div>
    </Card>
  );
}

function ResourceRowSkeleton({ index }: { index: number }) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-3 sm:gap-4">
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <Skeleton className={cn("h-3.5", titleWidths[index % titleWidths.length])} />
        <Skeleton className={cn("h-3", previewWidths[index % previewWidths.length])} />
      </div>
      <Skeleton className="hidden size-3.5 shrink-0 sm:block" />
      <div className="hidden w-40 shrink-0 justify-end gap-1 md:flex">
        <Skeleton className={cn("h-5 rounded-full", tagWidths[index % tagWidths.length])} />
      </div>
      <div className="hidden w-20 shrink-0 justify-end lg:flex">
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="hidden w-16 shrink-0 justify-end sm:flex">
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="size-7 shrink-0" />
    </li>
  );
}

export function ResourceListSkeleton({
  view,
  label = "Loading resources",
}: {
  view: ResourceView;
  label?: string;
}) {
  const items = [0, 1, 2, 3, 4, 5];

  return (
    <LoadingRegion label={label}>
      {view === "list" ? (
        <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {items.map((index) => (
            <ResourceRowSkeleton key={index} index={index} />
          ))}
        </ul>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((index) => (
            <li key={index} className="min-w-0">
              <ResourceCardSkeleton index={index} />
            </li>
          ))}
        </ul>
      )}
    </LoadingRegion>
  );
}

export function ResourceTagsSkeleton() {
  return (
    <LoadingRegion label="Loading tags" className="grid gap-0.5">
      {["w-20", "w-24", "w-16", "w-28"].map((width) => (
        <div key={width} className="flex h-8 items-center gap-2.5 px-2.5">
          <Skeleton className="size-3.5 shrink-0" />
          <Skeleton className={cn("h-3.5", width)} />
        </div>
      ))}
    </LoadingRegion>
  );
}

function FieldSkeleton({ labelWidth = "w-16", hint = false }: { labelWidth?: string; hint?: boolean }) {
  return (
    <div className="grid gap-2">
      <Skeleton className={cn("h-3.5", labelWidth)} />
      <Skeleton className="h-9 w-full" />
      {hint && <Skeleton className="h-3 w-3/4" />}
    </div>
  );
}

// Mirrors the body of ResourceDetailDialog (inline title, notes editor,
// links, attachments, and the organization sidebar) so the real dialog
// replaces it without the layout jumping.
export function ResourceDialogBodySkeleton() {
  return (
    <LoadingRegion
      label="Loading resource"
      className="min-h-0 flex-1 overflow-hidden"
    >
      <div className="grid min-h-full min-w-0 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid min-w-0 content-start gap-6 p-5 sm:p-6">
          <Skeleton className="h-8 w-3/5" />
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="grid min-h-56 content-start gap-2.5 rounded-lg border p-4">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <FieldSkeleton labelWidth="w-10" hint />
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
        <div className="grid min-w-0 content-start gap-6 border-t bg-muted/30 p-5 sm:p-6 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
          <div className="grid gap-5 border-t pt-5">
            <div className="grid gap-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-44" />
            </div>
            <FieldSkeleton labelWidth="w-24" hint />
            <FieldSkeleton labelWidth="w-28" />
            <FieldSkeleton labelWidth="w-24" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ResourceImageSkeleton({ name }: { name: string }) {
  return (
    <div role="status" aria-label={`Loading preview of ${name}`} className="absolute inset-0">
      <Skeleton className="size-full rounded-none" />
    </div>
  );
}
