"use client";

import { useQueryClient } from "@tanstack/react-query";
import { PanelLeftOpen, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
  const [draftKey, setDraftKey] = useState(0);
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
      <div className="flex min-h-full min-w-0 flex-col gap-5">
        <PageHeader
          title="Journal"
          description="Keep a private record of the moments, ideas, and reflections that matter."
        />
        <Skeleton className="min-h-[36rem] flex-1 rounded-xl" />
      </div>
    );
  }

  if (entriesQuery.isError && !entriesQuery.data) {
    return (
      <div className="flex min-h-full min-w-0 flex-col gap-5">
        <PageHeader
          title="Journal"
          description="Keep a private record of the moments, ideas, and reflections that matter."
        />
        <Card className="py-0">
          <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
            <CardTitle>Journal entries could not be loaded</CardTitle>
            <CardDescription>Check your connection and try again.</CardDescription>
            <Button
              variant="outline"
              onClick={() => void entriesQuery.refetch()}
            >
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const loadedEntry = detailQuery.data?.data;
  const selectedEntry: JournalEntry | undefined =
    derivedSelection.kind === "entry" && loadedEntry?.uuid === selectedUuid
      ? loadedEntry
      : undefined;

  return (
    <div className="flex min-h-full min-w-0 flex-col gap-5">
      <PageHeader
        title="Journal"
        description="Keep a private record of the moments, ideas, and reflections that matter."
        action={
          <Button onClick={startDraft}>
            <Plus data-icon="inline-start" />
            New entry
          </Button>
        }
      />

      <div className="flex h-[calc(100dvh-10rem)] min-h-[36rem] min-w-0 flex-1">
        <div
          className={cn(
            "grid h-full min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-rows-[minmax(0,1fr)]",
            listOpen
              ? "md:grid-cols-[23rem_minmax(0,1fr)]"
              : "md:grid-cols-[minmax(0,1fr)]",
          )}
        >
          {listOpen && (
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
              onDelete={handleDelete}
              onRetry={() => void entriesQuery.refetch()}
              onClose={() => setListOpen(false)}
            />
          )}

          <section
            aria-label="Journal entry editor"
            className="relative flex min-h-0 min-w-0 justify-center overflow-hidden bg-white p-4 sm:p-6"
          >
            {!listOpen && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 left-3 z-10"
                aria-label="Open entries list"
                title="Open entries list"
                onClick={() => setListOpen(true)}
              >
                <PanelLeftOpen />
              </Button>
            )}
            <div
              className={cn(
                "h-full min-h-0 min-w-0 flex-1",
                !listOpen && "md:max-w-[calc(100%-3rem)]",
              )}
            >
              {derivedSelection.kind === "draft" ? (
                <JournalEntryEditor
                  key={`draft-${derivedSelection.key}`}
                  draftKey={derivedSelection.key}
                  onCreated={handleCreated}
                  onSaved={handleSaved}
                  onRegisterDeleteFlush={registerDeleteFlush}
                />
              ) : detailQuery.isLoading ? (
                <div className="grid h-full content-start gap-4">
                  <Skeleton className="h-10 w-2/3" />
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="min-h-96 w-full" />
                </div>
              ) : (detailQuery.isError && !detailQuery.data) || !selectedEntry ? (
                <Card className="py-0">
                  <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
                    <CardTitle>Entry could not be opened</CardTitle>
                    <CardDescription>
                      This journal entry may have been removed or is unavailable.
                    </CardDescription>
                    <Button
                      variant="outline"
                      onClick={() => void detailQuery.refetch()}
                    >
                      <RefreshCw data-icon="inline-start" />
                      Try again
                    </Button>
                  </div>
                </Card>
              ) : (
                <JournalEntryEditor
                  key={selectedEntry.uuid}
                  entry={selectedEntry}
                  draftKey={draftKey}
                  onCreated={handleCreated}
                  onSaved={handleSaved}
                  onRegisterDeleteFlush={registerDeleteFlush}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
