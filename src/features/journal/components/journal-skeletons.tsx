import { LoadingRegion } from "@/components/shared/loading-region";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the Journal workspace (entry list + editor) while entries load.
export function JournalPageSkeleton() {
  return (
    <div data-page-skeleton="journal" className="flex h-full min-h-0 min-w-0 flex-col">
      <LoadingRegion
        label="Loading journal"
        className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-cols-[18rem_minmax(0,1fr)]"
      >
        <div className="hidden min-h-0 flex-col border-r bg-muted/40 md:flex dark:bg-muted/20">
          <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="size-8 shrink-0" />
          </div>
          <div className="shrink-0 px-3 pb-2">
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="grid content-start gap-0.5 px-2 pb-3">
            <Skeleton className="mx-2 mt-1 mb-2 h-2.5 w-16" />
            {["w-3/4", "w-2/3", "w-4/5", "w-1/2", "w-3/5"].map((width) => (
              <div key={width} className="flex items-start gap-3 rounded-lg px-2 py-2">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="grid flex-1 gap-1.5 pt-0.5">
                  <Skeleton className={`h-3.5 ${width}`} />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
            <Skeleton className="size-8 md:hidden" />
            <span className="px-1 text-sm text-muted-foreground">Journal</span>
          </div>
          <div className="journal-page-header grid content-start gap-3">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-6 grid gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
      </LoadingRegion>
    </div>
  );
}
