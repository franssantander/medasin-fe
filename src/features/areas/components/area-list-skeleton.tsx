import { LoadingRegion } from "@/components/shared/loading-region";
import { PageHeaderSkeleton } from "@/components/shared/page-header-skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Item } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import type { AreaView } from "../area-list-utils";

export function AreaCardSkeleton() {
  return (
    <Card className="gap-0 py-0" aria-hidden="true">
      <Skeleton className="aspect-16/7 rounded-none" />
      <CardContent className="gap-2 px-5 pb-4">
        <Skeleton className="relative z-1 -mt-6 mb-2 size-12 rounded-xl ring-4 ring-card" />
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
      <CardFooter className="border-t px-5 py-3">
        <Skeleton className="h-3 w-28" />
      </CardFooter>
    </Card>
  );
}

export function AreaListItemSkeleton() {
  return (
    <Item variant="outline" className="flex-nowrap bg-card" aria-hidden="true">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </Item>
  );
}

export function AreaListSkeleton({ view }: { view: AreaView }) {
  const items = [1, 2, 3, 4, 5, 6];

  return (
    <LoadingRegion label="Loading areas" className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 min-w-0 flex-1 basis-56 sm:max-w-sm" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-9 sm:w-24" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-[4.5rem]" />
        </div>
      </div>
      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <AreaCardSkeleton key={item} />
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => (
            <AreaListItemSkeleton key={item} />
          ))}
        </div>
      )}
    </LoadingRegion>
  );
}

export function AreasPageSkeleton() {
  return (
    <div data-page-skeleton="areas" className="grid gap-6">
      <PageHeaderSkeleton titleWidth="w-16" badge descriptionWidth="w-[36rem]" actions={["w-28"]} />
      <AreaListSkeleton view="grid" />
    </div>
  );
}
