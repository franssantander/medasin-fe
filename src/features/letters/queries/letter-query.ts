import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { parseApiError } from "@/lib/axios";
import { letterService } from "../services/letter-service";
import type {
  Letter,
  LetterApiResponse,
  LetterExportFormat,
  LetterExportPageInput,
  LetterExportUpdateInput,
  LetterListParams,
  LetterPageResponse,
  LetterSummary,
} from "../type";

export const letterKeys = {
  all: ["letters"] as const,
  lists: () => ["letters", "list"] as const,
  list: (params: LetterListParams) => ["letters", "list", params] as const,
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

  queryClient
    .getQueriesData<LetterListData>({ queryKey: letterKeys.lists() })
    .forEach(([queryKey, current]) => {
      if (!current) return;

      const params = queryKey[2] as LetterListParams | undefined;
      const exists = current.pages.some((page) =>
        page.data.data.some((item) => item.uuid === letter.uuid),
      );
      // A new letter is an untitled draft, so it only belongs at the top of
      // the unfiltered list; filtered lists catch up on their next fetch.
      const prepend =
        prependIfMissing &&
        !exists &&
        params?.filter === "all" &&
        !params.search;
      if (!exists && !prepend) return;

      const pages = current.pages.map((page, pageIndex) => {
        const items = page.data.data.map((item) =>
          item.uuid === letter.uuid ? summary : item,
        );

        if (prepend && pageIndex === 0) {
          const total = page.data.total + 1;
          return {
            ...page,
            data: {
              ...page.data,
              data: [summary, ...items].slice(0, page.data.per_page),
              total,
              last_page: Math.ceil(total / page.data.per_page),
              counts: page.data.counts && {
                ...page.data.counts,
                all: page.data.counts.all + 1,
                [summary.done_at ? "done" : "draft"]:
                  page.data.counts[summary.done_at ? "done" : "draft"] + 1,
              },
            },
          };
        }

        return { ...page, data: { ...page.data, data: items } };
      });

      queryClient.setQueryData<LetterListData>(queryKey, { ...current, pages });
    });
}

export function removeLetterFromCache(queryClient: QueryClient, uuid: string) {
  queryClient.removeQueries({ queryKey: letterKeys.detail(uuid) });
  queryClient.setQueriesData<LetterListData>(
    { queryKey: letterKeys.lists() },
    (current) => {
      if (!current) return current;

      const removed = current.pages
        .flatMap((page) => page.data.data)
        .find((item) => item.uuid === uuid);
      if (!removed) return current;
      const bucket = removed.done_at ? "done" : "draft";

      const pages = current.pages.map((page) => {
        const total = Math.max(0, page.data.total - 1);
        return {
          ...page,
          data: {
            ...page.data,
            data: page.data.data.filter((item) => item.uuid !== uuid),
            total,
            last_page: Math.max(1, Math.ceil(total / page.data.per_page)),
            counts: page.data.counts && {
              ...page.data.counts,
              all: Math.max(0, page.data.counts.all - 1),
              [bucket]: Math.max(0, page.data.counts[bucket] - 1),
            },
          },
        };
      });

      return { ...current, pages };
    },
  );
}

export function useLettersQuery(params: LetterListParams) {
  return useInfiniteQuery({
    queryKey: letterKeys.list(params),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      letterService.list(pageParam, params, signal),
    // Keep the current rows on screen while another tab or search loads.
    placeholderData: keepPreviousData,
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
    mutationFn: ({
      letterUuid,
      format,
      pages,
    }: {
      letterUuid: string;
      format: LetterExportFormat;
      pages?: LetterExportPageInput[];
      silent?: boolean;
    }) => letterService.createExport(letterUuid, { format, pages }),
    onSuccess: async (response, variables) => {
      const letterUuid = response.data.letter_uuid ?? variables.letterUuid;
      const exportKey = letterKeys.export(letterUuid, response.data.uuid);
      await queryClient.cancelQueries({ queryKey: exportKey });
      queryClient.setQueryData(exportKey, response);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: letterKeys.detail(letterUuid),
        }),
        queryClient.invalidateQueries({ queryKey: letterKeys.lists() }),
      ]);
      if (!variables.silent) {
        toast.add({ type: "info", description: response.message });
      }
    },
    onError: (error, variables) => {
      if (!variables.silent) {
        toast.add({ type: "error", description: error.message });
      }
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
        { ...response, data: response.data.export },
      );
      upsertLetterCache(queryClient, response.data.letter);
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      const fieldMessage = Object.values(apiError.validationErrors ?? {})
        .flat()
        .find(Boolean);
      toast.add({
        type: "error",
        description: fieldMessage ? `Page save failed: ${fieldMessage}` : apiError.message,
      });
    },
  });
}

export function useSetLetterDoneMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uuid, done }: { uuid: string; done: boolean }) =>
      letterService.update(uuid, { done }),
    onSuccess: async (response, { done }) => {
      upsertLetterCache(queryClient, response.data);
      toast.add({
        type: "success",
        description: done ? "Letter marked as done." : "Letter moved to drafts.",
      });
      // The letter changes tabs, so filtered lists and counts need a refetch.
      await queryClient.invalidateQueries({ queryKey: letterKeys.lists() });
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
