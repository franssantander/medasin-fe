"use client";

import { useMemo, useState } from "react";
import { RestoreConfirmDialog } from "@/components/shared/restore-confirm-dialog";
import { ArchiveRow } from "@/features/archives/components/archive-list";
import { useAreaMutation, useAreasQuery } from "../queries/area-query";
import type { Area } from "../type";
import { AreaIcon, areaBadgeStyle } from "./area-icons";

function archivedTime(value: string | null) {
  return value ? new Date(value).getTime() || 0 : 0;
}

export function useArchivedAreas(search: string) {
  const query = useAreasQuery("archived");
  const term = search.trim().toLowerCase();
  const items = useMemo(
    () =>
      (query.data?.data ?? [])
        .filter((area) => !term || area.name.toLowerCase().includes(term))
        .sort((a, b) => archivedTime(b.archived_at) - archivedTime(a.archived_at)),
    [query.data, term],
  );
  return { query, items, total: query.data?.data.length };
}

export function ArchivedAreaRow({ area }: { area: Area }) {
  const restore = useAreaMutation("restore", area.uuid);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <ArchiveRow
        media={
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={areaBadgeStyle(area.background)}
            aria-hidden="true"
          >
            <AreaIcon name={area.icon} className="size-4" />
          </div>
        }
        title={area.name}
        secondary={area.description || "No description"}
        archivedAt={area.archived_at}
        openLabel={`Open ${area.name}`}
        href={`/archives/areas/${area.uuid}`}
        restoring={restore.isPending}
        onRestore={() => setConfirming(true)}
      />
      <RestoreConfirmDialog
        open={confirming}
        kind="area"
        name={area.name}
        isPending={restore.isPending}
        onOpenChange={setConfirming}
        onConfirm={() =>
          restore.mutate(undefined, { onSuccess: () => setConfirming(false) })
        }
      />
    </>
  );
}
