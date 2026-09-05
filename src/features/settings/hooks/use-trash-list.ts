"use client";

import { useEffect, useState } from "react";
import {
  useDeleteTrash,
  useRestoreTrash,
  useTrashQuery,
} from "../queries/settings-query";
import type { TrashItem, TrashItemType } from "../types";

export type TrashPendingAction = {
  action: "restore" | "delete";
  item: TrashItem;
};

export function useTrashList() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setTypeValue] = useState<TrashItemType>();
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<TrashPendingAction>();
  const query = useTrashQuery({ search: search || undefined, type, page });
  const restore = useRestoreTrash();
  const remove = useDeleteTrash();
  const activeMutation =
    pendingAction?.action === "restore" ? restore : remove;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const setType = (value?: TrashItemType) => {
    setTypeValue(value);
    setPage(1);
  };

  const requestAction = (
    action: TrashPendingAction["action"],
    item: TrashItem,
  ) => setPendingAction({ action, item });

  const cancelAction = () => {
    if (!activeMutation.isPending) setPendingAction(undefined);
  };

  const confirmAction = () => {
    if (!pendingAction) return;

    activeMutation.mutate(pendingAction.item.uuid, {
      onSuccess: () => setPendingAction(undefined),
    });
  };

  const pagination = query.data?.data;

  return {
    busyItemUuid: activeMutation.isPending
      ? pendingAction?.item.uuid
      : undefined,
    cancelAction,
    confirmAction,
    isActionPending: activeMutation.isPending,
    isFiltered: Boolean(search || type),
    items: pagination?.data ?? [],
    pagination,
    pendingAction,
    query,
    requestAction,
    searchInput,
    setPage,
    setSearchInput,
    setType,
    type,
  };
}
