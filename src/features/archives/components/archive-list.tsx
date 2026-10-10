"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArchiveRestore, CircleAlert } from "lucide-react";
import { LoadingRegion } from "@/components/shared/loading-region";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function formatArchivedDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function ArchiveList({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {children}
    </ul>
  );
}

type ArchiveRowProps = {
  media: ReactNode;
  title: string;
  secondary?: string;
  meta?: ReactNode;
  archivedAt: string | null;
  openLabel: string;
  href?: string;
  onOpen?: () => void;
  restoring: boolean;
  onRestore: () => void;
};

export function ArchiveRow({
  media,
  title,
  secondary,
  meta,
  archivedAt,
  openLabel,
  href,
  onOpen,
  restoring,
  onRestore,
}: ArchiveRowProps) {
  const date = formatArchivedDate(archivedAt);
  const overlayClassName = "absolute inset-0 z-0 cursor-pointer outline-none";

  return (
    <li className="relative transition-colors duration-200 hover:bg-muted/40 has-[[data-archive-open]:focus-visible]:bg-muted/40 has-[[data-archive-open]:focus-visible]:ring-2 has-[[data-archive-open]:focus-visible]:ring-ring has-[[data-archive-open]:focus-visible]:ring-inset motion-reduce:transition-none">
      {href ? (
        <Link
          href={href}
          data-archive-open=""
          aria-label={openLabel}
          className={overlayClassName}
        />
      ) : (
        <button
          type="button"
          data-archive-open=""
          aria-label={openLabel}
          aria-haspopup="dialog"
          className={overlayClassName}
          onClick={onOpen}
        />
      )}
      <div className="pointer-events-none flex min-h-16 items-center gap-3 px-4 py-3 sm:gap-4">
        {media}
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="truncate text-sm font-medium" title={title}>
            {title}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {date && <span className="md:hidden">Archived {date}</span>}
            {date && secondary && <span className="md:hidden"> · </span>}
            {secondary}
          </p>
        </div>
        {meta && (
          <div className="hidden min-w-0 shrink-0 items-center gap-2 sm:flex">
            {meta}
          </div>
        )}
        <span className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground md:block">
          {date && archivedAt ? (
            <time dateTime={archivedAt} title={`Archived ${new Date(archivedAt).toLocaleString()}`}>
              {date}
            </time>
          ) : null}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pointer-events-auto relative z-10 shrink-0"
          aria-label={`Restore ${title}`}
          disabled={restoring}
          onClick={onRestore}
        >
          <ArchiveRestore data-icon="inline-start" aria-hidden="true" />
          <span className="hidden sm:inline">
            {restoring ? "Restoring…" : "Restore"}
          </span>
        </Button>
      </div>
    </li>
  );
}

const titleWidths = ["w-2/5", "w-1/3", "w-1/2", "w-1/4", "w-3/5"];
const secondaryWidths = ["w-3/5", "w-1/2", "w-2/3", "w-2/5", "w-1/2"];

export function ArchiveRowsSkeleton({
  label,
  count = 3,
  meta = false,
}: {
  label: string;
  count?: number;
  meta?: boolean;
}) {
  return (
    <LoadingRegion label={label}>
      <ArchiveList>
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="flex min-h-16 items-center gap-3 px-4 py-3 sm:gap-4">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Skeleton className={cn("h-3.5", titleWidths[index % titleWidths.length])} />
              <Skeleton className={cn("h-3", secondaryWidths[index % secondaryWidths.length])} />
            </div>
            {meta && <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />}
            <div className="hidden w-28 shrink-0 justify-end md:flex">
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-8 shrink-0 sm:w-24" />
          </li>
        ))}
      </ArchiveList>
    </LoadingRegion>
  );
}

export function ArchiveGroup({
  id,
  title,
  count,
  showHeading,
  isLoading,
  isError,
  skeletonLabel,
  skeletonMeta,
  emptyLabel,
  isEmpty,
  hiddenCount = 0,
  onRetry,
  onViewAll,
  footer,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  showHeading: boolean;
  isLoading: boolean;
  isError: boolean;
  skeletonLabel: string;
  skeletonMeta?: boolean;
  emptyLabel: string;
  isEmpty: boolean;
  hiddenCount?: number;
  onRetry: () => void;
  onViewAll?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;

  return (
    <section className="grid gap-3" aria-labelledby={headingId}>
      <div className={cn("flex items-center gap-2", !showHeading && "sr-only")}>
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        {count !== undefined && (
          <Badge variant="secondary" className="h-5 px-1.5 tabular-nums">
            {count}
          </Badge>
        )}
        {hiddenCount > 0 && onViewAll && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="ml-auto text-muted-foreground"
            onClick={onViewAll}
          >
            View all {count}
          </Button>
        )}
      </div>
      {isLoading ? (
        <ArchiveRowsSkeleton label={skeletonLabel} meta={skeletonMeta} />
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm"
        >
          <CircleAlert className="size-4 text-destructive" aria-hidden="true" />
          <span className="flex-1 text-muted-foreground">
            Archived {title.toLowerCase()} could not be loaded.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : isEmpty ? (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ArchiveList>{children}</ArchiveList>
      )}
      {footer}
    </section>
  );
}
