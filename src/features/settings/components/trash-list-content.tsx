import { RefreshCw, Trash2, TriangleAlert } from "lucide-react";
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
import type { TrashItem } from "../types";
import { TrashListItem } from "./trash-list-item";

type TrashListContentProps = {
  items: TrashItem[];
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  isFiltered: boolean;
  errorMessage?: string;
  busyItemUuid?: string;
  onRetry: () => void;
  onRestore: (item: TrashItem) => void;
  onDelete: (item: TrashItem) => void;
};

export function TrashListContent({
  items,
  isLoading,
  isError,
  hasData,
  isFiltered,
  errorMessage,
  busyItemUuid,
  onRetry,
  onRestore,
  onDelete,
}: TrashListContentProps) {
  if (isLoading) return <TrashListSkeleton />;

  if (isError) {
    return (
      <Empty className="min-h-64 shrink-0 p-5 sm:p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert className="text-destructive" aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Trash could not be loaded</EmptyTitle>
          <EmptyDescription>{errorMessage}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw data-icon="inline-start" /> Try again
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (hasData && items.length === 0) {
    return (
      <Empty className="min-h-64 shrink-0 p-5 sm:p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Trash2 aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            {isFiltered ? "No matching items" : "Trash is empty"}
          </EmptyTitle>
          <EmptyDescription>
            {isFiltered
              ? "Try changing your search or content type filter."
              : "Deleted content will stay here for 30 days before it is permanently removed."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="divide-y">
      {items.map((item) => (
        <TrashListItem
          key={item.uuid}
          item={item}
          busy={busyItemUuid === item.uuid}
          onRestore={() => onRestore(item)}
          onDelete={() => onDelete(item)}
        />
      ))}
    </div>
  );
}

function TrashListSkeleton() {
  return (
    <div className="grid gap-0 divide-y">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="flex gap-3 p-5">
          <Skeleton className="size-9 shrink-0" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
