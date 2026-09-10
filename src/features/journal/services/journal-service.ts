import { axiosClient } from "@/lib/axios";
import type {
  JournalApiResponse,
  JournalEntry,
  JournalEntryInput,
  JournalEntryUpdateInput,
  JournalPage,
} from "../type";

const unwrap = <T>(
  request: Promise<{ data: JournalApiResponse<T> }>,
): Promise<JournalApiResponse<T>> => request.then((response) => response.data);

export const journalService = {
  list(page = 1, signal?: AbortSignal) {
    return unwrap(
      axiosClient.get<JournalApiResponse<JournalPage>>("/journal", {
        params: { page, per_page: 15 },
        signal,
      }),
    );
  },

  show(uuid: string, signal?: AbortSignal) {
    return unwrap(
      axiosClient.get<JournalApiResponse<JournalEntry>>(`/journal/${uuid}`, {
        signal,
      }),
    );
  },

  create(input: JournalEntryInput) {
    return unwrap(
      axiosClient.post<JournalApiResponse<JournalEntry>>("/journal", input),
    );
  },

  update(uuid: string, input: JournalEntryUpdateInput) {
    return unwrap(
      axiosClient.patch<JournalApiResponse<JournalEntry>>(
        `/journal/${uuid}`,
        input,
      ),
    );
  },

  remove(uuid: string) {
    return unwrap(
      axiosClient.delete<JournalApiResponse<null>>(`/journal/${uuid}`),
    );
  },
};
