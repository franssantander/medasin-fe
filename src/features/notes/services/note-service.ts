import { axiosClient } from "@/lib/axios";
import type {
  Note,
  NoteApiResponse,
  NoteInput,
  NoteMedia,
  NotePaginated,
  NoteTreeNode,
  NoteUpdateInput,
} from "../type";

const unwrap = <T>(
  request: Promise<{ data: NoteApiResponse<T> }>,
): Promise<NoteApiResponse<T>> => request.then((response) => response.data);

export const noteService = {
  list(page = 1, signal?: AbortSignal) {
    return unwrap(
      axiosClient.get<NoteApiResponse<NotePaginated<Note>>>("/notes", {
        params: { page },
        signal,
      }),
    );
  },

  tree(signal?: AbortSignal) {
    return unwrap(
      axiosClient.get<NoteApiResponse<NoteTreeNode[]>>("/notes/tree", {
        signal,
      }),
    );
  },

  show(noteUuid: string, signal?: AbortSignal) {
    return unwrap(
      axiosClient.get<NoteApiResponse<Note>>(`/notes/${noteUuid}`, {
        signal,
      }),
    );
  },

  create(input: NoteInput) {
    return unwrap(
      axiosClient.post<NoteApiResponse<Note>>("/notes", input),
    );
  },

  update(noteUuid: string, input: NoteUpdateInput) {
    return unwrap(
      axiosClient.patch<NoteApiResponse<Note>>(`/notes/${noteUuid}`, input),
    );
  },

  remove(noteUuid: string) {
    return unwrap(
      axiosClient.delete<NoteApiResponse<null>>(`/notes/${noteUuid}`),
    );
  },

  uploadMedia(noteUuid: string, file: File) {
    const data = new FormData();
    data.append("file", file);

    return unwrap(
      axiosClient.post<NoteApiResponse<NoteMedia>>(
        `/notes/${noteUuid}/media`,
        data,
        { timeout: 120000 },
      ),
    );
  },
};
