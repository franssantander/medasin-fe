"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import { createAreaNoteWorkspaceCollection } from "@/features/areas/services/area-note-workspace-service";
import type { NoteWorkspaceCollection } from "@/features/notes/type";
import { NoteWorkspace } from "./note-workspace";
import { noteKeys } from "../queries/note-query";
import { noteService } from "../services/note-service";

const queryKeys = {
  tree: noteKeys.tree(),
  detail: noteKeys.detail,
};

const standaloneCollection: NoteWorkspaceCollection = {
  key: "standalone",
  label: "Notes",
  archived: false,
  canCreate: true,
  service: noteService,
  queryKeys,
};

export function NotesPage({ initialNoteUuid }: { initialNoteUuid?: string }) {
  const areasQuery = useQuery({
    queryKey: areaKeys.list("all"),
    queryFn: () => areaService.list("all"),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const collections = useMemo(
    () => [
      standaloneCollection,
      ...(areasQuery.data?.data ?? []).map((area) =>
        createAreaNoteWorkspaceCollection({
          areaUuid: area.uuid,
          areaName: area.name,
          archived: Boolean(area.archived_at),
        }),
      ),
    ],
    [areasQuery.data],
  );

  return (
    <div className="h-full min-h-0 min-w-0">
      {areasQuery.isError ? (
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-5">
          <PageHeader
            title="Notes"
            description="Capture ideas, write freely, and keep related pages together."
          />
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border bg-card p-8 text-center">
            <div className="grid max-w-sm gap-3">
              <h2 className="font-semibold">Could not load Areas</h2>
              <p className="text-sm text-muted-foreground">
                Area notes could not be synchronized with the standalone Notes
                page.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void areasQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <NoteWorkspace
          collections={collections}
          initialNoteUuid={initialNoteUuid}
          presentation="journal"
        />
      )}
    </div>
  );
}
