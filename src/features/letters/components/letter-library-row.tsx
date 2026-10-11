"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CircleCheck,
  CircleDashed,
  Feather,
  LayoutTemplate,
  MoreHorizontal,
  PenLine,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { imageFetchSource } from "@/lib/image/crop-image";
import { cn } from "@/lib/utils";
import { LETTER_EXPORT_FORMATS } from "../letter-export-formats";
import {
  formatListTimestamp,
  formatReadTime,
  formatWordCount,
  letterDisplayTitle,
} from "../letter-format";
import type { LetterSummary } from "../type";

export function LetterLibraryRow({
  letter,
  onDelete,
  onToggleDone,
}: {
  letter: LetterSummary;
  onDelete: (letter: LetterSummary) => void;
  onToggleDone: (letter: LetterSummary) => void;
}) {
  const title = letterDisplayTitle(letter.title);
  const excerpt =
    letter.subtitle?.trim() ||
    letter.content_preview.trim() ||
    "Nothing written yet.";
  const done = Boolean(letter.done_at);
  const exported = letter.status === "exported";
  const exportFormat = letter.latest_export
    ? LETTER_EXPORT_FORMATS[letter.latest_export.format]
    : undefined;

  return (
    <li className="group relative transition-colors duration-200 hover:bg-muted/40 has-[[data-letter-link]:focus-visible]:bg-muted/40 has-[[data-letter-link]:focus-visible]:ring-2 has-[[data-letter-link]:focus-visible]:ring-ring has-[[data-letter-link]:focus-visible]:ring-inset motion-reduce:transition-none">
      <Link
        href={`/letters/${letter.uuid}`}
        data-letter-link=""
        className="absolute inset-0 z-0 outline-none"
        aria-label={`Open ${title}`}
      />
      <div className="pointer-events-none flex items-start gap-4 px-4 py-4 sm:px-5">
        <div className="grid min-w-0 flex-1 gap-1.5">
          <h3
            className="truncate text-base leading-snug font-semibold"
            title={title}
          >
            {title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {excerpt}
          </p>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  done ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              {done ? "Done" : "Draft"}
            </span>
            {exported && (
              <>
                <Dot />
                <span>
                  Exported{exportFormat ? ` · ${exportFormat.shortLabel}` : ""}
                </span>
              </>
            )}
            <Dot />
            <span>{formatWordCount(letter.word_count)}</span>
            <Dot className="hidden sm:inline" />
            <span className="hidden sm:inline">
              {formatReadTime(letter.read_time_minutes)}
            </span>
            {letter.updated_at && (
              <>
                <Dot />
                <time
                  dateTime={letter.updated_at}
                  title={new Date(letter.updated_at).toLocaleString()}
                >
                  {formatListTimestamp(letter.updated_at)}
                </time>
              </>
            )}
          </p>
        </div>

        <LetterCoverTile letter={letter} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="pointer-events-auto relative z-10 -mr-1.5 shrink-0 text-muted-foreground"
                aria-label={`Actions for ${title}`}
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="min-w-44">
            <DropdownMenuItem render={<Link href={`/letters/${letter.uuid}`} />}>
              <PenLine />
              Edit letter
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href={`/letters/${letter.uuid}/studio`} />}
            >
              <LayoutTemplate />
              Design pages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleDone(letter)}>
              {done ? <CircleDashed /> : <CircleCheck />}
              {done ? "Move to drafts" : "Mark as done"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => onDelete(letter)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function LetterCoverTile({ letter }: { letter: LetterSummary }) {
  const imageUrl = letter.latest_export?.pages?.[0]?.cover?.hero_image_url;

  return (
    <div
      aria-hidden="true"
      className="relative hidden aspect-[4/3] w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground/70 sm:flex"
    >
      {imageUrl ? (
        <Image
          unoptimized
          fill
          src={imageFetchSource(imageUrl)}
          alt=""
          sizes="6rem"
          className="object-cover object-center"
        />
      ) : (
        <Feather className="size-4" />
      )}
    </div>
  );
}

function Dot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("text-muted-foreground/50", className)}>
      ·
    </span>
  );
}
