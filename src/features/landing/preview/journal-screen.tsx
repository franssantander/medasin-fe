"use client";

import { ChevronRight, Ellipsis, Redo2, Timer, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { JournalEntryList } from "@/features/journal/components/journal-entry-list";
import { JournalEntryProperties } from "@/features/journal/components/journal-entry-properties";
import {
  JOURNAL_TIME_OF_DAY_LABEL,
  formatDateStamp,
  formatEntryTimestamp,
  getTimeOfDay,
} from "@/features/journal/journal-utils";
import { buildPreviewJournal, previewJournalBody } from "./preview-fixtures";

const noop = () => {};

// journal-workspace.tsx: the entry list beside journal-entry-editor.tsx, showing an entry saved from Focus.
export default function JournalScreen() {
  const [now] = useState(() => new Date());
  const entries = useMemo(() => buildPreviewJournal(now), [now]);
  const [entry] = entries;
  const words = previewJournalBody.join(" ").split(/\s+/).length;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 min-w-0 border-r bg-muted/40 md:block dark:bg-muted/20">
          <JournalEntryList
            entries={entries}
            selectedUuid={entry.uuid}
            total={entries.length}
            hasNextPage={false}
            isError={false}
            isFetchNextPageError={false}
            isFetchingNextPage={false}
            isLoading={false}
            onLoadMore={noop}
            onNew={noop}
            onOpen={noop}
            onRequestDelete={noop}
            onRetry={noop}
            onClose={noop}
          />
        </aside>
        <section className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-card">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
            <div className="min-w-0 flex-1">
              <ol className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                <li className="shrink-0 px-1">Journal</li>
                <li className="shrink-0">
                  <ChevronRight className="size-3.5 opacity-60" />
                </li>
                <li className="min-w-0 truncate px-1 font-medium text-foreground">{entry.title}</li>
              </ol>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="mr-1 hidden text-xs whitespace-nowrap text-muted-foreground md:inline">
                Edited {formatEntryTimestamp(entry.updated_at!)}
              </span>
              <div className="hidden items-center sm:flex">
                <Button variant="ghost" size="icon-sm">
                  <Undo2 />
                </Button>
                <Button variant="ghost" size="icon-sm" disabled>
                  <Redo2 />
                </Button>
              </div>
              <Button variant="ghost" size="icon-sm">
                <Ellipsis />
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="journal-page-header">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="size-3.5" />
                {formatDateStamp(entry.created_at)}
                <span>·</span>
                {JOURNAL_TIME_OF_DAY_LABEL[getTimeOfDay(entry.created_at)]}
              </p>
              <p className="mt-1 py-1 text-2xl leading-tight font-semibold tracking-tight md:text-3xl">{entry.title}</p>
              <div className="mt-4">
                <JournalEntryProperties createdAt={entry.created_at} source={entry.source} />
              </div>
              <div className="mt-6 h-px bg-border/60" />
              {/* Unlayered page classes own padding, so spacing here uses margins. */}
              <div className="mt-6 flex flex-col gap-3 text-base leading-relaxed">
                {previewJournalBody.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
            <p className="journal-page-footer mt-6 text-xs text-muted-foreground">
              {words} words · 1 min read
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
