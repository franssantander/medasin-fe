"use client";

import { useState } from "react";
import {
  BookHeart,
  ChevronDown,
  Link2,
  LoaderCircle,
  PanelLeftClose,
  RefreshCw,
  Trash2,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { JournalEntrySummary } from "../type";

type JournalEntryListProps = {
  entries: JournalEntrySummary[];
  selectedUuid?: string;
  total?: number;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onNew: () => void;
  onOpen: (uuid: string) => void;
  onDelete: (uuid: string) => Promise<void>;
  onRetry: () => void;
  onClose: () => void;
};

export function JournalEntryList({
  entries,
  selectedUuid,
  total,
  hasNextPage,
  isError,
  isFetchNextPageError,
  isFetchingNextPage,
  isLoading,
  onLoadMore,
  onNew,
  onOpen,
  onDelete,
  onRetry,
  onClose,
}: JournalEntryListProps) {
  const [deleteEntry, setDeleteEntry] = useState<JournalEntrySummary>();
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const requestDelete = (entry: JournalEntrySummary) => {
    setDeleteError("");
    setDeleteEntry(entry);
  };

  const confirmDelete = async () => {
    if (!deleteEntry) return;

    setDeleteError("");
    setDeletePending(true);
    try {
      await onDelete(deleteEntry.uuid);
      setDeleteEntry(undefined);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "The journal entry could not be deleted.",
      );
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b bg-muted/30 md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-3">
        <div className="min-w-0">
          <h2 className="font-semibold">Entries</h2>
          <p className="text-xs text-muted-foreground">
            {total === undefined
              ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
              : `${total} ${total === 1 ? "entry" : "entries"}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="New journal entry"
            title="New journal entry"
            onClick={onNew}
          >
            <BookHeart />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close entries list"
            title="Close entries list"
            onClick={onClose}
          >
            <PanelLeftClose />
          </Button>
        </div>
      </div>

      <div className="workspace-list-scrollbar max-h-64 min-w-0 overflow-x-hidden overflow-y-auto p-2 md:max-h-none md:flex-1">
        {isLoading ? (
          <JournalEntryListSkeleton />
        ) : isError ? (
          <div className="grid justify-items-center gap-3 px-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Journal entries could not be loaded.
            </p>
            <Button type="button" variant="outline" onClick={onRetry}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="grid justify-items-center gap-3 px-3 py-10 text-center">
            <BookHeart className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium">A quiet place to begin.</p>
            <p className="text-sm text-muted-foreground">
              Write down a thought, a moment, or a reflection.
            </p>
            <Button type="button" size="sm" onClick={onNew}>
              <BookHeart data-icon="inline-start" />
              New entry
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            {entries.map((entry) => (
              <JournalEntryListItem
                key={entry.uuid}
                entry={entry}
                selected={entry.uuid === selectedUuid}
                onOpen={onOpen}
                onDelete={requestDelete}
              />
            ))}
            {(hasNextPage || isFetchNextPageError) && (
              <div className="grid gap-2 px-1 pt-2">
                {isFetchNextPageError && (
                  <p role="alert" className="text-xs text-destructive">
                    More entries could not be loaded.
                  </p>
                )}
                {hasNextPage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isFetchingNextPage}
                    onClick={onLoadMore}
                  >
                    {isFetchingNextPage ? (
                      <LoaderCircle
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    ) : (
                      <ChevronDown data-icon="inline-start" />
                    )}
                    {isFetchingNextPage
                      ? "Loading…"
                      : isFetchNextPageError
                        ? "Retry loading more"
                        : "Load more entries"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(deleteEntry)}
        onOpenChange={(open) => {
          if (!deletePending && !open) setDeleteEntry(undefined);
        }}
      >
        {deleteEntry && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete journal entry?</DialogTitle>
              <DialogDescription>
                “{deleteEntry.title.trim() || "Untitled entry"}” will move to
                Trash for 30 days. You can restore it from Settings before it
                expires.
              </DialogDescription>
            </DialogHeader>
            {deleteError && (
              <p role="alert" className="text-sm text-destructive">
                {deleteError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={deletePending}
                onClick={() => setDeleteEntry(undefined)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deletePending}
                onClick={() => void confirmDelete()}
              >
                {deletePending ? "Deleting…" : "Delete entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </aside>
  );
}

function JournalEntryListItem({
  entry,
  selected,
  onOpen,
  onDelete,
}: {
  entry: JournalEntrySummary;
  selected: boolean;
  onOpen: (uuid: string) => void;
  onDelete: (entry: JournalEntrySummary) => void;
}) {
  const title = entry.title.trim() || "Untitled entry";
  const preview = entry.content_preview.trim() || "No reflection text yet.";

  return (
    <div
      className={cn(
        "group flex min-w-0 w-full items-start gap-2 rounded-lg border p-3 transition-colors hover:bg-background/80",
        selected && "border-primary/40 bg-background shadow-xs",
      )}
    >
      <button
        type="button"
        aria-current={selected ? "page" : undefined}
        className="flex min-w-0 flex-1 flex-col gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => onOpen(entry.uuid)}
      >
        <span className="flex min-w-0 items-start gap-2">
          <BookHeart
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground",
              selected && "text-foreground",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {title}
          </span>
        </span>
        <span className="line-clamp-2 text-sm leading-5 text-muted-foreground">
          {preview}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          {entry.source && (
            <Badge variant="secondary" className="max-w-full">
              <Timer data-icon="inline-start" />
              Focus reflection
            </Badge>
          )}
          {entry.resources.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Link2 className="size-3.5" aria-hidden="true" />
              {entry.resources.length}
            </span>
          )}
          {entry.updated_at && (
            <time
              dateTime={entry.updated_at}
              title={new Date(entry.updated_at).toLocaleString()}
              className="ml-auto whitespace-nowrap"
            >
              {formatListTimestamp(entry.updated_at)}
            </time>
          )}
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${title}`}
        title={`Delete ${title}`}
        onClick={() => onDelete(entry)}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function JournalEntryListSkeleton() {
  return (
    <div className="grid gap-2" aria-label="Loading journal entries">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="grid gap-2 rounded-lg border p-3">
          <Skeleton className="h-4 w-3/4" />
          <div className="grid gap-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function formatListTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}
