import type { RefObject } from "react";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Resource } from "../type";
import { ResourceListCard } from "./resource-list-card";

type ResourceListResultsProps = {
  archiveDisabled: boolean;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  isFiltered: boolean;
  isLoading: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  resources: Resource[];
  total?: number;
  onArchive: (resource: Resource) => void;
  onClearFilters: () => void;
  onCreate: () => void;
  onLoadMore: () => void;
  onOpen: (resource: Resource) => void;
  onRetry: () => void;
};

export function ResourceListResults(props: ResourceListResultsProps) {
  const {
    archiveDisabled,
    hasNextPage,
    isError,
    isFetchNextPageError,
    isFetchingNextPage,
    isFiltered,
    isLoading,
    loadMoreRef,
    resources,
    total,
    onArchive,
    onClearFilters,
    onCreate,
    onLoadMore,
    onOpen,
    onRetry,
  } = props;

  return (
    <>
      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-64 rounded-xl" />
          ))}
        </div>
      )}
      {isError && !isFetchNextPageError && (
        <Card className="items-center p-6 text-center">
          <p>Resources could not be loaded.</p>
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </Card>
      )}
      {!isLoading && !isError && resources.length === 0 && (
        <Card className="items-center px-6 py-14 text-center">
          <BookOpen className="size-8 text-muted-foreground" />
          <CardTitle>
            {isFiltered ? "No matching resources" : "Save your first resource"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isFiltered
              ? "Try another search or clear your filters."
              : "Keep useful notes, links, images, and files in one place."}
          </p>
          {isFiltered ? (
            <Button variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button onClick={onCreate}>
              <Plus />
              New resource
            </Button>
          )}
        </Card>
      )}
      {resources.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium" aria-live="polite">
            {total === undefined
              ? `${resources.length} resources`
              : `${total} resource${total === 1 ? "" : "s"}`}
          </p>
          {total !== undefined && resources.length < total && (
            <p className="text-xs text-muted-foreground">
              Showing {resources.length}
            </p>
          )}
        </div>
      )}
      <div className="grid gap-4">
        {resources.map((resource) => (
          <ResourceListCard
            key={resource.uuid}
            archiveDisabled={archiveDisabled}
            resource={resource}
            onArchive={onArchive}
            onOpen={onOpen}
          />
        ))}
      </div>
      <div
        ref={loadMoreRef}
        className="flex min-h-10 flex-col items-center gap-2"
      >
        {isFetchNextPageError && (
          <p role="alert" className="text-sm text-destructive">
            More resources could not be loaded.
          </p>
        )}
        {hasNextPage && (
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={onLoadMore}
          >
            {isFetchingNextPage
              ? "Loading…"
              : isFetchNextPageError
                ? "Retry loading more"
                : "Load more"}
          </Button>
        )}
      </div>
    </>
  );
}
