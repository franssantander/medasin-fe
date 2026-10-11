"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
        <div className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-3 rounded-xl border bg-card p-8 text-center">
          <h1 className="text-base font-semibold">Notes</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your Areas could not be loaded, so their notes can&apos;t be shown
            yet.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void areasQuery.refetch()}
          >
            Try again
          </Button>
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
