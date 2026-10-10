"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useResourceList } from "../hooks/use-resource-list";
import { useResourceQuery } from "../queries/resource-query";
import { ResourceActionDialog } from "./resource-action-dialog";
import { ResourceDetailDialog } from "./resource-detail-dialog";
import { ResourceFormDialog } from "./resource-form-dialog";
import { ResourceListFilters } from "./resource-list-filters";
import { ResourceListResults } from "./resource-list-results";
import { ResourceListToolbar } from "./resource-list-toolbar";
import { ResourceOpeningDialog } from "./resource-opening-dialog";

export function ResourceList({
  initialResourceUuid,
}: {
  initialResourceUuid?: string;
}) {
  const router = useRouter();
  const { loadMoreRef, resultsRef, ...list } = useResourceList();
  const linkedResourceQuery = useResourceQuery(initialResourceUuid);
  const query = list.resourcesQuery;
  const showLinkedResource = Boolean(
    initialResourceUuid && !list.selected && !list.creating && !list.archiving && !list.deleting,
  );
  const closeLinkedResource = () => router.replace("/resources");
  const total = query.data?.pages[0].data.total;
  const resourceCount = total ?? list.resources.length;
  const countLabel = query.isLoading
    ? "Loading resources…"
    : query.data
      ? `${resourceCount} resource${resourceCount === 1 ? "" : "s"}`
      : "Resources";
  const shownLabel =
    total !== undefined && list.resources.length < total
      ? `showing ${list.resources.length}`
      : undefined;
  const actionsPending =
    list.archiveResource.isPending || list.deleteResource.isPending;
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
    <div className="grid min-w-0 gap-6">
      <PageHeader
        title="Resources"
        description="Keep notes, links, images, and files organized in one searchable place."
        action={
          <Button onClick={() => list.setCreating(true)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            New resource
          </Button>
        }
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="hidden min-w-0 lg:sticky lg:top-6 lg:block">
          <ResourceListFilters {...filterProps} />
        </div>
        <section
          ref={resultsRef}
          className="grid min-w-0 scroll-mt-4 gap-5"
          aria-label="Resources"
        >
          <ResourceListToolbar
            search={list.search}
            isSearching={list.isSearching}
            view={list.view}
            type={list.type}
            selectedTag={list.selectedTag}
            activeFilterCount={list.activeFilterCount}
            isFiltered={list.isFiltered}
            countLabel={countLabel}
            shownLabel={shownLabel}
            filterProps={filterProps}
            onSearchChange={list.setSearch}
            onViewChange={list.setView}
            onTypeChange={list.setType}
            onTagChange={list.setTag}
            onClearFilters={list.clearFilters}
          />
          <ResourceListResults
            archiveDisabled={actionsPending}
            deleteDisabled={actionsPending}
            hasNextPage={Boolean(query.hasNextPage)}
            isError={query.isError}
            isFetchNextPageError={query.isFetchNextPageError}
            isFetching={query.isFetching}
            isFetchingNextPage={query.isFetchingNextPage}
            isFiltered={list.isFiltered}
            isLoading={query.isLoading}
            loadMoreRef={loadMoreRef}
            resources={list.resources}
            view={list.view}
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
        <ResourceOpeningDialog
          error={linkedResourceQuery.isError ? linkedResourceQuery.error : undefined}
          onClose={closeLinkedResource}
          onRetry={() => void linkedResourceQuery.refetch()}
        />
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
