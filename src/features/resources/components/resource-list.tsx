"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  CirclePile,
  File,
  ImageIcon,
  Link2,
  Plus,
  Search,
  Target,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useArchiveResource,
  useResourcesQuery,
  useResourceTagsQuery,
} from "../queries/resource-query";
import { resourcePreview } from "../resource-document";
import type { Resource, ResourceType } from "../type";
import { ResourceFormDialog } from "./resource-form-dialog";
import { ResourceDetailDialog } from "./resource-detail-dialog";
import { ResourceActionDialog } from "./resource-action-dialog";

const types = [
  { value: "note", label: "Notes", icon: BookOpen },
  { value: "link", label: "Links", icon: Link2 },
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "file", label: "Files", icon: File },
] as const;

function formatRelativeTimestamp(value: string | null) {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  );
  const units = [
    { suffix: "y", seconds: 365 * 24 * 60 * 60 },
    { suffix: "mo", seconds: 30 * 24 * 60 * 60 },
    { suffix: "w", seconds: 7 * 24 * 60 * 60 },
    { suffix: "d", seconds: 24 * 60 * 60 },
    { suffix: "h", seconds: 60 * 60 },
    { suffix: "m", seconds: 60 },
  ];

  for (const unit of units) {
    if (elapsedSeconds >= unit.seconds) {
      return `${Math.floor(elapsedSeconds / unit.seconds)}${unit.suffix} ago`;
    }
  }

  return "just now";
}

export function ResourceList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<ResourceType>();
  const [tag, setTag] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Resource>();
  const [archiving, setArchiving] = useState<Resource>();
  const archiveResource = useArchiveResource();
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = useResourcesQuery({
    search: debouncedSearch || undefined,
    type,
    tag_uuid: tag,
  });
  const tags = useResourceTagsQuery();
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = query;
  useEffect(() => {
    if (
      !sentinel.current ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage();
      },
      { root: sentinel.current.closest("main"), rootMargin: "200px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
  const resources = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.data.data)
        .map((resource) => [resource.uuid, resource]),
    ).values(),
  ];
  const filtered = Boolean(search || type || tag);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Resources"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            New resource
          </Button>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside
          className="grid h-fit self-start gap-6 rounded-xl border bg-card p-4"
          aria-label="Resource filters"
        >
          <div className="grid gap-2">
            <h2 className="text-sm font-semibold">Types</h2>
            <Button
              variant={!type ? "secondary" : "ghost"}
              className="justify-start"
              aria-pressed={!type}
              onClick={() => setType(undefined)}
            >
              All resources
            </Button>
            {types.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={type === value ? "secondary" : "ghost"}
                className="justify-start"
                aria-pressed={type === value}
                onClick={() => setType(value)}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </div>
          <div className="grid gap-2">
            <h2 className="text-sm font-semibold">Tags</h2>
            <Button
              variant={!tag ? "secondary" : "ghost"}
              className="justify-start"
              aria-pressed={!tag}
              onClick={() => setTag(undefined)}
            >
              All tags
            </Button>
            {tags.isLoading && <Skeleton className="h-16" />}
            {tags.isError && (
              <Button variant="outline" onClick={() => tags.refetch()}>
                Retry tags
              </Button>
            )}
            <div className="grid max-h-64 gap-1 overflow-y-auto">
              {tags.data?.data.map((item) => (
                <Button
                  key={item.uuid}
                  variant={tag === item.uuid ? "secondary" : "ghost"}
                  className="justify-start truncate"
                  aria-pressed={tag === item.uuid}
                  onClick={() => setTag(item.uuid)}
                >
                  {item.name}
                </Button>
              ))}
            </div>
            {tags.data?.data.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Tags you create will appear here.
              </p>
            )}
          </div>
        </aside>
        <section className="grid min-w-0 gap-4" aria-label="Resources">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="bg-background pl-9"
              aria-label="Search resources"
              placeholder="Search resources…"
              maxLength={255}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {filtered && (
            <Button
              variant="ghost"
              className="justify-self-start"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setType(undefined);
                setTag(undefined);
              }}
            >
              Clear filters
            </Button>
          )}
          {query.isLoading && (
            <div className="grid gap-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-48 rounded-xl" />
              ))}
            </div>
          )}
          {query.isError && !isFetchNextPageError && (
            <Card className="items-center p-6 text-center">
              <p>Resources could not be loaded.</p>
              <Button variant="outline" onClick={() => query.refetch()}>
                Try again
              </Button>
            </Card>
          )}
          {query.data && resources.length === 0 && (
            <Card className="items-center px-6 py-14 text-center">
              <BookOpen className="size-8 text-muted-foreground" />
              <CardTitle>
                {filtered
                  ? "No matching resources"
                  : "Save your first resource"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {filtered
                  ? "Try another search or clear your filters."
                  : "Keep useful notes, links, images, and files in one place."}
              </p>
              {!filtered && (
                <Button onClick={() => setCreating(true)}>
                  <Plus />
                  New resource
                </Button>
              )}
            </Card>
          )}
          {query.data && resources.length > 0 && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {resources.length} of {query.data.pages[0].data.total} resources
            </p>
          )}
          <div className="grid gap-4">
            {resources.map((resource) => {
              const timestamp = resource.updated_at ?? resource.created_at;
              const relativeTimestamp = formatRelativeTimestamp(timestamp);

              return (
                <Card
                  key={resource.uuid}
                  className="relative w-full min-w-0 cursor-pointer gap-3 transition-colors hover:ring-primary/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <button
                    type="button"
                    aria-label={`Open ${resource.title}`}
                    aria-haspopup="dialog"
                    className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none"
                    onClick={() => setSelected(resource)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-4 top-4 z-20"
                    aria-label={`Archive ${resource.title}`}
                    disabled={archiveResource.isPending}
                    onClick={() => setArchiving(resource)}
                  >
                    <Archive />
                  </Button>
                  <CardHeader className="pointer-events-none relative z-10 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="grid min-w-0 gap-2">
                      <CardTitle>
                        <span className="break-words group-hover/card:underline">
                          {resource.title}
                        </span>
                      </CardTitle>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {resource.types.map((value) => {
                          const ResourceTypeIcon = types.find(
                            (item) => item.value === value,
                          )?.icon;

                          return (
                            <span
                              key={value}
                              className="inline-flex items-center gap-1 capitalize"
                            >
                              {ResourceTypeIcon && (
                                <ResourceTypeIcon className="size-3.5" />
                              )}
                              {value}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="pr-10 sm:pr-9">
                      {relativeTimestamp && timestamp && (
                        <time
                          dateTime={timestamp}
                          title={new Date(timestamp).toLocaleString()}
                          className="text-xs whitespace-nowrap text-muted-foreground sm:pt-1"
                        >
                          {relativeTimestamp}
                        </time>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pointer-events-none relative z-10 grid gap-3">
                    <p className="line-clamp-3 break-words text-sm text-muted-foreground">
                      {resourcePreview(resource.content) ||
                        resource.description ||
                        resource.url ||
                        "Open to view this resource."}
                    </p>
                    {resource.attachments.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {resource.attachments.length} attachment
                        {resource.attachments.length === 1 ? "" : "s"}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {resource.tags.map((item) => (
                        <Badge
                          key={item.uuid}
                          variant="outline"
                          className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
                        >
                          {item.name}
                        </Badge>
                      ))}
                    </div>
                    {[...resource.projects, ...resource.areas].length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {resource.projects.map((project) => (
                          <Badge
                            key={project.uuid}
                            variant="outline"
                            render={
                              <Link
                                href={`/projects/${project.uuid}`}
                                aria-label={`Open project ${project.name}`}
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
                                aria-label={`Open area ${area.name}`}
                                className="pointer-events-auto border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                              />
                            }
                          >
                            <CirclePile />
                            Area: {area.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div
            ref={sentinel}
            className="flex min-h-10 flex-col items-center gap-2"
          >
            {isFetchNextPageError && (
              <p role="alert" className="text-sm text-destructive">
                More resources could not be loaded.
              </p>
            )}
            {hasNextPage && (
              <Button
                variant="outline"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage
                  ? "Loading…"
                  : isFetchNextPageError
                    ? "Retry loading more"
                    : "Load more"}
              </Button>
            )}
          </div>
        </section>
      </div>
      {creating && <ResourceFormDialog onClose={() => setCreating(false)} />}
      {selected && (
        <ResourceDetailDialog
          resource={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
      <ResourceActionDialog
        resource={archiving}
        isPending={archiveResource.isPending}
        onOpenChange={(open) => {
          if (!open && !archiveResource.isPending) setArchiving(undefined);
        }}
        onConfirm={() => {
          if (!archiving) return;
          archiveResource.mutate(archiving.uuid, {
            onSuccess: () => setArchiving(undefined),
          });
        }}
      />
    </div>
  );
}
