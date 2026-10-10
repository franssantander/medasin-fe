import type { RefObject } from "react";
import { BookOpen, CircleAlert, LoaderCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ResourceView } from "../hooks/use-resource-list";
import type { Resource } from "../type";
import { ResourceListCard } from "./resource-list-card";
import { ResourceListRow } from "./resource-list-row";
import { ResourceListSkeleton } from "./resource-skeletons";

type ResourceListResultsProps = {
  archiveDisabled: boolean;
  deleteDisabled: boolean;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isFiltered: boolean;
  isLoading: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  resources: Resource[];
  view: ResourceView;
  onArchive: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
  onClearFilters: () => void;
  onCreate: () => void;
  onLoadMore: () => void;
  onOpen: (resource: Resource) => void;
  onRetry: () => void;
};

export function ResourceListResults(props: ResourceListResultsProps) {
  const {
    archiveDisabled,
    deleteDisabled,
    hasNextPage,
    isError,
    isFetchNextPageError,
    isFetching,
    isFetchingNextPage,
    isFiltered,
    isLoading,
    loadMoreRef,
    resources,
    view,
    onArchive,
    onDelete,
    onClearFilters,
    onCreate,
    onLoadMore,
    onOpen,
    onRetry,
  } = props;
  const actions = { archiveDisabled, deleteDisabled, onArchive, onDelete, onOpen };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {isLoading && <ResourceListSkeleton view={view} />}
      {isError && !isFetchNextPageError && (
        <Empty
          className="min-h-72 rounded-xl border border-dashed"
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
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {!isLoading && !isError && resources.length === 0 && (
        <Empty className="min-h-72 rounded-xl border border-dashed">
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
              <Button variant="outline" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button onClick={onCreate}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                New resource
              </Button>
            )}
          </EmptyContent>
        </Empty>
      )}
      {resources.length > 0 &&
        (view === "list" ? (
          <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {resources.map((resource) => (
              <ResourceListRow
                key={resource.uuid}
                resource={resource}
                {...actions}
              />
            ))}
          </ul>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => (
              <li key={resource.uuid} className="min-w-0">
                <ResourceListCard resource={resource} {...actions} />
              </li>
            ))}
          </ul>
        ))}
      {(hasNextPage || isFetchNextPageError) && (
        <div
          ref={loadMoreRef}
          className="flex min-h-11 flex-col items-center justify-center gap-2 py-2"
        >
          {isFetchNextPageError && (
            <p role="alert" className="text-sm text-destructive">
              More resources could not be loaded.
            </p>
          )}
          {hasNextPage && (
            <Button
              variant="outline"
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
