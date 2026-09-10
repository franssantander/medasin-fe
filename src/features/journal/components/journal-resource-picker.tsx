"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Link2,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useResourcesQuery } from "@/features/resources/queries/resource-query";
import {
  ResourceIcon,
  resourceBadgeStyle,
} from "@/features/resources/components/resource-icons";
import type { Resource } from "@/features/resources/type";
import type { JournalResource } from "../type";

const MAX_LINKED_RESOURCES = 100;

export type JournalResourcePickerResult = {
  resourceUuids: string[];
  activeResources: Resource[];
};

export function JournalResourcePicker({
  open,
  selectedUuids,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  selectedUuids: string[];
  onOpenChange: (open: boolean) => void;
  onApply: (result: JournalResourcePickerResult) => void;
}) {
  const [search, setSearch] = useState("");
  const [draftUuids, setDraftUuids] = useState(selectedUuids);
  const resourcesQuery = useResourcesQuery({ status: "active" }, open);

  const resources = useMemo(
    () =>
      [
        ...new Map(
          resourcesQuery.data?.pages
            .flatMap((page) => page.data.data)
            .map((resource) => [resource.uuid, resource]),
        ).values(),
      ],
    [resourcesQuery.data],
  );
  const filteredResources = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return resources;

    return resources.filter((resource) =>
      [
        resource.title,
        resource.description,
        resource.author,
        resource.source,
        resource.url,
        ...resource.types,
        ...resource.tags.map((tag) => tag.name),
      ]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query)),
    );
  }, [resources, search]);

  const toggle = (uuid: string) => {
    setDraftUuids((current) =>
      current.includes(uuid)
        ? current.filter((value) => value !== uuid)
        : current.length >= MAX_LINKED_RESOURCES
          ? current
          : [...current, uuid],
    );
  };

  const submit = () => {
    onApply({
      resourceUuids: draftUuids,
      activeResources: resources.filter((resource) =>
        draftUuids.includes(resource.uuid),
      ),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Link resources</DialogTitle>
          <DialogDescription>
            Select active resources to keep beside this journal entry. You can
            link up to {MAX_LINKED_RESOURCES} resources.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            className="pl-9"
            placeholder="Search resources…"
            aria-label="Search active resources"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="grid max-h-[50vh] min-h-48 gap-2 overflow-y-auto overflow-x-hidden pr-1">
          {resourcesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Loading resources…
            </div>
          ) : resourcesQuery.isError && !resourcesQuery.isFetchNextPageError ? (
            <div className="grid content-center justify-items-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Resources could not be loaded.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void resourcesQuery.refetch()}
              >
                <RefreshCw data-icon="inline-start" />
                Try again
              </Button>
            </div>
          ) : filteredResources.length === 0 ? (
            <p className="self-center px-4 text-center text-sm text-muted-foreground">
              {resources.length === 0
                ? "No active resources are available to link."
                : "No resources match your search."}
            </p>
          ) : (
            filteredResources.map((resource) => (
              <ResourcePickerRow
                key={resource.uuid}
                resource={resource}
                selected={draftUuids.includes(resource.uuid)}
                disabled={
                  !draftUuids.includes(resource.uuid) &&
                  draftUuids.length >= MAX_LINKED_RESOURCES
                }
                onToggle={toggle}
              />
            ))
          )}
        </div>

        {(resourcesQuery.hasNextPage || resourcesQuery.isFetchNextPageError) && (
          <Button
            type="button"
            variant="outline"
            disabled={resourcesQuery.isFetchingNextPage}
            onClick={() => void resourcesQuery.fetchNextPage()}
          >
            {resourcesQuery.isFetchingNextPage ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            {resourcesQuery.isFetchingNextPage
              ? "Loading…"
              : resourcesQuery.isFetchNextPageError
                ? "Retry loading more"
                : "Load more resources"}
          </Button>
        )}

        <DialogFooter className="sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {draftUuids.length} selected
          </span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submit}>
              <Link2 data-icon="inline-start" />
              Apply links
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResourcePickerRow({
  resource,
  selected,
  disabled,
  onToggle,
}: {
  resource: Resource;
  selected: boolean;
  disabled: boolean;
  onToggle: (uuid: string) => void;
}) {
  const description =
    resource.author ||
    resource.source ||
    resource.description ||
    resource.url ||
    "No details.";

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className="flex min-w-0 items-start gap-3 rounded-xl border p-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5 disabled:pointer-events-none disabled:opacity-50"
      onClick={() => onToggle(resource.uuid)}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={resourceBadgeStyle(resource.background)}
      >
        <ResourceIcon name={resource.icon} className="size-5" />
      </span>
      <span className="grid min-w-0 flex-1 gap-1.5">
        <span className="truncate text-sm font-medium">{resource.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {description}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {resource.types.map((type) => (
            <Badge key={type} variant="secondary" className="capitalize">
              {type}
            </Badge>
          ))}
        </span>
      </span>
      <span
        className="mt-2 flex size-5 shrink-0 items-center justify-center rounded border border-input bg-background"
        aria-hidden="true"
      >
        {selected && <Check className="size-3.5" />}
      </span>
    </button>
  );
}

export function toJournalResource(resource: Resource): JournalResource {
  return {
    uuid: resource.uuid,
    title: resource.title,
    type: resource.type ?? resource.types[0] ?? null,
    archived_at: resource.archived_at,
  };
}
