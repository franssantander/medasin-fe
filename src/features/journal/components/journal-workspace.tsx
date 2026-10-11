"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  PanelLeft,
  PanelLeftOpen,
  RefreshCw,
  SquarePen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  removeJournalEntryFromCache,
  upsertJournalEntryCache,
  useDeleteJournalEntryMutation,
  useJournalEntriesQuery,
  useJournalEntryQuery,
} from "../queries/journal-query";
import type { JournalEntry, JournalEntrySummary } from "../type";
import {
  JournalDeleteDialog,
  type JournalDeleteTarget,
} from "./journal-delete-dialog";
import { JournalEntryEditor } from "./journal-entry-editor";
import { JournalEntryList } from "./journal-entry-list";

type JournalSelection =
  | { kind: "entry"; uuid: string }
  | { kind: "draft"; key: number };

export function JournalWorkspace({
  initialEntryUuid,
}: {
  initialEntryUuid?: string;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const entriesQuery = useJournalEntriesQuery();
  const deleteMutation = useDeleteJournalEntryMutation();
  const [selection, setSelection] = useState<JournalSelection>();
  const [listOpen, setListOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<JournalDeleteTarget>();
  const deleteFlushRef = useRef<(() => Promise<void>) | null>(null);

  const registerDeleteFlush = useCallback(
    (flush?: () => Promise<void>) => {
      deleteFlushRef.current = flush ?? null;
    },
    [],
  );

  const entries = useMemo(() => {
    const byUuid = new Map<string, JournalEntrySummary>();

    entriesQuery.data?.pages.forEach((page) => {
      page.data.data.forEach((entry) => byUuid.set(entry.uuid, entry));
    });

    return [...byUuid.values()];
  }, [entriesQuery.data]);
  const total = entriesQuery.data?.pages[0]?.data.total;
  const firstEntry = entries[0];
  const derivedSelection: JournalSelection =
    selection ??
    (initialEntryUuid
      ? { kind: "entry", uuid: initialEntryUuid }
      : firstEntry
        ? { kind: "entry", uuid: firstEntry.uuid }
        : { kind: "draft", key: draftKey });
  const selectedUuid =
    derivedSelection.kind === "entry" ? derivedSelection.uuid : undefined;
  const detailQuery = useJournalEntryQuery(selectedUuid);

  const openEntry = useCallback(
    (uuid: string) => {
      setSelection({ kind: "entry", uuid });
      setSheetOpen(false);
      router.replace(`/journal?entry=${encodeURIComponent(uuid)}`, {
        scroll: false,
      });
    },
    [router],
  );

  const startDraft = useCallback(() => {
    const nextKey = draftKey + 1;
    setDraftKey(nextKey);
    setSelection({ kind: "draft", key: nextKey });
    setSheetOpen(false);
    router.replace("/journal", { scroll: false });
  }, [draftKey, router]);

  const handleCreated = useCallback(
    (entry: JournalEntry) => {
      upsertJournalEntryCache(queryClient, entry, true);
      openEntry(entry.uuid);
    },
    [openEntry, queryClient],
  );

  const handleSaved = useCallback(
    (entry: JournalEntry) => {
      upsertJournalEntryCache(queryClient, entry);
    },
    [queryClient],
  );

  const requestDelete = useCallback((target: JournalDeleteTarget) => {
    setSheetOpen(false);
    setDeleteTarget(target);
  }, []);

  const handleDelete = useCallback(
    async (uuid: string) => {
      if (uuid === selectedUuid) {
        await deleteFlushRef.current?.();
      }

      await deleteMutation.mutateAsync(uuid);
      removeJournalEntryFromCache(queryClient, uuid);

      const nextEntry = entries.find((entry) => entry.uuid !== uuid);
      if (nextEntry) {
        openEntry(nextEntry.uuid);
        return;
      }

      const nextKey = draftKey + 1;
      setDraftKey(nextKey);
      setSelection({ kind: "draft", key: nextKey });
      router.replace("/journal", { scroll: false });
    },
    [
      deleteMutation,
      draftKey,
      entries,
      openEntry,
      queryClient,
      router,
      selectedUuid,
    ],
  );

  if (entriesQuery.isLoading) {
    return (
      <JournalShell>
        <JournalFrameSkeleton />
      </JournalShell>
    );
  }

  if (entriesQuery.isError && !entriesQuery.data) {
    return (
      <JournalShell>
        <div className="grid flex-1 place-content-center justify-items-center gap-2 rounded-xl border bg-card px-6 py-12 text-center">
          <h1 className="text-sm text-muted-foreground">Journal</h1>
          <p className="text-base font-semibold">
            Journal entries could not be loaded
          </p>
          <p className="text-sm text-muted-foreground">
            Check your connection and try again.
          </p>
          <Button
            variant="outline"
            onClick={() => void entriesQuery.refetch()}
          >
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
        </div>
      </JournalShell>
    );
  }

  const loadedEntry = detailQuery.data?.data;
  const selectedEntry: JournalEntry | undefined =
    derivedSelection.kind === "entry" && loadedEntry?.uuid === selectedUuid
      ? loadedEntry
      : undefined;

  const list = (inSheet: boolean) => (
    <JournalEntryList
      entries={entries}
      selectedUuid={selectedUuid}
      total={total}
      hasNextPage={Boolean(entriesQuery.hasNextPage)}
      isError={entriesQuery.isError && !entriesQuery.data}
      isFetchNextPageError={entriesQuery.isFetchNextPageError}
      isFetchingNextPage={entriesQuery.isFetchingNextPage}
      isLoading={entriesQuery.isLoading}
      onLoadMore={() => void entriesQuery.fetchNextPage()}
      onNew={startDraft}
      onOpen={openEntry}
      onRequestDelete={(entry) =>
        requestDelete({ uuid: entry.uuid, title: entry.title })
      }
      onRetry={() => void entriesQuery.refetch()}
      onClose={inSheet ? undefined : () => setListOpen(false)}
    />
  );

  const leading = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Show entries"
        title="Show entries"
        onClick={() => setSheetOpen(true)}
      >
        <PanelLeft />
      </Button>
      {!listOpen && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="hidden md:inline-flex"
          aria-label="Open entries list"
          title="Open entries list"
          onClick={() => setListOpen(true)}
        >
          <PanelLeftOpen />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(listOpen && "md:hidden")}
        aria-label="New entry"
        title="New entry"
        onClick={startDraft}
      >
        <SquarePen />
      </Button>
    </>
  );

  return (
    <JournalShell>
      <div
        className={cn(
          "grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card",
          listOpen && "md:grid-cols-[18rem_minmax(0,1fr)]",
        )}
      >
        {listOpen && (
          <aside
            aria-label="Journal entries"
            className="hidden min-h-0 min-w-0 border-r bg-muted/40 md:block dark:bg-muted/20"
          >
            {list(false)}
          </aside>
        )}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-80 gap-0 bg-muted p-0 dark:bg-card"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Journal entries</SheetTitle>
              <SheetDescription>
                Browse and open your journal entries.
              </SheetDescription>
            </SheetHeader>
            {list(true)}
          </SheetContent>
        </Sheet>

        <section
          aria-label="Journal entry editor"
          className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-card"
        >
          {derivedSelection.kind === "draft" ? (
            <JournalEntryEditor
              key={`draft-${derivedSelection.key}`}
              draftKey={derivedSelection.key}
              leading={leading}
              onCreated={handleCreated}
              onSaved={handleSaved}
              onRegisterDeleteFlush={registerDeleteFlush}
              onRequestDelete={requestDelete}
            />
          ) : detailQuery.isLoading ? (
            <EditorStateFrame leading={leading}>
              <div className="grid content-start gap-3">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-9 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <div className="mt-6 grid gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            </EditorStateFrame>
          ) : (detailQuery.isError && !detailQuery.data) || !selectedEntry ? (
            <EditorStateFrame leading={leading}>
              <div className="grid justify-items-center gap-3 py-16 text-center">
                <p className="text-base font-semibold">
                  Entry could not be opened
                </p>
                <p className="text-sm text-muted-foreground">
                  This journal entry may have been removed or is unavailable.
                </p>
                <Button
                  variant="outline"
                  onClick={() => void detailQuery.refetch()}
                >
                  <RefreshCw data-icon="inline-start" />
                  Try again
                </Button>
              </div>
            </EditorStateFrame>
          ) : (
            <JournalEntryEditor
              key={selectedEntry.uuid}
              entry={selectedEntry}
              draftKey={draftKey}
              leading={leading}
              onCreated={handleCreated}
              onSaved={handleSaved}
              onRegisterDeleteFlush={registerDeleteFlush}
              onRequestDelete={requestDelete}
            />
          )}
        </section>
      </div>

      <JournalDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={handleDelete}
      />
    </JournalShell>
  );
}

function JournalShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">{children}</div>
  );
}

function EditorStateFrame({
  leading,
  children,
}: {
  leading: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
        {leading}
        <h1 className="px-1 text-sm text-muted-foreground">Journal</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="journal-page-header">{children}</div>
      </div>
    </div>
  );
}

function JournalFrameSkeleton() {
  return (
    <div className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="hidden content-start gap-2 border-r bg-muted/40 p-3 md:grid dark:bg-muted/20">
        <Skeleton className="mb-1 h-5 w-24" />
        <Skeleton className="mb-3 h-8 w-full" />
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="flex items-start gap-3 py-1.5">
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-col">
        <div className="flex h-12 shrink-0 items-center border-b px-3">
          <h1 className="px-1 text-sm text-muted-foreground">Journal</h1>
        </div>
        <div className="journal-page-header grid content-start gap-3">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="mt-4 h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  );
}
