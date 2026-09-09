import { useQuery } from "@tanstack/react-query";
import { noteService } from "../services/note-service";

export const noteKeys = {
  all: ["notes"] as const,
  tree: () => ["notes", "tree"] as const,
  detail: (noteUuid: string) => ["notes", "detail", noteUuid] as const,
};

export function useNotesTreeQuery(enabled = true) {
  return useQuery({
    queryKey: noteKeys.tree(),
    queryFn: ({ signal }) => noteService.tree(signal),
    enabled,
  });
}

export function useNoteQuery(noteUuid?: string) {
  return useQuery({
    queryKey: noteKeys.detail(noteUuid ?? ""),
    queryFn: ({ signal }) => noteService.show(noteUuid!, signal),
    enabled: Boolean(noteUuid),
  });
}
