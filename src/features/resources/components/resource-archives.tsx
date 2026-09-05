"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArchiveRestore,
  BookOpen,
  CalendarDays,
  CirclePile,
  File,
  ImageIcon,
  Link2,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  useResourcesQuery,
  useRestoreResource,
} from "../queries/resource-query";
import { resourcePreview } from "../resource-document";
import type { Resource, ResourceType } from "../type";
import { ResourceDetailDialog } from "./resource-detail-dialog";
import { ResourceIcon, resourceBadgeStyle } from "./resource-icons";

const typeIcons: Record<ResourceType, typeof BookOpen> = {
  note: BookOpen,
  link: Link2,
  image: ImageIcon,
  file: File,
};

export function ResourceArchives() {
  const query = useResourcesQuery({ status: "archived" });
  const [selected, setSelected] = useState<Resource>();
  const resources = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.data.data)
        .map((resource) => [resource.uuid, resource]),
    ).values(),
  ];
  const total = query.data?.pages[0].data.total;

  return (
    <section className="grid gap-5" aria-labelledby="archived-resources-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="archived-resources-title" className="font-bold text-lg">
            Archived resources
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Restore a resource when you want it available in your active
            resource library again.
          </p>
        </div>
        {total !== undefined && (
          <Badge variant="secondary" className="tabular-nums">
            {total} archived
          </Badge>
        )}
      </div>

      {query.isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-48 rounded-xl" />
          ))}
        </div>
      )}

      {query.isError && !query.isFetchNextPageError && (
        <Card className="items-center py-10 text-center">
          <CardTitle>Archived resources could not be loaded</CardTitle>
          <CardDescription>
            Check your connection and try again.
          </CardDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {query.data && resources.length === 0 && (
        <Card className="items-center py-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <BookOpen className="size-6" />
          </div>
          <CardTitle>No archived resources</CardTitle>
          <CardDescription className="max-w-sm">
            Resources you archive will appear here until you restore them.
          </CardDescription>
        </Card>
      )}

      {resources.length > 0 && (
        <div className="grid gap-4">
          {resources.map((resource) => (
            <ArchivedResourceCard
              key={resource.uuid}
              resource={resource}
              onOpen={() => setSelected(resource)}
            />
          ))}
        </div>
      )}

      {query.isFetchNextPageError && (
        <p role="alert" className="text-sm text-destructive">
          More archived resources could not be loaded.
        </p>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="justify-self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}

      {selected && (
        <ResourceDetailDialog
          resource={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </section>
  );
}

function ArchivedResourceCard({
  resource,
  onOpen,
}: {
  resource: Resource;
  onOpen: () => void;
}) {
  const restore = useRestoreResource();

  return (
    <Card className="relative w-full min-w-0 cursor-pointer gap-3 transition-colors hover:ring-primary/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
      <button
        type="button"
        aria-label={`Open ${resource.title}`}
        aria-haspopup="dialog"
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none"
        onClick={onOpen}
      />
      <CardHeader className="pointer-events-none relative z-10 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid min-w-0 gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={resourceBadgeStyle(resource.background)}
            >
              <ResourceIcon name={resource.icon} className="size-5" />
            </div>
            <CardTitle className="break-words">{resource.title}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {resource.types.map((type) => {
              const Icon = typeIcons[type];
              return (
                <span key={type} className="inline-flex items-center gap-1 capitalize">
                  <Icon className="size-3.5" />
                  {type}
                </span>
              );
            })}
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground sm:pt-1">
          <CalendarDays className="size-3.5" />
          {resource.archived_at
            ? `Archived ${formatDate(resource.archived_at)}`
            : "Archived"}
        </span>
      </CardHeader>
      <CardContent className="pointer-events-none relative z-10 grid gap-3">
        <p className="line-clamp-3 break-words text-sm text-muted-foreground">
          {resourcePreview(resource.content) ||
            resource.description ||
            resource.url ||
            "Open to view this resource."}
        </p>
        <div className="flex flex-wrap gap-1">
          {resource.tags.map((tag) => (
            <Badge
              key={tag.uuid}
              variant="outline"
              className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
            >
              {tag.name}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {resource.projects.map((project) => (
            <Badge
              key={project.uuid}
              variant="outline"
              render={
                <Link
                  href={`/projects/${project.uuid}`}
                  className="pointer-events-auto border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                />
              }
            >
              <Target />
              Project: {project.name}
            </Badge>
          ))}
          {resource.areas.map((area) => (
            <Badge
              key={area.uuid}
              variant="outline"
              render={
                <Link
                  href={`/areas/${area.uuid}`}
                  className="pointer-events-auto border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                />
              }
            >
              <CirclePile />
              Area: {area.name}
            </Badge>
          ))}
        </div>
        <Separator />
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="pointer-events-auto relative z-10"
            disabled={restore.isPending}
            onClick={() => restore.mutate(resource.uuid)}
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
