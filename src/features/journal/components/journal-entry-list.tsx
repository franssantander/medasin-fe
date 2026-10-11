"use client";

import { useMemo, useState } from "react";
import {
  BookHeart,
  ChevronDown,
  Ellipsis,
  LoaderCircle,
  PanelLeftClose,
  RefreshCw,
  Search,
  SquarePen,
  Timer,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  JOURNAL_MOOD_DOT,
  formatDayTile,
  formatListTimestamp,
  groupEntriesByDate,
  journalEntryTitle,
} from "../journal-utils";
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
  onRequestDelete: (entry: JournalEntrySummary) => void;
  onRetry: () => void;
  onClose?: () => void;
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
  onRequestDelete,
  onRetry,
  onClose,
}: JournalEntryListProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const filtered = useMemo(
    () =>
      query
        ? entries.filter((entry) =>
            [entry.title, entry.content_preview, entry.source?.task_title]
              .filter(Boolean)
              .some((value) => value!.toLocaleLowerCase().includes(query)),
          )
        : entries,
    [entries, query],
  );
  const groups = useMemo(() => groupEntriesByDate(filtered), [filtered]);
  const count = total ?? entries.length;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Entries</h2>
          <p className="text-xs text-muted-foreground">
            {count} {count === 1 ? "entry" : "entries"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="New journal entry"
          title="New journal entry"
          onClick={onNew}
        >
          <SquarePen />
        </Button>
        {onClose && (
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
        )}
      </div>

      {entries.length > 0 && (
        <div className="shrink-0 px-3 pb-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              aria-label="Search journal entries"
              placeholder="Search entries…"
              className="h-8 border-transparent bg-background/70 pl-8 text-sm shadow-none focus-visible:border-input dark:bg-background/30"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      )}

      <div className="workspace-list-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <JournalEntryListSkeleton />
        ) : isError ? (
          <div className="grid justify-items-center gap-3 px-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Journal entries could not be loaded.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-4 py-12 text-center">
            <span className="mb-1 flex size-9 items-center justify-center rounded-full bg-background text-muted-foreground">
              <BookHeart className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium">
              A quiet place to begin.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Your entries will gather here, one day at a time.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No entries match “{search.trim()}”
            {hasNextPage ? " in the loaded entries." : "."}
          </p>
        ) : (
          <div className="grid gap-3">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <h3 className="px-2 pt-1 pb-1.5 text-[0.6875rem] font-medium tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </h3>
                <ul className="grid gap-0.5">
                  {group.entries.map((entry) => (
                    <JournalEntryListItem
                      key={entry.uuid}
                      entry={entry}
                      selected={entry.uuid === selectedUuid}
                      onOpen={onOpen}
                      onDelete={onRequestDelete}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {!query && (hasNextPage || isFetchNextPageError) && (
              <div className="grid gap-2 px-1">
                {isFetchNextPageError && (
                  <p role="alert" className="text-xs text-destructive">
                    More entries could not be loaded.
                  </p>
                )}
                {hasNextPage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
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
                        : "Load earlier entries"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
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
  const title = journalEntryTitle(entry.title);
  const preview = entry.content_preview.trim();
  const tile = formatDayTile(entry.created_at ?? entry.updated_at);
  const mood = entry.source?.mood;

  return (
    <li
      className={cn(
        "group relative flex min-w-0 items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-background/80 dark:hover:bg-muted/50",
        selected && "bg-background shadow-xs dark:bg-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex w-9 shrink-0 flex-col items-center rounded-md bg-muted/70 py-1 leading-none dark:bg-muted/50",
          selected && "bg-foreground/5 dark:bg-foreground/10",
        )}
      >
        <span className="text-[0.625rem] font-medium text-muted-foreground uppercase">
          {tile.weekday}
        </span>
        <span className="mt-0.5 text-sm font-semibold tabular-nums">
          {tile.day}
        </span>
      </span>
      <button
        type="button"
        aria-current={selected ? "page" : undefined}
        className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-sm text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring/60"
        onClick={() => onOpen(entry.uuid)}
      >
        <span className="truncate pr-6 text-sm font-medium">{title}</span>
        <span
          className={cn(
            "truncate text-xs text-muted-foreground",
            !preview && "italic opacity-70",
          )}
        >
          {preview || "Nothing written yet"}
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2.5 text-[0.6875rem] text-muted-foreground">
          {entry.source && (
            <span className="inline-flex items-center gap-1">
              <Timer className="size-3" aria-hidden="true" />
              Focus
            </span>
          )}
          {mood && (
            <span className="inline-flex items-center gap-1 capitalize">
              <span
                className={cn("size-1.5 rounded-full", JOURNAL_MOOD_DOT[mood])}
                aria-hidden="true"
              />
              {mood}
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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "absolute top-1.5 right-1.5 z-[1] text-muted-foreground pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100 pointer-fine:data-popup-open:opacity-100",
                selected && "pointer-fine:opacity-100",
              )}
              aria-label={`Actions for ${title}`}
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="min-w-40">
          <DropdownMenuItem destructive onClick={() => onDelete(entry)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function JournalEntryListSkeleton() {
  return (
    <div className="grid gap-1 px-1" aria-label="Loading journal entries">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="flex items-start gap-3 rounded-lg px-1 py-2">
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
