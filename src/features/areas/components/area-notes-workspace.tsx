"use client";

import { useMemo } from "react";
import { NoteWorkspace } from "@/features/notes/components/note-workspace";
import type { NoteWorkspaceCollection } from "@/features/notes/type";
import { createAreaNoteWorkspaceCollection } from "../services/area-note-workspace-service";

export function AreaNotesWorkspace({
  areaUuid,
  archived,
  initialNoteUuid,
}: {
  areaUuid: string;
  archived: boolean;
  initialNoteUuid?: string;
}) {
  const collection = useMemo<NoteWorkspaceCollection>(
    () =>
      createAreaNoteWorkspaceCollection({
        areaUuid,
        areaName: "Area notes",
        archived,
        canCreate: !archived,
      }),
    [areaUuid, archived],
  );
  const collections = useMemo(() => [collection], [collection]);

  return (
    <NoteWorkspace
      collections={collections}
      initialNoteUuid={initialNoteUuid}
    />
  );
}
