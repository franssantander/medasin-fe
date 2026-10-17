import { LoadingRegion } from "@/components/shared/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Placeholders shaped like the Home sections, shared by the page's own
// loading state and the workspace loader shown while the user loads.

const rowTitleWidths = ["w-52", "w-40", "w-48", "w-36"];

function SectionHeadingSkeleton({ width = "w-16", link = false }: { width?: string; link?: boolean }) {
  return (
    <div className="flex h-5 items-center justify-between gap-4">
      <Skeleton className={cn("h-3.5", width)} />
      {link && <Skeleton className="h-3 w-12" />}
    </div>
  );
}

export function HomeHeaderSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid min-w-0 gap-1">
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-36" />
        </div>
        <div className="flex h-8 items-center sm:h-9">
          <Skeleton className="h-6 w-64 max-w-full sm:h-7" />
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-56 max-w-full" />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>
  );
}

export function HomeTodaySkeleton() {
  return (
    <div className="grid min-w-0 gap-3">
      <SectionHeadingSkeleton width="w-12" />
      <div className="grid divide-y rounded-xl bg-card ring-1 ring-foreground/10 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="grid content-start gap-3 p-4 sm:p-5">
          <SectionHeadingSkeleton width="w-14" link />
          <div className="grid gap-0.5">
            {["w-3/4", "w-1/2"].map((width) => (
              <div key={width} className="grid min-h-11 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
                <Skeleton className="h-3 w-12" />
                <Skeleton className={cn("h-3.5", width)} />
              </div>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-3 p-4 sm:p-5">
          <SectionHeadingSkeleton width="w-10" link />
          <div className="flex items-end gap-2">
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="grid gap-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeMainSkeleton() {
  return (
    <LoadingRegion label="Loading home" className="grid min-w-0 gap-8">
      <div className="grid gap-3">
        <SectionHeadingSkeleton link />
        <div className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
          {rowTitleWidths.map((width, row) => (
            <div key={row} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="grid min-w-0 flex-1 gap-1.5">
                <Skeleton className={cn("h-3.5 max-w-full", width)} />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex w-20 shrink-0 items-center gap-2.5 sm:w-36">
                <Skeleton className="hidden h-1 flex-1 rounded-full sm:block" />
                <Skeleton className="ml-auto h-3 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <SectionHeadingSkeleton width="w-12" link />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((tile) => (
            <div
              key={tile}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5",
                tile === 2 && "max-xl:hidden",
              )}
            >
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="grid min-w-0 flex-1 gap-1.5">
                <Skeleton className={cn("h-3.5", tile % 2 ? "w-20" : "w-28")} />
                <Skeleton className="h-3 w-32 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function HomeRailSkeleton() {
  return (
    <div className="grid min-w-0 gap-3" aria-hidden="true">
      <SectionHeadingSkeleton />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        {["w-20", "w-10", "w-24", "w-16"].map((width, item) => (
          <div key={item} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-3.5">
            <div className="flex h-4 items-center gap-1.5">
              <Skeleton className="size-3.5 shrink-0 rounded" />
              <Skeleton className={cn("h-3", width)} />
            </div>
            <Skeleton className="h-6 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeToolsSkeleton() {
  return (
    <div className="grid min-w-0 gap-3">
      <SectionHeadingSkeleton width="w-24" />
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 lg:grid-cols-4">
        {Array.from({ length: 7 }, (_, item) => (
          <div key={item} className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border bg-card py-2.5">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <LoadingRegion label="Loading home" data-page-skeleton="home" className="grid w-full min-w-0 gap-6 pb-6">
      <HomeHeaderSkeleton />
      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-8">
          <HomeTodaySkeleton />
          <HomeMainSkeleton />
        </div>
        <div className="grid min-w-0 gap-8">
          <HomeRailSkeleton />
          <HomeToolsSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}
