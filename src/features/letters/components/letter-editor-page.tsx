"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useLetterQuery } from "../queries/letter-query";
import type { Letter } from "../type";
import { LetterEditor } from "./letter-editor";

export function LetterEditorPage({ letterUuid }: { letterUuid?: string }) {
  const detailQuery = useLetterQuery(letterUuid);
  const data = detailQuery.data?.data;
  // Keep the open letter mounted if its query is removed or refetched (for
  // example while it is being deleted) instead of flashing a loading state.
  const [loadedLetter, setLoadedLetter] = useState<Letter>();
  if (data && data.uuid === letterUuid && data !== loadedLetter) {
    setLoadedLetter(data);
  }
  const letter = loadedLetter?.uuid === letterUuid ? loadedLetter : undefined;

  if (!letterUuid) return <LetterEditor key="new-letter" />;
  if (letter) return <LetterEditor key={letter.uuid} letter={letter} />;

  if (detailQuery.isError) {
    return (
      <EditorFrame>
        <Empty className="h-full">
          <EmptyHeader>
            <EmptyTitle>Letter could not be opened</EmptyTitle>
            <EmptyDescription>
              This letter may have been removed or is unavailable.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <Button variant="outline" onClick={() => void detailQuery.refetch()}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
            <Button nativeButton={false} render={<Link href="/letters" />}>
              Back to letters
            </Button>
          </EmptyContent>
        </Empty>
      </EditorFrame>
    );
  }

  return (
    <EditorFrame>
      <div
        className="mx-auto grid w-full max-w-3xl content-start gap-4 px-5 pt-16 sm:px-[5.25rem]"
        aria-label="Loading letter"
      >
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
        <div className="mt-8 grid gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </EditorFrame>
  );
}

function EditorFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center border-b px-2 sm:px-4">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/letters" />}
        >
          <ArrowLeft data-icon="inline-start" />
          Letters
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
