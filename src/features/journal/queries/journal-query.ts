import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { journalService } from "../services/journal-service";
import type {
  JournalApiResponse,
  JournalEntry,
  JournalEntrySummary,
  JournalPage,
} from "../type";

export const journalKeys = {
  all: ["journal"] as const,
  list: () => ["journal", "list"] as const,
  detail: (uuid: string) => ["journal", "detail", uuid] as const,
};

type JournalListData = InfiniteData<
  JournalApiResponse<JournalPage>,
  number
>;

function summaryFromEntry(entry: JournalEntry): JournalEntrySummary {
  const summary = { ...entry };
  delete (summary as { content?: string }).content;
  return summary;
}

export function upsertJournalEntryCache(
  queryClient: QueryClient,
  entry: JournalEntry,
  prependIfMissing = false,
) {
  const summary = summaryFromEntry(entry);

  queryClient.setQueryData<JournalApiResponse<JournalEntry>>(
    journalKeys.detail(entry.uuid),
    (current) =>
      current
        ? {
            ...current,
            data: entry,
          }
        : {
            data: entry,
            status: 200,
            message: "Journal entry loaded.",
          },
  );

  queryClient.setQueryData<JournalListData>(journalKeys.list(), (current) => {
    if (!current) return current;

    const exists = current.pages.some((page) =>
      page.data.data.some((item) => item.uuid === entry.uuid),
    );
    const pages = current.pages.map((page, pageIndex) => {
      const items = page.data.data.map((item) =>
        item.uuid === entry.uuid ? summary : item,
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

      return {
        ...page,
        data: {
          ...page.data,
          data: items,
        },
      };
    });

    return { ...current, pages };
  });
}

export function removeJournalEntryFromCache(
  queryClient: QueryClient,
  uuid: string,
) {
  queryClient.removeQueries({ queryKey: journalKeys.detail(uuid) });
  queryClient.setQueryData<JournalListData>(journalKeys.list(), (current) => {
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

export function useJournalEntriesQuery() {
  return useInfiniteQuery({
    queryKey: journalKeys.list(),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      journalService.list(pageParam, signal),
    getNextPageParam: (lastPage) =>
      lastPage.data.current_page < lastPage.data.last_page
        ? lastPage.data.current_page + 1
        : undefined,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useJournalEntryQuery(uuid?: string) {
  return useQuery({
    queryKey: journalKeys.detail(uuid ?? ""),
    queryFn: ({ signal }) => journalService.show(uuid!, signal),
    enabled: Boolean(uuid),
  });
}

export function useDeleteJournalEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: journalService.remove,
    onSuccess: async (response, uuid) => {
      removeJournalEntryFromCache(queryClient, uuid);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: journalKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["trash"] }),
      ]);
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}
