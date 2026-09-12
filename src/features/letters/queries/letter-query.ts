import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { letterService } from "../services/letter-service";
import type {
  Letter,
  LetterApiResponse,
  LetterExportFormat,
  LetterExportUpdateInput,
  LetterPageResponse,
  LetterSummary,
} from "../type";

export const letterKeys = {
  all: ["letters"] as const,
  list: () => ["letters", "list"] as const,
  detail: (uuid: string) => ["letters", "detail", uuid] as const,
  export: (letterUuid: string, exportUuid: string) =>
    ["letters", "export", letterUuid, exportUuid] as const,
};

type LetterListData = InfiniteData<
  LetterApiResponse<LetterPageResponse>,
  number
>;

function summaryFromLetter(letter: Letter): LetterSummary {
  const summary = { ...letter };
  delete (summary as { content?: string }).content;
  return summary;
}

export function upsertLetterCache(
  queryClient: QueryClient,
  letter: Letter,
  prependIfMissing = false,
) {
  const summary = summaryFromLetter(letter);

  queryClient.setQueryData<LetterApiResponse<Letter>>(
    letterKeys.detail(letter.uuid),
    (current) =>
      current
        ? { ...current, data: letter }
        : {
            data: letter,
            status: 200,
            message: "Letter loaded.",
          },
  );

  queryClient.setQueryData<LetterListData>(letterKeys.list(), (current) => {
    if (!current) return current;

    const exists = current.pages.some((page) =>
      page.data.data.some((item) => item.uuid === letter.uuid),
    );
    const pages = current.pages.map((page, pageIndex) => {
      const items = page.data.data.map((item) =>
        item.uuid === letter.uuid ? summary : item,
      );

      if (prependIfMissing && !exists && pageIndex === 0) {
        return {
          ...page,
          data: {
            ...page.data,
            data: [summary, ...items].slice(0, page.data.per_page),
            total: page.data.total + 1,
            last_page: Math.ceil((page.data.total + 1) / page.data.per_page),
          },
        };
      }

      return { ...page, data: { ...page.data, data: items } };
    });

    return { ...current, pages };
  });
}

export function removeLetterFromCache(queryClient: QueryClient, uuid: string) {
  queryClient.removeQueries({ queryKey: letterKeys.detail(uuid) });
  queryClient.setQueryData<LetterListData>(letterKeys.list(), (current) => {
    if (!current) return current;

    const existed = current.pages.some((page) =>
      page.data.data.some((item) => item.uuid === uuid),
    );
    if (!existed) return current;

    const pages = current.pages.map((page) => {
      const total = Math.max(0, page.data.total - 1);
      return {
        ...page,
        data: {
          ...page.data,
          data: page.data.data.filter((item) => item.uuid !== uuid),
          total,
          last_page: Math.max(1, Math.ceil(total / page.data.per_page)),
        },
      };
    });

    return { ...current, pages };
  });
}

export function useLettersQuery() {
  return useInfiniteQuery({
    queryKey: letterKeys.list(),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => letterService.list(pageParam, signal),
    getNextPageParam: (lastPage) =>
      lastPage.data.current_page < lastPage.data.last_page
        ? lastPage.data.current_page + 1
        : undefined,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useLetterQuery(uuid?: string) {
  return useQuery({
    queryKey: letterKeys.detail(uuid ?? ""),
    queryFn: ({ signal }) => letterService.show(uuid!, signal),
    enabled: Boolean(uuid),
  });
}

export function useCreateLetterExportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ letterUuid, format }: { letterUuid: string; format: LetterExportFormat }) =>
      letterService.createExport(letterUuid, { format }),
    onSuccess: (response, variables) => {
      const letterUuid = response.data.letter_uuid ?? variables.letterUuid;
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: letterKeys.detail(letterUuid),
        }),
        queryClient.invalidateQueries({ queryKey: letterKeys.list() }),
      ]);
      toast.add({ type: "info", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}

export function useLetterExportQuery(
  letterUuid?: string,
  exportUuid?: string,
) {
  return useQuery({
    queryKey: letterKeys.export(letterUuid ?? "", exportUuid ?? ""),
    queryFn: ({ signal }) => letterService.showExport(letterUuid!, exportUuid!, signal),
    enabled: Boolean(letterUuid && exportUuid),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      return status === "queued" || status === "processing" ? 1500 : false;
    },
  });
}

export function useUpdateLetterExportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      letterUuid,
      exportUuid,
      input,
    }: {
      letterUuid: string;
      exportUuid: string;
      input: LetterExportUpdateInput;
    }) => letterService.updateExport(letterUuid, exportUuid, input),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(
        letterKeys.export(variables.letterUuid, variables.exportUuid),
        response,
      );
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: letterKeys.detail(variables.letterUuid),
        }),
        queryClient.invalidateQueries({ queryKey: letterKeys.list() }),
      ]);
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}

export function useDeleteLetterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: letterService.remove,
    onSuccess: async (response, uuid) => {
      removeLetterFromCache(queryClient, uuid);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: letterKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["trash"] }),
      ]);
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}
