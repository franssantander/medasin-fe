"use client";

import { ArchiveRestore, ArrowRight, Layers3 } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreaMutation, useAreasQuery } from "../queries/area-query";
import type { Area } from "../type";

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
    <Card>
      <CardHeader>
        <CardTitle>
          {area.icon && <span className="mr-2">{area.icon}</span>}
          {area.name}
        </CardTitle>
        <CardDescription>
          {area.archived_at
            ? `Archived ${formatDate(area.archived_at)}`
            : "Archived"}
        </CardDescription>
        <CardAction>
          <Button
            render={<Link href={`/areas/${area.uuid}`} />}
            variant="ghost"
            size="icon-sm"
            aria-label={`Open ${area.name}`}
          >
            <ArrowRight />
          </Button>
        </CardAction>
      </CardHeader>
      {area.description && (
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {area.description}
          </p>
        </CardContent>
      )}
      <CardContent className="mt-auto flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={restore.isPending}
          onClick={() => restore.mutate()}
        >
          <ArchiveRestore />
          Restore
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
