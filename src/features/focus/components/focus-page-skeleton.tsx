import { LoadingRegion } from "@/components/shared/loading-region";
import { PageHeaderSkeleton } from "@/components/shared/page-header-skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the Focus page (timer card + task panel) while the dashboard loads.
export function FocusPageSkeleton() {
  return (
    <LoadingRegion
      label="Loading Focus"
      data-page-skeleton="focus"
      className="grid w-full min-w-0 gap-5"
    >
      <PageHeaderSkeleton titleWidth="w-32" descriptionWidth="w-56" actions={["w-24"]} />
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="min-w-0 gap-6">
          <CardHeader className="flex min-w-0 items-center justify-between gap-3">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-3.5 w-20" />
          </CardHeader>
          <CardContent className="items-center gap-6">
            <Skeleton className="h-11 w-full max-w-md rounded-lg" />
            <div className="flex w-full max-w-md flex-col items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="aspect-square w-full max-w-[min(15rem,42dvh)] rounded-full sm:max-w-[min(18rem,42dvh)]" />
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-32 rounded-lg" />
                <Skeleton className="size-10 rounded-lg" />
              </div>
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-6">
              {[0, 1, 2].map((item) => (
                <div key={item} className="grid gap-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-5 w-10" />
                </div>
              ))}
            </div>
            <Skeleton className="h-8 w-full sm:w-36" />
          </CardFooter>
        </Card>
        <Card className="min-w-0 gap-4 [--card-spacing:--spacing(5)]">
          <CardHeader className="flex items-start justify-between gap-3">
            <div className="grid gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="h-8 w-24" />
          </CardHeader>
          <CardContent className="grid gap-3">
            <Skeleton className="h-8 w-full rounded-lg" />
            <div className="grid gap-2 px-1">
              {["w-3/4", "w-1/2", "w-2/3"].map((width) => (
                <div key={width} className="flex items-start gap-2 rounded-lg border p-2">
                  <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                  <div className="grid flex-1 gap-1.5 py-0.5">
                    <Skeleton className={`h-3.5 ${width}`} />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </LoadingRegion>
  );
}
