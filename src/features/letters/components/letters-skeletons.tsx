import { LoadingRegion } from "@/components/shared/loading-region";
import { PageHeaderSkeleton } from "@/components/shared/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const titleWidths = ["w-2/3", "w-1/2", "w-3/5", "w-2/5"];

// Shaped like the library toolbar (tabs + search) and letter rows.
export function LibrarySkeleton() {
  return (
    <LoadingRegion label="Loading letters" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 border-b sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-4 pb-2.5">
          {["w-10", "w-14", "w-12"].map((width) => (
            <Skeleton key={width} className={`h-5 ${width}`} />
          ))}
        </div>
        <Skeleton className="mb-2 h-9 w-full sm:w-72" />
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {titleWidths.map((width, item) => (
          <div key={item} className="flex items-start gap-4 px-4 py-4 sm:px-5">
            <div className="grid min-w-0 flex-1 gap-1.5">
              <div className="flex h-5.5 items-center">
                <Skeleton className={`h-4 ${width}`} />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <div className="mt-1 flex items-center gap-2">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="size-8 shrink-0" />
            <Skeleton className="hidden aspect-[4/3] w-24 shrink-0 rounded-md sm:block" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function LettersPageSkeleton() {
  return (
    <div data-page-skeleton="letters" className="grid min-w-0 gap-6 pb-10">
      <PageHeaderSkeleton titleWidth="w-20" descriptionWidth="w-80" actions={["w-32"]} />
      <LibrarySkeleton />
    </div>
  );
}
