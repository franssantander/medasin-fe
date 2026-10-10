"use client";

import { Link2, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { resourcePreview } from "@/features/resources/resource-document";
import { useResourcesQuery } from "@/features/resources/queries/resource-query";
import {
  ResourceIcon,
  resourceBadgeStyle,
} from "@/features/resources/components/resource-icons";
import { useAttachProjectResources } from "../queries/project-query";

export function ProjectLinkResourcesDialog({
  projectUuid,
  excludedResourceUuids,
  onClose,
}: {
  projectUuid: string;
  excludedResourceUuids: string[];
  onClose: () => void;
}) {
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const resourcesQuery = useResourcesQuery();
  const attachResources = useAttachProjectResources(projectUuid);
  const excluded = useMemo(
    () => new Set(excludedResourceUuids),
    [excludedResourceUuids],
  );
  const resources = useMemo(
    () =>
      resourcesQuery.data?.pages
        .flatMap((page) => page.data.data)
        .filter((resource) => !excluded.has(resource.uuid)) ?? [],
    [excluded, resourcesQuery.data],
  );
  const query = search.trim().toLowerCase();
  const visibleResources = query
    ? resources.filter((resource) =>
        resource.title.toLowerCase().includes(query),
      )
    : resources;

  const toggle = (uuid: string, checked: boolean) => {
    setSelectedUuids((current) =>
      checked
        ? [...current.filter((value) => value !== uuid), uuid]
        : current.filter((value) => value !== uuid),
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !attachResources.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[min(90dvh,44rem)] w-full max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-5 pb-3 pt-5 pr-12">
          <DialogTitle>Link existing resources</DialogTitle>
          <DialogDescription>
            Select one or more resources to add directly to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="shrink-0 px-5 pb-3">
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              autoFocus
              aria-label="Search resources"
              placeholder="Search resources…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
        </div>
        <Separator />

        <div className="workspace-list-scrollbar grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain p-2">
          {resourcesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading resources…
            </div>
          ) : resourcesQuery.isError && !resourcesQuery.isFetchNextPageError ? (
            <div className="grid justify-items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Resources could not be loaded.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => resourcesQuery.refetch()}
              >
                <RefreshCw />
                Try again
              </Button>
            </div>
          ) : visibleResources.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {query
                ? "No resources match your search."
                : "No additional resources are available to link."}
            </p>
          ) : (
            visibleResources.map((resource) => {
              const selected = selectedUuids.includes(resource.uuid);
              const preview =
                resourcePreview(resource.content) ||
                resource.description ||
                resource.url;

              return (
                <label
                  key={resource.uuid}
                  className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60 has-data-checked:bg-primary/5"
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => toggle(resource.uuid, checked)}
                  />
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
                    style={resourceBadgeStyle(resource.background)}
                  >
                    <ResourceIcon name={resource.icon} className="size-4" />
                  </span>
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-sm font-medium">
                      {resource.title}
                    </span>
                    {preview && (
                      <span className="truncate text-xs text-muted-foreground">
                        {preview}
                      </span>
                    )}
                  </span>
                </label>
              );
            })
          )}
          {(resourcesQuery.hasNextPage ||
            resourcesQuery.isFetchNextPageError) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1"
              disabled={resourcesQuery.isFetchingNextPage}
              onClick={() => resourcesQuery.fetchNextPage()}
            >
              {resourcesQuery.isFetchingNextPage ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              {resourcesQuery.isFetchingNextPage
                ? "Loading…"
                : resourcesQuery.isFetchNextPageError
                  ? "Retry loading more"
                  : "Load more"}
            </Button>
          )}
        </div>

        <Separator />
        <DialogFooter className="shrink-0 items-center px-5 py-3 sm:justify-between">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {selectedUuids.length === 0
              ? "Nothing selected"
              : `${selectedUuids.length} selected`}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={attachResources.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedUuids.length === 0 || attachResources.isPending}
              onClick={() =>
                attachResources.mutate(selectedUuids, { onSuccess: onClose })
              }
            >
              {attachResources.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Link2 />
              )}
              {attachResources.isPending
                ? "Linking…"
                : selectedUuids.length > 1
                  ? `Link ${selectedUuids.length} resources`
                  : "Link resource"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
