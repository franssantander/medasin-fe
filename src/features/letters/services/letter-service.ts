import { axiosClient } from "@/lib/axios";
import type {
  Letter,
  LetterApiResponse,
  LetterExport,
  LetterExportInput,
  LetterExportUpdateInput,
  LetterInput,
  LetterPageResponse,
  LetterUpdateInput,
} from "../type";

const unwrap = <T>(
  request: Promise<{ data: LetterApiResponse<T> }>,
): Promise<LetterApiResponse<T>> => request.then((response) => response.data);

export const letterService = {
  list(page = 1, signal?: AbortSignal) {
    return unwrap(
      axiosClient.get<LetterApiResponse<LetterPageResponse>>("/letters", {
        params: { page, per_page: 15 },
        signal,
      }),
    );
  },

  show(uuid: string, signal?: AbortSignal) {
    return unwrap(
      axiosClient.get<LetterApiResponse<Letter>>(`/letters/${uuid}`, {
        signal,
      }),
    );
  },

  create(input: LetterInput) {
    return unwrap(
      axiosClient.post<LetterApiResponse<Letter>>("/letters", input),
    );
  },

  update(uuid: string, input: LetterUpdateInput) {
    return unwrap(
      axiosClient.patch<LetterApiResponse<Letter>>(
        `/letters/${uuid}`,
        input,
      ),
    );
  },

  remove(uuid: string) {
    return unwrap(
      axiosClient.delete<LetterApiResponse<null>>(`/letters/${uuid}`),
    );
  },

  createExport(letterUuid: string, input: LetterExportInput) {
    return unwrap(
      axiosClient.post<LetterApiResponse<LetterExport>>(
        `/letters/${letterUuid}/exports`,
        input,
      ),
    );
  },

  showExport(letterUuid: string, exportUuid: string, signal?: AbortSignal) {
    return unwrap(
      axiosClient.get<LetterApiResponse<LetterExport>>(
        `/letters/${letterUuid}/exports/${exportUuid}`,
        { signal },
      ),
    );
  },

  updateExport(
    letterUuid: string,
    exportUuid: string,
    input: LetterExportUpdateInput,
  ) {
    return unwrap(
      axiosClient.patch<LetterApiResponse<LetterExport>>(
        `/letters/${letterUuid}/exports/${exportUuid}`,
        input,
      ),
    );
  },
};
