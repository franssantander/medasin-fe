import { axiosClient } from "@/lib/axios";
import {
  searchResponseSchema,
  type SearchResponse,
  type SearchType,
} from "./search-schema";

export const searchService = {
  async search(
    query: string,
    type: SearchType | undefined,
    includeArchived: boolean,
    signal: AbortSignal,
  ): Promise<SearchResponse> {
    const response = await axiosClient.get<unknown>("/search", {
      params: { q: query, type, limit: 5, include_archived: includeArchived ? 1 : 0 },
      signal,
    });
    return searchResponseSchema.parse(response.data);
  },
};
