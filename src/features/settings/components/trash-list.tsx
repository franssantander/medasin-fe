"use client";

import { Card } from "@/components/ui/card";
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
    <Card className="gap-0 py-0">
      <TrashListToolbar
        searchInput={searchInput}
        type={type}
        total={pagination?.total}
        onSearchChange={setSearchInput}
        onTypeChange={setType}
      />

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
