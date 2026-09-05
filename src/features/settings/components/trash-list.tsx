"use client";

import {
  CheckSquare2,
  CirclePile,
  FileText,
  Flame,
  FolderKanban,
  LayoutDashboard,
  Paperclip,
  RefreshCw,
  Search,
  StarCheck,
  Tag,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteTrash,
  useRestoreTrash,
  useTrashQuery,
} from "../queries/settings-query";
import type { TrashItem, TrashItemType } from "../types";

const typeOptions: { value: TrashItemType; label: string; icon: LucideIcon }[] =
  [
    { value: "area", label: "Areas", icon: CirclePile },
    { value: "project", label: "Projects", icon: FolderKanban },
    { value: "board", label: "Boards", icon: LayoutDashboard },
    { value: "task", label: "Tasks", icon: CheckSquare2 },
    { value: "goal", label: "Goals", icon: StarCheck },
    { value: "habit", label: "Habits", icon: Flame },
    { value: "note", label: "Notes", icon: FileText },
    { value: "board_label", label: "Board labels", icon: Tag },
    { value: "resource_attachment", label: "Attachments", icon: Paperclip },
  ];

const labels = Object.fromEntries(
  typeOptions.map((item) => [item.value, item.label.replace(/s$/, "")]),
) as Record<TrashItemType, string>;
const icons = Object.fromEntries(
  typeOptions.map((item) => [item.value, item.icon]),
) as Record<TrashItemType, LucideIcon>;

export function TrashList() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TrashItemType>();
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{
    action: "restore" | "delete";
    item: TrashItem;
  }>();
  const query = useTrashQuery({ search: search || undefined, type, page });
  const restore = useRestoreTrash();
  const remove = useDeleteTrash();
  const mutation = pending?.action === "restore" ? restore : remove;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const pagination = query.data?.data;
  const items = pagination?.data ?? [];

  const confirm = () => {
    if (!pending) return;
    mutation.mutate(pending.item.uuid, {
      onSuccess: () => setPending(undefined),
    });
  };

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Trash2 className="size-4" />
              </span>
              <CardTitle className="text-lg font-bold">Trash</CardTitle>
            </div>
            <CardDescription className="max-w-2xl leading-6">
              Deleted items are permanently removed after 30 days. Restore
              anything you want to keep before its expiry date.
            </CardDescription>
          </div>
          {pagination && (
            <div className="rounded-lg border bg-muted/50 px-3 py-2 sm:text-right">
              <p className="text-2xl font-bold tabular-nums">
                {pagination.total}
              </p>
              <p className="text-xs text-muted-foreground">items in Trash</p>
            </div>
          )}
        </div>
      </CardHeader>

      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:p-5">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search Trash</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            className="pl-9"
            placeholder="Search deleted items…"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <Select
          value={type ?? "all"}
          onValueChange={(value) => {
            setType(value === "all" ? undefined : (value as TrashItemType));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All content types</SelectItem>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <option.icon />
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading && (
        <div className="grid gap-0 divide-y">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex gap-3 p-5">
              <Skeleton className="size-9 shrink-0" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {query.isError && (
        <CardContent className="items-center py-14 text-center">
          <TriangleAlert className="size-7 text-destructive" />
          <CardTitle>Trash could not be loaded</CardTitle>
          <CardDescription>{query.error.message}</CardDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            <RefreshCw /> Try again
          </Button>
        </CardContent>
      )}

      {query.data && items.length === 0 && (
        <CardContent className="items-center py-14 text-center">
          <span className="rounded-full bg-muted p-3">
            <Trash2 className="size-6" />
          </span>
          <CardTitle>
            {search || type ? "No matching items" : "Trash is empty"}
          </CardTitle>
          <CardDescription className="max-w-sm">
            {search || type
              ? "Try changing your search or content type filter."
              : "Deleted content will stay here for 30 days before it is permanently removed."}
          </CardDescription>
        </CardContent>
      )}

      {items.length > 0 && (
        <div className="divide-y">
          {items.map((item) => (
            <TrashRow
              key={item.uuid}
              item={item}
              busy={
                Boolean(pending?.item.uuid === item.uuid) && mutation.isPending
              }
              onRestore={() => setPending({ action: "restore", item })}
              onDelete={() => setPending({ action: "delete", item })}
            />
          ))}
        </div>
      )}

      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-between gap-3 border-t p-4 sm:px-5">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {pagination.current_page} of {pagination.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.last_page}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setPending(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.action === "restore"
                ? "Restore item?"
                : "Delete forever?"}
            </DialogTitle>
            <DialogDescription>
              {pending?.action === "restore"
                ? `“${pending.item.title}”${pending.item.group_size > 1 ? ` and ${pending.item.group_size - 1} related items` : ""} will return to its previous location.`
                : `“${pending?.item.title}” will be permanently deleted. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setPending(undefined)}
            >
              Cancel
            </Button>
            <Button
              variant={pending?.action === "delete" ? "destructive" : "default"}
              disabled={mutation.isPending}
              onClick={confirm}
            >
              {mutation.isPending
                ? pending?.action === "restore"
                  ? "Restoring…"
                  : "Deleting…"
                : pending?.action === "restore"
                  ? "Restore"
                  : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TrashRow({
  item,
  busy,
  onRestore,
  onDelete,
}: {
  item: TrashItem;
  busy: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const Icon = icons[item.type];
  const urgent = item.days_remaining <= 5;

  return (
    <article
      className={!item.can_restore ? "bg-amber-500/5 p-4 sm:p-5" : "p-4 sm:p-5"}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{item.title}</h3>
              <Badge variant="secondary">{labels[item.type]}</Badge>
              {item.group_size > 1 && (
                <Badge variant="outline">{item.group_size} items</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {item.context && <>{item.context} · </>}
              Deleted {formatDate(item.deleted_at)} ·{" "}
              <span
                className={
                  urgent
                    ? "font-semibold text-destructive"
                    : "font-semibold text-amber-700 dark:text-amber-300"
                }
              >
                {item.days_remaining}{" "}
                {item.days_remaining === 1 ? "day" : "days"} remaining
              </span>
            </p>
            {!item.can_restore && item.restore_block_reason && (
              <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-800 dark:text-amber-300">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {item.restore_block_reason}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pl-12 lg:pl-0">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !item.can_restore}
            onClick={onRestore}
          >
            <RefreshCw /> Restore
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 /> Delete forever
          </Button>
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
