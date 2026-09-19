"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Feather, PanelLeftOpen, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [listOpen, setListOpen] = useState(false);
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
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-background">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 px-5 py-8 sm:px-8 sm:py-12">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="min-h-96 w-full" />
        </div>
      </div>
    );
  }

  if (lettersQuery.isError && !lettersQuery.data) {
    return (
      <div className="grid h-full min-h-0 place-items-center">
        <Card className="w-full max-w-lg py-0">
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
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-background shadow-xs">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setListOpen(true)}
        >
          <PanelLeftOpen data-icon="inline-start" />
          Letters
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <Feather className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Focused writing</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={startDraft}>
          <Plus data-icon="inline-start" />
          <span className="hidden sm:inline">New letter</span>
          <span className="sr-only sm:hidden">New letter</span>
        </Button>
      </header>

      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[min(23rem,92vw)] gap-0 p-0 sm:max-w-[23rem]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Your letters</SheetTitle>
            <SheetDescription>
              Browse, create, and manage your letters.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
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
              onNew={() => {
                startDraft();
                setListOpen(false);
              }}
              onOpen={(uuid) => {
                openLetter(uuid);
                setListOpen(false);
              }}
              onDelete={handleDelete}
              onRetry={() => void lettersQuery.refetch()}
              onClose={() => setListOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <section
        aria-label="Letter editor"
        className="min-h-0 min-w-0 flex-1 overflow-hidden"
      >
        <div className="h-full min-h-0 min-w-0 w-full">
          {derivedSelection.kind === "draft" ? (
            <LetterEditor
              key={`draft-${derivedSelection.key}`}
              draftKey={derivedSelection.key}
              onCreated={handleCreated}
              onSaved={handleSaved}
              onRegisterDeleteFlush={registerDeleteFlush}
            />
          ) : detailQuery.isLoading ? (
            <div className="mx-auto grid h-full w-full max-w-3xl content-start gap-4 px-5 py-8 sm:px-8 sm:py-12">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="min-h-96 w-full" />
            </div>
          ) : (detailQuery.isError && !detailQuery.data) || !selectedLetter ? (
            <div className="grid h-full place-items-center p-4">
              <Card className="w-full max-w-lg py-0">
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
            </div>
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
  );
}
