"use client";

import { Filter, LoaderCircle, Plus, Search, X } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useResourceList } from "../hooks/use-resource-list";
import { ResourceActionDialog } from "./resource-action-dialog";
import { ResourceDetailDialog } from "./resource-detail-dialog";
import { ResourceFormDialog } from "./resource-form-dialog";
import { ResourceListFilters } from "./resource-list-filters";
import { ResourceListResults } from "./resource-list-results";

export function ResourceList() {
  const list = useResourceList();
  const query = list.resourcesQuery;
  const selectedTypeLabel = list.type
    ? list.type.charAt(0).toUpperCase() + list.type.slice(1)
    : undefined;

  const filters = (
    <ResourceListFilters
      selectedTag={list.tag}
      selectedType={list.type}
      tags={list.tagsQuery.data?.data}
      tagsError={list.tagsQuery.isError}
      tagsLoading={list.tagsQuery.isLoading}
      className="border-0 bg-transparent p-0 shadow-none"
      onRetryTags={() => list.tagsQuery.refetch()}
      onTagChange={list.setTag}
      onTypeChange={list.setType}
    />
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Resources"
        action={
          <Button onClick={() => list.setCreating(true)}>
            <Plus />
            New resource
          </Button>
        }
      />
      <p className="-mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
        Keep notes, links, images, and files organized in one searchable place.
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <ResourceListFilters
            selectedTag={list.tag}
            selectedType={list.type}
            tags={list.tagsQuery.data?.data}
            tagsError={list.tagsQuery.isError}
            tagsLoading={list.tagsQuery.isLoading}
            className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain"
            onRetryTags={() => list.tagsQuery.refetch()}
            onTagChange={list.setTag}
            onTypeChange={list.setType}
          />
        </div>
        <section className="grid min-w-0 gap-4" aria-label="Resources">
          <div className="grid gap-3 rounded-xl border bg-card p-3 shadow-xs sm:p-4">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search resources</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  className="bg-background pl-9 pr-9"
                  placeholder="Search resources…"
                  maxLength={255}
                  value={list.search}
                  onChange={(event) => list.setSearch(event.target.value)}
                />
                {list.search &&
                  query.isFetching &&
                  !query.isFetchingNextPage && (
                    <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
              </label>
              <Sheet>
                <SheetTrigger
                  render={<Button variant="outline" className="lg:hidden" />}
                >
                  <Filter />
                  <span className="hidden sm:inline">Filters</span>
                  {list.activeFilterCount > 0 && (
                    <Badge className="h-5 min-w-5 px-1.5">
                      {list.activeFilterCount}
                    </Badge>
                  )}
                </SheetTrigger>
                <SheetContent side="right" className="w-[min(22rem,90vw)]">
                  <SheetHeader className="border-b">
                    <SheetTitle>Filter resources</SheetTitle>
                    <SheetDescription>
                      Narrow the library by resource type or tag.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {filters}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            {list.isFiltered && (
              <div
                className="flex flex-wrap items-center gap-2"
                aria-label="Active filters"
              >
                {selectedTypeLabel && (
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => list.setType(undefined)}
                  >
                    Type: {selectedTypeLabel}
                    <X />
                    <span className="sr-only">Remove type filter</span>
                  </Button>
                )}
                {list.selectedTag && (
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => list.setTag(undefined)}
                  >
                    Tag: {list.selectedTag.name}
                    <X />
                    <span className="sr-only">Remove tag filter</span>
                  </Button>
                )}
                {list.search && (
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => list.setSearch("")}
                  >
                    Search:
                    <span className="max-w-32 truncate">{list.search}</span>
                    <X />
                    <span className="sr-only">Clear search</span>
                  </Button>
                )}
                <Button size="xs" variant="ghost" onClick={list.clearFilters}>
                  Clear all
                </Button>
              </div>
            )}
          </div>
          <ResourceListResults
            archiveDisabled={list.archiveResource.isPending}
            hasNextPage={Boolean(query.hasNextPage)}
            isError={query.isError}
            isFetchNextPageError={query.isFetchNextPageError}
            isFetchingNextPage={query.isFetchingNextPage}
            isFiltered={list.isFiltered}
            isLoading={query.isLoading}
            loadMoreRef={list.loadMoreRef}
            resources={list.resources}
            total={query.data?.pages[0].data.total}
            onArchive={list.setArchiving}
            onClearFilters={list.clearFilters}
            onCreate={() => list.setCreating(true)}
            onLoadMore={() => query.fetchNextPage()}
            onOpen={list.setSelected}
            onRetry={() => query.refetch()}
          />
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
    </div>
  );
}
