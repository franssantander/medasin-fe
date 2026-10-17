import { LoadingRegion } from "@/components/shared/loading-region";
import { PageHeaderSkeleton } from "@/components/shared/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Month grid on larger screens, the agenda list the calendar opens with on
// phones.
export function CalendarSkeleton() {
  return (
    <LoadingRegion
      label="Loading calendar"
      className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs"
    >
      <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="size-8 shrink-0" />
          <Skeleton className="size-8 shrink-0" />
          <Skeleton className="h-4.5 w-36" />
          <Skeleton className="ml-auto h-8 w-16 sm:ml-1" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg sm:w-72" />
      </div>
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 border-b">
          {Array.from({ length: 7 }, (_, day) => (
            <div key={day} className="flex justify-center py-2">
              <Skeleton className="h-2.5 w-7" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }, (_, cell) => (
            <div
              key={cell}
              className={cn(
                "flex h-24 flex-col items-end gap-1.5 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0",
              )}
            >
              <Skeleton className="h-3 w-4" />
              {cell % 5 === 1 && <Skeleton className="h-4 w-full rounded" />}
              {cell % 9 === 3 && <Skeleton className="h-4 w-3/4 rounded" />}
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-0 sm:hidden">
        {[3, 2, 1].map((events, day) => (
          <div key={day} className="border-b last:border-b-0">
            <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            {Array.from({ length: events }, (_, item) => (
              <div key={item} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="size-1.5 rounded-full" />
                <Skeleton className={cn("h-3.5", item % 2 ? "w-28" : "w-40")} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function UpcomingPlansSkeleton() {
  return (
    <LoadingRegion label="Loading upcoming plans" className="grid gap-4 p-4">
      {[0, 1].map((group) => (
        <div key={group} className="grid gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ))}
    </LoadingRegion>
  );
}

function UpcomingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 lg:self-start">
      <div className="grid gap-2 border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>
      <UpcomingPlansSkeleton />
    </div>
  );
}

export function PlansPageSkeleton() {
  return (
    <div data-page-skeleton="plans" className="mx-auto grid w-full max-w-[110rem] gap-6">
      <PageHeaderSkeleton titleWidth="w-16" descriptionWidth="w-80" actions={["w-28"]} />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid min-w-0 gap-3 self-start">
          <CalendarSkeleton />
        </div>
        <UpcomingCardSkeleton />
      </div>
    </div>
  );
}
