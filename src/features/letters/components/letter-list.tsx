"use client";

import { useState } from "react";
import {
  ChevronDown,
  Feather,
  LoaderCircle,
  PanelLeftClose,
  RefreshCw,
  Trash2,
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
import type { LetterSummary } from "../type";

type LetterListProps = {
  letters: LetterSummary[];
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

export function LetterList({
  letters,
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
}: LetterListProps) {
  const [deleteLetter, setDeleteLetter] = useState<LetterSummary>();
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const requestDelete = (letter: LetterSummary) => {
    setDeleteError("");
    setDeleteLetter(letter);
  };

  const confirmDelete = async () => {
    if (!deleteLetter) return;

    setDeleteError("");
    setDeletePending(true);
    try {
      await onDelete(deleteLetter.uuid);
      setDeleteLetter(undefined);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "The letter could not be deleted.",
      );
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-b bg-muted/30 md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-3">
        <div className="min-w-0">
          <h2 className="font-semibold">Letters</h2>
          <p className="text-xs text-muted-foreground">
            {total === undefined
              ? `${letters.length} ${letters.length === 1 ? "letter" : "letters"}`
              : `${total} ${total === 1 ? "letter" : "letters"}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="New letter"
            title="New letter"
            onClick={onNew}
          >
            <Feather />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close letters list"
            title="Close letters list"
            onClick={onClose}
          >
            <PanelLeftClose />
          </Button>
        </div>
      </div>

      <div className="workspace-list-scrollbar max-h-64 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-2 md:max-h-none md:flex-1">
        {isLoading ? (
          <LetterListSkeleton />
        ) : isError ? (
          <div className="grid justify-items-center gap-3 px-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Letters could not be loaded.
            </p>
            <Button type="button" variant="outline" onClick={onRetry}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </div>
        ) : letters.length === 0 ? (
          <div className="grid justify-items-center gap-3 px-3 py-10 text-center">
            <Feather className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium">Your first letter starts here.</p>
            <p className="text-sm text-muted-foreground">
              Write something you will be glad to share.
            </p>
            <Button type="button" size="sm" onClick={onNew}>
              <Feather data-icon="inline-start" />
              New letter
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            {letters.map((letter) => (
              <LetterListItem
                key={letter.uuid}
                letter={letter}
                selected={letter.uuid === selectedUuid}
                onOpen={onOpen}
                onDelete={requestDelete}
              />
            ))}
            {(hasNextPage || isFetchNextPageError) && (
              <div className="grid gap-2 px-1 pt-2">
                {isFetchNextPageError && (
                  <p role="alert" className="text-xs text-destructive">
                    More letters could not be loaded.
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
                      ? "Loading..."
                      : isFetchNextPageError
                        ? "Retry loading more"
                        : "Load more letters"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(deleteLetter)}
        onOpenChange={(open) => {
          if (!deletePending && !open) setDeleteLetter(undefined);
        }}
      >
        {deleteLetter && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete letter?</DialogTitle>
              <DialogDescription>
                “{deleteLetter.title.trim() || "Untitled letter"}” will move to
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
                onClick={() => setDeleteLetter(undefined)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deletePending}
                onClick={() => void confirmDelete()}
              >
                {deletePending ? "Deleting..." : "Delete letter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </aside>
  );
}

function LetterListItem({
  letter,
  selected,
  onOpen,
  onDelete,
}: {
  letter: LetterSummary;
  selected: boolean;
  onOpen: (uuid: string) => void;
  onDelete: (letter: LetterSummary) => void;
}) {
  const title = letter.title.trim() || "Untitled letter";
  const preview = letter.content_preview.trim() || "No letter text yet.";

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
        onClick={() => onOpen(letter.uuid)}
      >
        <span className="flex min-w-0 items-start gap-2">
          <Feather
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
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Badge variant={letter.status === "exported" ? "outline" : "secondary"}>
            {letter.status === "exported" ? "Exported" : "Draft"}
          </Badge>
          <span>{formatWordCount(letter.word_count)}</span>
          <span>{formatReadTime(letter.read_time_minutes)}</span>
          {letter.updated_at && (
            <time
              dateTime={letter.updated_at}
              title={new Date(letter.updated_at).toLocaleString()}
              className="ml-auto whitespace-nowrap"
            >
              {formatListTimestamp(letter.updated_at)}
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
        onClick={() => onDelete(letter)}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function LetterListSkeleton() {
  return (
    <div className="grid gap-2" aria-label="Loading letters">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="grid gap-2 rounded-lg border p-3">
          <Skeleton className="h-4 w-3/4" />
          <div className="grid gap-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function formatWordCount(value: number) {
  return `${value.toLocaleString()} ${value === 1 ? "word" : "words"}`;
}

function formatReadTime(value: number) {
  return `${value} ${value === 1 ? "min" : "mins"}`;
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
