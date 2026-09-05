import { RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
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
      <CardContent className="items-center py-14 text-center">
        <TriangleAlert className="size-7 text-destructive" />
        <CardTitle>Trash could not be loaded</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      </CardContent>
    );
  }

  if (hasData && items.length === 0) {
    return (
      <CardContent className="items-center py-14 text-center">
        <span className="rounded-full bg-muted p-3">
          <Trash2 className="size-6" />
        </span>
        <CardTitle>{isFiltered ? "No matching items" : "Trash is empty"}</CardTitle>
        <CardDescription className="max-w-sm">
          {isFiltered
            ? "Try changing your search or content type filter."
            : "Deleted content will stay here for 30 days before it is permanently removed."}
        </CardDescription>
      </CardContent>
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
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
