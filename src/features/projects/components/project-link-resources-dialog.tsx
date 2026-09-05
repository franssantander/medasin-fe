"use client";

import { Check, Link2, LoaderCircle, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const toggle = (uuid: string) => {
    setSelectedUuids((current) =>
      current.includes(uuid)
        ? current.filter((value) => value !== uuid)
        : [...current, uuid],
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !attachResources.isPending) onClose();
      }}
    >
      <DialogContent className="w-full max-w-xl overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Link existing resources</DialogTitle>
          <DialogDescription>
            Select one or more resources to add directly to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
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
          ) : resources.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No additional resources are available to link.
            </p>
          ) : (
            resources.map((resource) => {
              const selected = selectedUuids.includes(resource.uuid);
              return (
                <button
                  key={resource.uuid}
                  type="button"
                  aria-pressed={selected}
                  className="flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 aria-pressed:border-primary aria-pressed:bg-primary/5"
                  onClick={() => toggle(resource.uuid)}
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm"
                    style={resourceBadgeStyle(resource.background)}
                  >
                    <ResourceIcon name={resource.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {resource.title}
                  </span>
                  <span className="flex size-5 shrink-0 items-center justify-center rounded border">
                    {selected && <Check className="size-3.5" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {(resourcesQuery.hasNextPage || resourcesQuery.isFetchNextPageError) && (
          <Button
            type="button"
            variant="outline"
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

        <DialogFooter>
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
              : `Link ${selectedUuids.length || "selected"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
