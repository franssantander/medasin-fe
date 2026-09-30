"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTrashList } from "../hooks/use-trash-list";
import { TrashActionDialog } from "./trash-action-dialog";
import { TrashListContent } from "./trash-list-content";
import { TrashListPagination } from "./trash-list-pagination";
import { TrashListToolbar } from "./trash-list-toolbar";

export function TrashList() {
  const {
    busyItemUuid,
    cancelAction,
    confirmAction,
    isActionPending,
    isFiltered,
    items,
    pagination,
    pendingAction,
    query,
    requestAction,
    searchInput,
    setPage,
    setSearchInput,
    setType,
    type,
  } = useTrashList();

  return (
    <Card className="@container/trash min-h-0 gap-0 py-0 md:flex-1">
      <TrashListToolbar
        searchInput={searchInput}
        type={type}
        total={pagination?.total}
        onSearchChange={setSearchInput}
        onTypeChange={setType}
      />

      <CardContent
        role="region"
        aria-label="Deleted items"
        tabIndex={0}
        className="min-h-0 gap-0 p-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:flex-1 md:overflow-y-auto"
      >
        <TrashListContent
          items={items}
          isLoading={query.isLoading}
          isError={query.isError}
          hasData={Boolean(query.data)}
          isFiltered={isFiltered}
          errorMessage={query.error?.message}
          busyItemUuid={busyItemUuid}
          onRetry={() => void query.refetch()}
          onRestore={(item) => requestAction("restore", item)}
          onDelete={(item) => requestAction("delete", item)}
        />
      </CardContent>

      {pagination && (
        <TrashListPagination
          currentPage={pagination.current_page}
          lastPage={pagination.last_page}
          onPageChange={setPage}
        />
      )}

      <TrashActionDialog
        pendingAction={pendingAction}
        isPending={isActionPending}
        onCancel={cancelAction}
        onConfirm={confirmAction}
      />
    </Card>
  );
}
