"use client";

import { Ellipsis, Feather } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatListTimestamp, formatReadTime, formatWordCount } from "@/features/letters/letter-format";
import { cn } from "@/lib/utils";
import { PreviewLineTabs, PreviewSearch } from "./preview-controls";
import { buildPreviewLetters } from "./preview-fixtures";
import { PreviewPageHeader } from "./preview-page-header";

function Dot({ className }: { className?: string }) {
  return <span className={cn("text-muted-foreground/50", className)}>·</span>;
}

// letters-library.tsx with letter-library-row.tsx rows. Times come from the viewer's clock, so this renders in the browser.
export default function LettersScreen() {
  const [now] = useState(() => new Date());
  const letters = useMemo(() => buildPreviewLetters(now), [now]);
  const done = letters.filter((letter) => letter.done).length;

  return (
    <div className="grid min-w-0 gap-6">
      <PreviewPageHeader
        title="Letters"
        description="Write it once, then share it as beautiful pages."
        action={
          <Button>
            <Feather data-icon="inline-start" />
            New letter
          </Button>
        }
      />
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3 border-b sm:flex-row sm:items-end sm:justify-between">
          <PreviewLineTabs
            tabs={[
              { label: "All", count: letters.length },
              { label: "Drafts", count: letters.length - done },
              { label: "Done", count: done },
            ]}
          />
          <PreviewSearch label="Search letters…" className="mb-2 h-9 sm:w-72" />
        </div>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {letters.map((letter) => (
            <li key={letter.title} className="flex items-start gap-4 px-4 py-4 sm:px-5">
              <div className="grid min-w-0 flex-1 gap-1.5">
                <p className="truncate text-base leading-snug font-semibold">{letter.title}</p>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{letter.excerpt}</p>
                <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
                    <span className={cn("size-1.5 rounded-full", letter.done ? "bg-emerald-500" : "bg-amber-500")} />
                    {letter.done ? "Done" : "Draft"}
                  </span>
                  {letter.exported && (
                    <>
                      <Dot />
                      <span>Exported · {letter.exported}</span>
                    </>
                  )}
                  <Dot />
                  <span>{formatWordCount(letter.words)}</span>
                  <Dot className="hidden sm:inline" />
                  <span className="hidden sm:inline">{formatReadTime(letter.minutes)}</span>
                  <Dot />
                  <span>{formatListTimestamp(letter.updated)}</span>
                </p>
              </div>
              <div className="relative hidden aspect-[4/3] w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground/70 sm:flex">
                {letter.cover ? (
                  // A tiny drawing of an exported first page: a colored band, a title line, and body lines.
                  <div className="flex size-full flex-col gap-1 bg-background p-1.5">
                    <div className="h-5 rounded-sm" style={{ backgroundColor: letter.cover }} />
                    <div className="h-1 w-3/4 rounded-full bg-foreground/60" />
                    <div className="h-0.5 w-full rounded-full bg-muted-foreground/30" />
                    <div className="h-0.5 w-5/6 rounded-full bg-muted-foreground/30" />
                    <div className="h-0.5 w-2/3 rounded-full bg-muted-foreground/30" />
                  </div>
                ) : (
                  <Feather className="size-4" />
                )}
              </div>
              <Button variant="ghost" size="icon-sm" className="-mr-1.5 shrink-0 text-muted-foreground">
                <Ellipsis />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
