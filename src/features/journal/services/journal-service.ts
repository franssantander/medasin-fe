import { axiosClient } from "@/lib/axios";
import type {
  JournalApiResponse,
  JournalEntry,
  JournalEntryInput,
  JournalEntrySummary,
  JournalEntryUpdateInput,
  JournalPage,
} from "../type";

const unwrap = <T>(
  request: Promise<{ data: JournalApiResponse<T> }>,
): Promise<JournalApiResponse<T>> => request.then((response) => response.data);

export const journalService = {
  async findFocusReflection(
    sessionUuid: string,
    signal?: AbortSignal,
  ): Promise<JournalEntrySummary | null> {
    let page = 1;
    while (!signal?.aborted) {
      const response = await journalService.list(page, signal);
      const entry = response.data.data.find(
        (item) => item.source?.session_uuid === sessionUuid,
      );
      if (entry) return entry;
      if (response.data.current_page >= response.data.last_page) return null;
      page = response.data.current_page + 1;
    }
    signal?.throwIfAborted();
    return null;
  },

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
