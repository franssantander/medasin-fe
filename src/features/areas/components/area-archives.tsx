"use client";

import { ArchiveRestore, CalendarDays, CirclePile } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreaMutation, useAreasQuery } from "../queries/area-query";
import type { Area } from "../type";
import { AreaIcon, areaBadgeStyle } from "./area-icons";

export function AreaArchives() {
  const query = useAreasQuery("archived");

  return (
    <section className="grid gap-5" aria-labelledby="archived-areas-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CirclePile className="size-4" />
          </div>
          <div>
            <h2 id="archived-areas-title" className="font-semibold">
              Archived areas
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Restore an area to continue organizing its projects, goals,
              habits, notes, and resources.
            </p>
          </div>
        </div>
        {query.data && (
          <Badge variant="secondary" className="tabular-nums">
            {query.data.data.length} archived
          </Badge>
        )}
      </div>

      {query.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-56 rounded-xl" />
          ))}
        </div>
      )}

      {query.isError && (
        <Card className="items-center py-12 text-center">
          <CardTitle>Archived areas could not be loaded</CardTitle>
          <CardDescription>
            Check your connection and try again.
          </CardDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {query.data?.data.length === 0 && (
        <Card className="items-center py-14 text-center">
          <div className="rounded-full bg-muted p-3">
            <CirclePile className="size-6" />
          </div>
          <CardTitle>No archived areas</CardTitle>
          <CardDescription className="max-w-sm">
            Areas you archive will appear here until you restore them.
          </CardDescription>
        </Card>
      )}

      {query.data && query.data.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {query.data.data.map((area) => (
            <ArchivedAreaCard key={area.uuid} area={area} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArchivedAreaCard({ area }: { area: Area }) {
  const restore = useAreaMutation("restore", area.uuid);

  return (
    <Card className="relative h-full gap-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/archives/areas/${area.uuid}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Open ${area.name}`}
      />
      <CardContent className="pointer-events-none h-full gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={areaBadgeStyle(area.background)}
          >
            <AreaIcon name={area.icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{area.name}</CardTitle>
            <CardDescription>Archived area</CardDescription>
          </div>
        </div>
        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {area.description || "No description was added to this area."}
        </p>
        <div>
          <Badge variant="outline">Area</Badge>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {area.archived_at
              ? `Archived ${formatDate(area.archived_at)}`
              : "Archived"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="pointer-events-auto relative z-10"
            disabled={restore.isPending}
            onClick={() => restore.mutate()}
          >
            <ArchiveRestore />
            {restore.isPending ? "Restoring…" : "Restore"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
