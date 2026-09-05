"use client";

import { Plus, Search } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResourceList } from "../hooks/use-resource-list";
import { ResourceActionDialog } from "./resource-action-dialog";
import { ResourceDetailDialog } from "./resource-detail-dialog";
import { ResourceFormDialog } from "./resource-form-dialog";
import { ResourceListFilters } from "./resource-list-filters";
import { ResourceListResults } from "./resource-list-results";

export function ResourceList() {
  const list = useResourceList();
  const query = list.resourcesQuery;

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
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <ResourceListFilters
          selectedTag={list.tag}
          selectedType={list.type}
          tags={list.tagsQuery.data?.data}
          tagsError={list.tagsQuery.isError}
          tagsLoading={list.tagsQuery.isLoading}
          onRetryTags={() => list.tagsQuery.refetch()}
          onTagChange={list.setTag}
          onTypeChange={list.setType}
        />
        <section className="grid min-w-0 gap-4" aria-label="Resources">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="bg-background pl-9"
              aria-label="Search resources"
              placeholder="Search resources…"
              maxLength={255}
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          {list.isFiltered && (
            <Button
              variant="ghost"
              className="justify-self-start"
              onClick={list.clearFilters}
            >
              Clear filters
            </Button>
          )}
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
