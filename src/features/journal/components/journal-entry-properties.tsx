"use client";

import type { ReactNode } from "react";
import { CalendarDays, Clock3, Timer, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JOURNAL_MOOD_DOT, formatEntryTimestamp } from "../journal-utils";
import type { JournalSource } from "../type";

export function JournalEntryProperties({
  createdAt,
  source,
}: {
  createdAt?: string | null;
  source?: JournalSource | null;
}) {
  return (
    <dl className="grid gap-y-1 text-sm">
      <PropertyRow icon={CalendarDays} label="Written">
        <span className="text-foreground/80">
          {createdAt ? formatEntryTimestamp(createdAt) : "Not saved yet"}
        </span>
      </PropertyRow>

      {source && (
        <PropertyRow icon={Timer} label="Source">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant="secondary">Focus reflection</Badge>
            <Badge variant="outline">From Focus</Badge>
            {source.mood && (
              <Badge variant="outline" className="gap-1.5 capitalize">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    JOURNAL_MOOD_DOT[source.mood],
                  )}
                  aria-hidden="true"
                />
                {source.mood}
              </Badge>
            )}
            {source.task_title && (
              <span className="min-w-0 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                “{source.task_title}”
              </span>
            )}
            {source.completed_at && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3" aria-hidden="true" />
                {formatEntryTimestamp(source.completed_at)}
              </span>
            )}
          </span>
        </PropertyRow>
      )}

    </dl>
  );
}

function PropertyRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <dt className="flex h-7 items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="flex min-h-7 min-w-0 items-center">{children}</dd>
    </div>
  );
}
