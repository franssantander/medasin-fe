"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Feather,
  LoaderCircle,
  RefreshCw,
  Search,
  SearchX,
  X,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDeleteLetterMutation,
  useLettersQuery,
} from "../queries/letter-query";
import type { LetterSummary } from "../type";
import { LetterDeleteDialog } from "./letter-delete-dialog";
import { LetterLibraryRow } from "./letter-library-row";

type LetterFilter = "all" | "draft" | "exported";

const filters: { value: LetterFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "exported", label: "Exported" },
];

export function LettersLibrary() {
  const lettersQuery = useLettersQuery();
  const deleteMutation = useDeleteLetterMutation();
  const [filter, setFilter] = useState<LetterFilter>("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LetterSummary>();

  const letters = useMemo(() => {
    const byUuid = new Map<string, LetterSummary>();
    lettersQuery.data?.pages.forEach((page) => {
      page.data.data.forEach((letter) => byUuid.set(letter.uuid, letter));
    });
    return [...byUuid.values()];
  }, [lettersQuery.data]);
  const total = lettersQuery.data?.pages[0]?.data.total ?? letters.length;
  const counts = useMemo(
    () => ({
      all: total,
      draft: letters.filter((letter) => letter.status === "draft").length,
      exported: letters.filter((letter) => letter.status === "exported").length,
    }),
    [letters, total],
  );

  const query = search.trim().toLocaleLowerCase();
  const visibleLetters = useMemo(
    () =>
      letters.filter((letter) => {
        if (filter !== "all" && letter.status !== filter) return false;
        if (!query) return true;
        return [letter.title, letter.subtitle, letter.content_preview]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(query));
      }),
    [filter, letters, query],
  );
  const narrowed = Boolean(query) || filter !== "all";

  return (
    <div className="grid min-w-0 gap-6 pb-10">
      <PageHeader
        title="Letters"
        description="Write it once, then share it as beautiful pages."
        action={
          <Button nativeButton={false} render={<Link href="/letters/new" />}>
            <Feather data-icon="inline-start" />
            New letter
          </Button>
        }
      />

      {lettersQuery.isLoading ? (
        <LibrarySkeleton />
      ) : lettersQuery.isError && !lettersQuery.data ? (
        <Empty className="rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyTitle>Letters could not be loaded</EmptyTitle>
            <EmptyDescription>Check your connection and try again.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => void lettersQuery.refetch()}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      ) : letters.length === 0 ? (
        <Empty className="rounded-xl border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Feather />
            </EmptyMedia>
            <EmptyTitle>
              Your first letter starts here.
            </EmptyTitle>
            <EmptyDescription>
              Write something you will be glad to share, then turn it into
              pages for Instagram or X.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link href="/letters/new" />}>
              <Feather data-icon="inline-start" />
              Start writing
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section aria-label="Your letters" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 border-b sm:flex-row sm:items-end sm:justify-between">
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as LetterFilter)}
            >
              <TabsList variant="line" className="h-auto justify-start gap-4 pb-1">
                {filters.map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="flex-none px-0.5 group-data-horizontal/tabs:after:bottom-[-5px]"
                  >
                    {label}
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">
                      {counts[value]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <InputGroup className="mb-2 sm:w-72">
              <InputGroupInput
                type="search"
                aria-label="Search letters"
                placeholder="Search letters…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              {search && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          {visibleLetters.length === 0 ? (
            <Empty className="rounded-xl border bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>
                  {query
                    ? `No letters match “${search.trim()}”`
                    : filter === "draft"
                      ? "No drafts right now"
                      : "Nothing exported yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {query
                    ? "Try a different word from the title or text."
                    : filter === "draft"
                      ? "Every letter you have written has been exported."
                      : "Open a letter and choose Publish to create its pages."}
                </EmptyDescription>
              </EmptyHeader>
              {narrowed && (
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Show all letters
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {visibleLetters.map((letter) => (
                <LetterLibraryRow
                  key={letter.uuid}
                  letter={letter}
                  onDelete={setDeleteTarget}
                />
              ))}
            </ul>
          )}

          {(lettersQuery.hasNextPage || lettersQuery.isFetchNextPageError) && (
            <div className="flex flex-col items-center gap-2 pt-1">
              {lettersQuery.isFetchNextPageError ? (
                <p role="alert" className="text-xs text-destructive">
                  More letters could not be loaded.
                </p>
              ) : narrowed ? (
                <p className="text-xs text-muted-foreground">
                  Showing matches from loaded letters.
                </p>
              ) : null}
              {lettersQuery.hasNextPage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={lettersQuery.isFetchingNextPage}
                  onClick={() => void lettersQuery.fetchNextPage()}
                >
                  {lettersQuery.isFetchingNextPage ? (
                    <LoaderCircle className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <ChevronDown data-icon="inline-start" />
                  )}
                  {lettersQuery.isFetchingNextPage
                    ? "Loading..."
                    : lettersQuery.isFetchNextPageError
                      ? "Retry loading more"
                      : "Load more letters"}
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      <LetterDeleteDialog
        open={Boolean(deleteTarget)}
        letterTitle={deleteTarget?.title}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(undefined);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMutation.mutateAsync(deleteTarget.uuid);
        }}
      />
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="grid gap-3" aria-label="Loading letters">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="hidden h-9 w-64 sm:block" />
      </div>
      <div className="divide-y rounded-xl border bg-card">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="flex items-start gap-4 px-5 py-4">
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="mt-1 h-3 w-1/3" />
            </div>
            <Skeleton className="hidden aspect-[4/3] w-24 rounded-md sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
