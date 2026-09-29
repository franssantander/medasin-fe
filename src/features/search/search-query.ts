import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchService } from "./search-service";
import type { SearchType } from "./search-schema";

export function useGlobalSearch(
  userId: number | undefined,
  query: string,
  type: SearchType | undefined,
  includeArchived: boolean,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["search", userId, query, type ?? "all", includeArchived],
    queryFn: ({ signal }) => searchService.search(query, type, includeArchived, signal),
    enabled: enabled && Boolean(userId) && query.length >= 2,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === userId
        ? keepPreviousData(previousData)
        : undefined,
    staleTime: 30_000,
    retry: false,
  });
}
