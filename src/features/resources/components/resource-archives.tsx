"use client";

import { useEffect, useMemo, useState } from "react";
import { RestoreConfirmDialog } from "@/components/shared/restore-confirm-dialog";
import { ArchiveRow } from "@/features/archives/components/archive-list";
import { useResourcesQuery, useRestoreResource } from "../queries/resource-query";
import type { Resource } from "../type";
import {
  ResourceIconTile,
  resourceSummary,
  resourceTypeOption,
} from "./resource-list-meta";

export function useArchivedResources(search: string) {
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = useResourcesQuery({
    status: "archived",
    search: debouncedSearch || undefined,
  });
  const items = useMemo(
    () => [
      ...new Map(
        query.data?.pages
          .flatMap((page) => page.data.data)
          .map((resource) => [resource.uuid, resource]),
      ).values(),
    ],
    [query.data],
  );
  return { query, items, total: query.data?.pages[0].data.total };
}

export function ArchivedResourceRow({
  resource,
  onOpen,
}: {
  resource: Resource;
  onOpen: () => void;
}) {
  const restore = useRestoreResource();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <ArchiveRow
        media={<ResourceIconTile resource={resource} />}
        title={resource.title}
        secondary={resourceSummary(resource) || "No preview"}
        meta={
          resource.types.length > 0 ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {resource.types.map((value) => {
                const option = resourceTypeOption(value);
                const Icon = option?.icon;
                if (!Icon) return null;
                return (
                  <span key={value} title={option.label} className="inline-flex">
                    <Icon className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{option.label}</span>
                  </span>
                );
              })}
            </span>
          ) : null
        }
        archivedAt={resource.archived_at}
        openLabel={`Open ${resource.title}`}
        onOpen={onOpen}
        restoring={restore.isPending}
        onRestore={() => setConfirming(true)}
      />
      <RestoreConfirmDialog
        open={confirming}
        kind="resource"
        name={resource.title}
        isPending={restore.isPending}
        onOpenChange={setConfirming}
        onConfirm={() =>
          restore.mutate(resource.uuid, { onSuccess: () => setConfirming(false) })
        }
      />
    </>
  );
}
