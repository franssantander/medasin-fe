import { areaKeys } from "../queries/area-query";
import { areaService } from "./area-service";
import type {
  NoteWorkspaceCollection,
  NoteWorkspaceQueryKeys,
  NoteWorkspaceService,
} from "@/features/notes/type";

export function createAreaNoteWorkspaceCollection({
  areaUuid,
  areaName,
  archived,
  canCreate = false,
}: {
  areaUuid: string;
  areaName: string;
  archived: boolean;
  canCreate?: boolean;
}): NoteWorkspaceCollection {
  return {
    key: `area:${areaUuid}`,
    label: areaName,
    archived,
    canCreate,
    service: createAreaNoteService(areaUuid),
    queryKeys: createAreaNoteQueryKeys(areaUuid),
  };
}

function createAreaNoteQueryKeys(areaUuid: string): NoteWorkspaceQueryKeys {
  return {
    tree: areaKeys.noteTree(areaUuid),
    detail: (noteUuid) => areaKeys.noteDetail(areaUuid, noteUuid),
  };
}

function createAreaNoteService(areaUuid: string): NoteWorkspaceService {
  return {
    tree: (signal) => areaService.noteTree(areaUuid, signal),
    show: (noteUuid, signal) => areaService.note(areaUuid, noteUuid, signal),
    create: (input) => areaService.createNote(areaUuid, input),
    update: (noteUuid, input) =>
      areaService.updateNote(areaUuid, noteUuid, input),
    remove: (noteUuid) => areaService.removeNote(areaUuid, noteUuid),
    uploadMedia: (noteUuid, file) =>
      areaService.uploadNoteMedia(areaUuid, noteUuid, file),
  };
}
