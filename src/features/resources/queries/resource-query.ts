import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { resourceService } from "../services/resource-service";
import type { ResourceFilters } from "../type";

export function useResourcesQuery(
  filters: ResourceFilters = {},
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ["resources", "list", filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      resourceService.list(filters, pageParam, signal),
    getNextPageParam: (lastPage) =>
      lastPage.data.next_page_url ? lastPage.data.current_page + 1 : undefined,
    enabled,
  });
}
export function useResourceTagsQuery() {
  return useQuery({
    queryKey: ["resources", "tags"],
    queryFn: resourceService.tags,
  });
}
export function useCreateResource() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: resourceService.create,
    onSuccess: (response) => {
      void client.invalidateQueries({ queryKey: ["resources"] });
      void client.invalidateQueries({ queryKey: ["areas"] });
      void client.invalidateQueries({ queryKey: ["projects"] });
      toast.add({ type: "success", description: response.message });
    },
  });
}

export function useArchiveResource() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: resourceService.archive,
    onSuccess: async (response) => {
      await client.invalidateQueries({ queryKey: ["resources"] });
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}

export function useRestoreResource() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: resourceService.restore,
    onSuccess: async (response) => {
      await client.invalidateQueries({ queryKey: ["resources"] });
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}
