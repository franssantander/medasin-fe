"use client";

import { ArchiveRestore, Layers3 } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/shared/page-header";
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
    <div className="grid gap-6">
      <PageHeader title="Archives" />
      {query.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-40 rounded-xl" />
          ))}
        </div>
      )}
      {query.isError && (
        <Card className="items-center py-12">
          <CardTitle>Archives could not be loaded</CardTitle>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </Card>
      )}
      {query.data?.data.length === 0 && (
        <Card className="items-center py-14 text-center">
          <div className="rounded-full bg-muted p-3">
            <Layers3 />
          </div>
          <CardTitle>No archived areas</CardTitle>
          <CardDescription>Areas you archive will appear here.</CardDescription>
        </Card>
      )}
      {query.data && query.data.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {query.data.data.map((area) => (
            <ArchivedAreaCard key={area.uuid} area={area} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivedAreaCard({ area }: { area: Area }) {
  const restore = useAreaMutation("restore", area.uuid);
  return (
    <Card className="relative gap-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        href={`/archives/areas/${area.uuid}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Open ${area.name}`}
      />
      <CardContent className="pointer-events-none gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={areaBadgeStyle(area.background)}
          >
            <AreaIcon name={area.icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{area.name}</CardTitle>
            <CardDescription>
              {area.archived_at
                ? `Archived ${formatDate(area.archived_at)}`
                : "Archived"}
            </CardDescription>
          </div>
        </div>
        {area.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {area.description}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="pointer-events-auto relative z-10 self-start"
          disabled={restore.isPending}
          onClick={() => restore.mutate()}
        >
          <ArchiveRestore />
          {restore.isPending ? "Restoring…" : "Restore"}
        </Button>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
