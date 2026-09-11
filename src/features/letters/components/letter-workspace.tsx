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
  removeLetterFromCache,
  upsertLetterCache,
  useDeleteLetterMutation,
  useLetterQuery,
  useLettersQuery,
} from "../queries/letter-query";
import type { Letter, LetterSummary } from "../type";
import { LetterEditor } from "./letter-editor";
import { LetterList } from "./letter-list";

type LetterSelection =
  | { kind: "letter"; uuid: string }
  | { kind: "draft"; key: number };

export function LetterWorkspace({
  initialLetterUuid,
}: {
  initialLetterUuid?: string;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const lettersQuery = useLettersQuery();
  const deleteMutation = useDeleteLetterMutation();
  const [selection, setSelection] = useState<LetterSelection>();
  const [listOpen, setListOpen] = useState(true);
  const [draftKey, setDraftKey] = useState(0);
  const deleteFlushRef = useRef<(() => Promise<Letter | undefined>) | null>(
    null,
  );

  const registerDeleteFlush = useCallback(
    (flush?: () => Promise<Letter | undefined>) => {
      deleteFlushRef.current = flush ?? null;
    },
    [],
  );

  const letters = useMemo(() => {
    const byUuid = new Map<string, LetterSummary>();

    lettersQuery.data?.pages.forEach((page) => {
      page.data.data.forEach((letter) => byUuid.set(letter.uuid, letter));
    });

    return [...byUuid.values()];
  }, [lettersQuery.data]);
  const total = lettersQuery.data?.pages[0]?.data.total;
  const firstLetter = letters[0];
  const derivedSelection: LetterSelection =
    selection ??
    (initialLetterUuid
      ? { kind: "letter", uuid: initialLetterUuid }
      : firstLetter
        ? { kind: "letter", uuid: firstLetter.uuid }
        : { kind: "draft", key: draftKey });
  const selectedUuid =
    derivedSelection.kind === "letter" ? derivedSelection.uuid : undefined;
  const detailQuery = useLetterQuery(selectedUuid);

  const openLetter = useCallback(
    (uuid: string) => {
      setSelection({ kind: "letter", uuid });
      router.replace(`/letters?letter=${encodeURIComponent(uuid)}`, {
        scroll: false,
      });
    },
    [router],
  );

  const startDraft = useCallback(() => {
    const nextKey = draftKey + 1;
    setDraftKey(nextKey);
    setSelection({ kind: "draft", key: nextKey });
    router.replace("/letters", { scroll: false });
  }, [draftKey, router]);

  const handleCreated = useCallback(
    (letter: Letter) => {
      upsertLetterCache(queryClient, letter, true);
      openLetter(letter.uuid);
    },
    [openLetter, queryClient],
  );

  const handleSaved = useCallback(
    (letter: Letter) => {
      upsertLetterCache(queryClient, letter);
    },
    [queryClient],
  );

  const handleDelete = useCallback(
    async (uuid: string) => {
      if (uuid === selectedUuid) {
        await deleteFlushRef.current?.();
      }

      await deleteMutation.mutateAsync(uuid);
      removeLetterFromCache(queryClient, uuid);

      const nextLetter = letters.find((letter) => letter.uuid !== uuid);
      if (nextLetter) {
        openLetter(nextLetter.uuid);
        return;
      }

      const nextKey = draftKey + 1;
      setDraftKey(nextKey);
      setSelection({ kind: "draft", key: nextKey });
      router.replace("/letters", { scroll: false });
    },
    [
      deleteMutation,
      draftKey,
      letters,
      openLetter,
      queryClient,
      router,
      selectedUuid,
    ],
  );

  if (lettersQuery.isLoading) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-5">
        <PageHeader
          title="Letters"
          description="Write something worth sharing, then prepare it as a set of pages."
        />
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
      </div>
    );
  }

  if (lettersQuery.isError && !lettersQuery.data) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-5">
        <PageHeader
          title="Letters"
          description="Write something worth sharing, then prepare it as a set of pages."
        />
        <Card className="py-0">
          <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
            <CardTitle>Letters could not be loaded</CardTitle>
            <CardDescription>Check your connection and try again.</CardDescription>
            <Button
              variant="outline"
              onClick={() => void lettersQuery.refetch()}
            >
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const loadedLetter = detailQuery.data?.data;
  const selectedLetter: Letter | undefined =
    derivedSelection.kind === "letter" && loadedLetter?.uuid === selectedUuid
      ? loadedLetter
      : undefined;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-5">
      <PageHeader
        title="Letters"
        description="Write something worth sharing, then prepare it as a set of pages."
        action={
          <Button onClick={startDraft}>
            <Plus data-icon="inline-start" />
            New letter
          </Button>
        }
      />

      <div className="flex min-h-0 min-w-0 flex-1">
        <div
          className={cn(
            "grid h-full min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-rows-[minmax(0,1fr)]",
            listOpen
              ? "md:grid-cols-[23rem_minmax(0,1fr)]"
              : "md:grid-cols-[minmax(0,1fr)]",
          )}
        >
          {listOpen && (
            <LetterList
              letters={letters}
              selectedUuid={selectedUuid}
              total={total}
              hasNextPage={Boolean(lettersQuery.hasNextPage)}
              isError={lettersQuery.isError && !lettersQuery.data}
              isFetchNextPageError={lettersQuery.isFetchNextPageError}
              isFetchingNextPage={lettersQuery.isFetchingNextPage}
              isLoading={lettersQuery.isLoading}
              onLoadMore={() => void lettersQuery.fetchNextPage()}
              onNew={startDraft}
              onOpen={openLetter}
              onDelete={handleDelete}
              onRetry={() => void lettersQuery.refetch()}
              onClose={() => setListOpen(false)}
            />
          )}

          <section
            aria-label="Letter editor"
            className={cn(
              "relative flex min-h-0 min-w-0 justify-center overflow-hidden bg-background p-4 sm:p-6",
              !listOpen && "pt-14 sm:pt-16",
            )}
          >
            {!listOpen && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6"
                aria-label="Open letters list"
                title="Open letters list"
                onClick={() => setListOpen(true)}
              >
                <PanelLeftOpen />
              </Button>
            )}
            <div className="h-full min-h-0 min-w-0 w-full flex-1">
              {derivedSelection.kind === "draft" ? (
                <LetterEditor
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
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="min-h-96 w-full" />
                </div>
              ) : (detailQuery.isError && !detailQuery.data) || !selectedLetter ? (
                <Card className="py-0">
                  <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
                    <CardTitle>Letter could not be opened</CardTitle>
                    <CardDescription>
                      This letter may have been removed or is unavailable.
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
                <LetterEditor
                  key={selectedLetter.uuid}
                  letter={selectedLetter}
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
