import type { RefObject } from "react";
import { BookOpen, CircleAlert, LoaderCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Resource } from "../type";
import { ResourceListCard } from "./resource-list-card";

type ResourceListResultsProps = {
  archiveDisabled: boolean;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isFiltered: boolean;
  isLoading: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  resources: Resource[];
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
    isFetching,
    isFetchingNextPage,
    isFiltered,
    isLoading,
    loadMoreRef,
    resources,
    onArchive,
    onClearFilters,
    onCreate,
    onLoadMore,
    onOpen,
    onRetry,
  } = props;

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:min-h-full">
      {isLoading && (
        <div className="grid gap-3" role="status" aria-label="Loading resources">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} size="sm" aria-hidden="true">
              <CardHeader className="flex flex-row items-start gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="grid w-full gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardHeader>
              <CardContent className="gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="mt-1 h-5 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {isError && !isFetchNextPageError && (
        <Empty
          className="min-h-64 rounded-xl border bg-card lg:flex-1"
          role="alert"
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlert aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Resources could not be loaded</EmptyTitle>
            <EmptyDescription>
              Try again to refresh your resource library.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              onClick={onRetry}
            >
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {!isLoading && !isError && resources.length === 0 && (
        <Empty className="min-h-64 rounded-xl border bg-card lg:flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {isFiltered ? (
                <Search aria-hidden="true" />
              ) : (
                <BookOpen aria-hidden="true" />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {isFiltered ? "No matching resources" : "Save your first resource"}
            </EmptyTitle>
            <EmptyDescription>
              {isFiltered
                ? "Try another search or clear your filters."
                : "Keep useful notes, links, images, and files in one place."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {isFiltered ? (
              <Button
                variant="outline"
                className="h-11 lg:h-9"
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
            ) : (
              <Button className="h-11 lg:h-9" onClick={onCreate}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                New resource
              </Button>
            )}
          </EmptyContent>
        </Empty>
      )}
      {resources.map((resource) => (
        <ResourceListCard
          key={resource.uuid}
          archiveDisabled={archiveDisabled}
          resource={resource}
          onArchive={onArchive}
          onOpen={onOpen}
        />
      ))}
      {(hasNextPage || isFetchNextPageError) && (
        <div
          ref={loadMoreRef}
          className="flex min-h-11 shrink-0 flex-col items-center justify-center gap-2 py-2"
        >
          {isFetchNextPageError && (
            <p role="alert" className="text-sm text-destructive">
              More resources could not be loaded.
            </p>
          )}
          {hasNextPage && (
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              disabled={isFetching}
              onClick={onLoadMore}
            >
              {isFetchingNextPage && (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              {isFetchingNextPage
                ? "Loading…"
                : isFetchNextPageError
                  ? "Retry loading more"
                  : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
