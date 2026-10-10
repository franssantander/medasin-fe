"use client";

import { useId } from "react";
import { Filter, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useResourceList } from "../hooks/use-resource-list";
import { useResourceQuery } from "../queries/resource-query";
import { ResourceActionDialog } from "./resource-action-dialog";
import { ResourceDetailDialog } from "./resource-detail-dialog";
import { ResourceFormDialog } from "./resource-form-dialog";
import { ResourceListFilters } from "./resource-list-filters";
import { resourceTypeOptions } from "./resource-list-options";
import { ResourceListResults } from "./resource-list-results";

export function ResourceList({
  initialResourceUuid,
}: {
  initialResourceUuid?: string;
}) {
  const router = useRouter();
  const searchId = useId();
  const { resultsScrollRef, ...list } = useResourceList();
  const linkedResourceQuery = useResourceQuery(initialResourceUuid);
  const query = list.resourcesQuery;
  const showLinkedResource = Boolean(
    initialResourceUuid && !list.selected && !list.creating && !list.archiving && !list.deleting,
  );
  const closeLinkedResource = () => router.replace("/resources");
  const selectedTypeLabel = list.type
    ? resourceTypeOptions.find((item) => item.value === list.type)?.label ??
    list.type
    : undefined;
  const total = query.data?.pages[0].data.total;
  const resourceCount = total ?? list.resources.length;
  const filterProps = {
    selectedTag: list.tag,
    selectedType: list.type,
    tags: list.tagsQuery.data?.data,
    tagsError: list.tagsQuery.isError,
    tagsLoading: list.tagsQuery.isLoading,
    onRetryTags: () => {
      void list.tagsQuery.refetch();
    },
    onTagChange: list.setTag,
    onTypeChange: list.setType,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-5 lg:h-full lg:overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Resources"
          description="Keep notes, links, images, and files organized in one searchable place."
          action={
            <Button className="h-11 lg:h-9" onClick={() => list.setCreating(true)}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              New resource
            </Button>
          }
        />
      </div>

      <div className="grid min-w-0 gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[15rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="hidden min-h-0 min-w-0 lg:flex">
          <ResourceListFilters {...filterProps} />
        </div>
        <section className="flex min-w-0 flex-col gap-3 lg:min-h-0" aria-label="Resources">
          <Card size="sm" className="shrink-0 gap-3">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-2">
                <FieldGroup className="min-w-0 flex-1">
                  <Field>
                    <FieldLabel htmlFor={searchId} className="sr-only">
                      Search resources
                    </FieldLabel>
                    <InputGroup className="h-11 lg:h-9">
                      <InputGroupInput
                        id={searchId}
                        type="search"
                        className="h-11 lg:h-9"
                        placeholder="Search resources…"
                        maxLength={255}
                        value={list.search}
                        onChange={(event) => list.setSearch(event.target.value)}
                      />
                      <InputGroupAddon>
                        <Search aria-hidden="true" />
                      </InputGroupAddon>
                      <InputGroupAddon align="inline-end" className="w-8">
                        {list.search && query.isFetching && !query.isFetchingNextPage ? (
                          <>
                            <LoaderCircle
                              className="animate-spin motion-reduce:animate-none"
                              aria-hidden="true"
                            />
                            <span className="sr-only" role="status">
                              Searching resources
                            </span>
                          </>
                        ) : null}
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                </FieldGroup>
                <Sheet>
                  <SheetTrigger
                    render={
                      <Button
                        variant="outline"
                        className="h-11 min-w-11 lg:hidden"
                        aria-label="Filter resources"
                      />
                    }
                  >
                    <Filter data-icon="inline-start" aria-hidden="true" />
                    <span className="hidden sm:inline">Filters</span>
                    {list.activeFilterCount > 0 && (
                      <Badge className="h-5 min-w-5 px-1.5">
                        {list.activeFilterCount}
                      </Badge>
                    )}
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-[min(22rem,90vw)] gap-0 [&_[data-slot=sheet-close]]:size-11"
                  >
                    <SheetHeader className="shrink-0 border-b pr-16">
                      <SheetTitle>Filter resources</SheetTitle>
                      <SheetDescription>
                        Narrow the library by resource type or tag.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="workspace-list-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                      <ResourceListFilters {...filterProps} presentation="sheet" />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-stretch gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium" aria-live="polite" aria-atomic="true">
                  {query.isLoading
                    ? "Loading resources…"
                    : query.data
                      ? `${resourceCount} resource${resourceCount === 1 ? "" : "s"}`
                      : "Resources"}
                </p>
                {total !== undefined && list.resources.length < total && (
                  <p className="text-xs text-muted-foreground">
                    Showing {list.resources.length}
                  </p>
                )}
              </div>
              {list.isFiltered && (
                <div
                  className="flex flex-wrap items-center gap-2"
                  aria-label="Active filters"
                >
                  {selectedTypeLabel && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 max-w-full lg:h-7"
                      aria-label={`Remove type filter: ${selectedTypeLabel}`}
                      onClick={() => list.setType(undefined)}
                    >
                      <span className="min-w-0 truncate">
                        Type: {selectedTypeLabel}
                      </span>
                      <X data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  )}
                  {list.selectedTag && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 max-w-full lg:h-7"
                      aria-label={`Remove tag filter: ${list.selectedTag.name}`}
                      onClick={() => list.setTag(undefined)}
                    >
                      <span className="min-w-0 max-w-48 truncate" title={list.selectedTag.name}>
                        Tag: {list.selectedTag.name}
                      </span>
                      <X data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  )}
                  {list.search && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 max-w-full lg:h-7"
                      aria-label="Clear search"
                      onClick={() => list.setSearch("")}
                    >
                      Search:
                      <span className="min-w-0 max-w-32 truncate" title={list.search}>
                        {list.search}
                      </span>
                      <X data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 lg:h-7"
                    onClick={list.clearFilters}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
          <div
            ref={resultsScrollRef}
            className="workspace-list-scrollbar min-w-0 p-1 lg:min-h-0 lg:flex-1 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain"
          >
            <ResourceListResults
              archiveDisabled={list.archiveResource.isPending || list.deleteResource.isPending}
              deleteDisabled={list.archiveResource.isPending || list.deleteResource.isPending}
              hasNextPage={Boolean(query.hasNextPage)}
              isError={query.isError}
              isFetchNextPageError={query.isFetchNextPageError}
              isFetching={query.isFetching}
              isFetchingNextPage={query.isFetchingNextPage}
              isFiltered={list.isFiltered}
              isLoading={query.isLoading}
              loadMoreRef={list.loadMoreRef}
              resources={list.resources}
              onArchive={list.setArchiving}
              onDelete={list.setDeleting}
              onClearFilters={list.clearFilters}
              onCreate={() => list.setCreating(true)}
              onLoadMore={() => {
                if (query.hasNextPage && !query.isFetching) {
                  void query.fetchNextPage();
                }
              }}
              onOpen={list.setSelected}
              onRetry={() => query.refetch()}
            />
          </div>
        </section>
      </div>
      {list.creating && (
        <ResourceFormDialog onClose={() => list.setCreating(false)} />
      )}
      {list.selected && (
        <ResourceDetailDialog
          resource={list.selected}
          onClose={() => list.setSelected(undefined)}
        />
      )}
      {showLinkedResource && linkedResourceQuery.data?.data ? (
        <ResourceDetailDialog
          key={initialResourceUuid}
          resource={linkedResourceQuery.data.data}
          onClose={closeLinkedResource}
        />
      ) : showLinkedResource ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) closeLinkedResource();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {linkedResourceQuery.isError
                  ? "Resource could not be loaded"
                  : "Opening resource"}
              </DialogTitle>
              <DialogDescription role={linkedResourceQuery.isError ? "alert" : undefined}>
                {linkedResourceQuery.isError
                  ? linkedResourceQuery.error instanceof Error
                    ? linkedResourceQuery.error.message
                    : "The resource could not be loaded. Try again."
                  : "Loading resource details…"}
              </DialogDescription>
            </DialogHeader>
            {!linkedResourceQuery.isError && (
              <div className="grid gap-3" role="status" aria-label="Loading resource">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeLinkedResource}>
                Close
              </Button>
              {linkedResourceQuery.isError && (
                <Button onClick={() => void linkedResourceQuery.refetch()}>
                  Try again
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
      <ResourceActionDialog
        resource={list.archiving}
        isPending={list.archiveResource.isPending}
        onOpenChange={(open) => {
          if (!open && !list.archiveResource.isPending) {
            list.setArchiving(undefined);
          }
        }}
        onConfirm={list.confirmArchive}
      />
      <ResourceActionDialog
        action="delete"
        resource={list.deleting}
        isPending={list.deleteResource.isPending}
        onOpenChange={(open) => { if (!open) list.setDeleting(undefined); }}
        onConfirm={list.confirmDelete}
      />
    </div>
  );
}
