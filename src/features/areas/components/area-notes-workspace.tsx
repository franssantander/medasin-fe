"use client";

import { useMemo } from "react";
import { NoteWorkspace } from "@/features/notes/components/note-workspace";
import type {
  NoteWorkspaceQueryKeys,
  NoteWorkspaceService,
} from "@/features/notes/type";
import { areaService } from "../services/area-service";
import type { NoteInput } from "../type";

export function AreaNotesWorkspace({
  areaUuid,
  archived,
  initialNoteUuid,
}: {
  areaUuid: string;
  archived: boolean;
  initialNoteUuid?: string;
}) {
  const service = useMemo(() => createAreaNoteService(areaUuid), [areaUuid]);
  const queryKeys = useMemo<NoteWorkspaceQueryKeys>(
    () => ({
      tree: ["areas", "detail", areaUuid, "notes", "tree"],
      detail: (noteUuid) => ["areas", "detail", areaUuid, "notes", noteUuid],
    }),
    [areaUuid],
  );

  return (
    <NoteWorkspace
      service={service}
      queryKeys={queryKeys}
      archived={archived}
      initialNoteUuid={initialNoteUuid}
    />
  );
}

function createAreaNoteService(areaUuid: string): NoteWorkspaceService {
  return {
    tree: () => areaService.noteTree(areaUuid),
    show: (noteUuid) => areaService.note(areaUuid, noteUuid),
    create: (input: NoteInput) => areaService.createNote(areaUuid, input),
    update: (noteUuid, input) =>
      areaService.updateNote(areaUuid, noteUuid, input),
    remove: (noteUuid) => areaService.removeNote(areaUuid, noteUuid),
    uploadMedia: (noteUuid, file) =>
      areaService.uploadNoteMedia(areaUuid, noteUuid, file),
  };
}
