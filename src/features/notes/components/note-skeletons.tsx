import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function NotePageTopbarSkeleton({ leading }: { leading?: ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
      {leading}
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export function NoteDocumentSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="notes-page-header grid gap-3"
    >
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-3 w-40" />
      <div className="mt-6 grid gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function NotePagesSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading notes"
      className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-cols-[16rem_minmax(0,1fr)]"
    >
      <div className="hidden gap-2 border-r bg-muted/30 p-3 md:grid md:content-start">
        <Skeleton className="mb-2 h-5 w-20" />
        <Skeleton className="mb-2 h-8 w-full" />
        {[85, 70, 90, 60, 75, 65].map((width) => (
          <Skeleton key={width} className="h-6" style={{ width: `${width}%` }} />
        ))}
      </div>
      <div className="flex min-h-0 flex-col">
        <NotePageTopbarSkeleton />
        <NoteDocumentSkeleton />
      </div>
    </div>
  );
}

export function NoteListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading notes"
      className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-cols-[20rem_minmax(0,1fr)]"
    >
      <div className="hidden content-start gap-3 border-r bg-muted/30 px-3 pt-4 md:grid">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="size-7 rounded-md" />
        </div>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="mt-2 ml-2 h-3 w-14" />
        {["w-32", "w-44", "w-28", "w-40", "w-36"].map((width) => (
          <div key={width} className="grid gap-2 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className={cn("h-3.5", width)} />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-col">
        <NotePageTopbarSkeleton />
        <NoteDocumentSkeleton />
      </div>
    </div>
  );
}

export function NotesPageSkeleton() {
  return (
    <div data-page-skeleton="notes" className="h-full min-h-0 min-w-0">
      <NoteListSkeleton />
    </div>
  );
}
