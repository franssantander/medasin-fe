import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import type { ApiResponse } from "@/features/areas/type";
import { subscriptionKeys } from "@/features/subscription/queries/subscription-query";
import { isPlanLimitError } from "@/features/subscription/plan-limit-error";
import { resourceService } from "../services/resource-service";
import { mergeResourceOptions } from "../resource-form-utils";
import type { Resource, ResourceFilters, ResourceTag } from "../type";

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
export function useResourceQuery(resourceUuid?: string) {
  return useQuery({
    queryKey: ["resources", "detail", resourceUuid],
    queryFn: ({ signal }) => resourceService.show(resourceUuid!, signal),
    enabled: Boolean(resourceUuid),
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
      void client.invalidateQueries({ queryKey: subscriptionKeys.all });
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      if (!isPlanLimitError(error)) return;
      void Promise.all([
        client.invalidateQueries({ queryKey: subscriptionKeys.all }),
        client.invalidateQueries({ queryKey: ["resources"] }),
        client.invalidateQueries({ queryKey: ["areas"] }),
        client.invalidateQueries({ queryKey: ["projects"] }),
      ]);
    },
  });
}

export function useRefreshResourceQueries() {
  const client = useQueryClient();
  return () => Promise.all([
    client.invalidateQueries({ queryKey: ["resources"] }),
    client.invalidateQueries({ queryKey: ["areas"] }),
    client.invalidateQueries({ queryKey: ["projects"] }),
  ]);
}

function useResourceMutationCache() {
  const client = useQueryClient();
  return async (response: ApiResponse<Resource>) => {
    const detailKey = ["resources", "detail", response.data.uuid];
    await client.cancelQueries({ queryKey: detailKey, exact: true });
    client.setQueryData(detailKey, response);
    client.setQueryData<ApiResponse<ResourceTag[]>>(["resources", "tags"], (current) => current ? {
      ...current,
      data: mergeResourceOptions(current.data, response.data.tags),
    } : undefined);
    await Promise.all([
      client.invalidateQueries({ queryKey: ["resources"], refetchType: "none" }),
      client.invalidateQueries({ queryKey: ["areas"], refetchType: "none" }),
      client.invalidateQueries({ queryKey: ["projects"], refetchType: "none" }),
    ]);
  };
}

export function useUpdateResource() {
  const updateCache = useResourceMutationCache();
  return useMutation({
    mutationFn: resourceService.update,
    onSuccess: updateCache,
  });
}

export function useAddResourceAttachments() {
  const updateCache = useResourceMutationCache();
  return useMutation({
    mutationFn: ({ resourceUuid, ...input }: { resourceUuid: string; links?: string[]; files?: File[] }) =>
      resourceService.addAttachments(resourceUuid, input),
    onSuccess: updateCache,
  });
}

export function useDeleteResourceAttachment() {
  const updateCache = useResourceMutationCache();
  return useMutation({
    mutationFn: ({ resourceUuid, attachmentUuid }: { resourceUuid: string; attachmentUuid: string }) =>
      resourceService.deleteAttachment(resourceUuid, attachmentUuid),
    onSuccess: updateCache,
  });
}

export function useArchiveResource() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: resourceService.archive,
    onSuccess: async (response) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["resources"] }),
        client.invalidateQueries({ queryKey: ["areas"] }),
        client.invalidateQueries({ queryKey: ["projects"] }),
      ]);
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
      await Promise.all([
        client.invalidateQueries({ queryKey: ["resources"] }),
        client.invalidateQueries({ queryKey: subscriptionKeys.all }),
      ]);
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}

export function useDeleteResource(onDeleted?: (resourceUuid: string) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: resourceService.delete,
    onSuccess: async (response, resourceUuid) => {
      onDeleted?.(resourceUuid);
      const detailKey = ["resources", "detail", resourceUuid];
      await client.cancelQueries({ queryKey: detailKey, exact: true });
      const cache = client.getQueryCache();
      const detail = cache.find({ queryKey: detailKey, exact: true });

      // A mounted detail remains available until its dialog closes. Refetching
      // it after deletion would return 404 and interrupt dismissal.
      if (detail && detail.getObserversCount() > 0) {
        const unsubscribe = cache.subscribe((event) => {
          if (event.query !== detail) return;
          if (event.type === "removed") unsubscribe();
          else if (event.type === "observerRemoved" && detail.getObserversCount() === 0) {
            unsubscribe();
            client.removeQueries({ queryKey: detailKey, exact: true });
          }
        });
      } else {
        client.removeQueries({ queryKey: detailKey, exact: true });
      }

      await Promise.all([
        client.invalidateQueries({
          queryKey: ["resources"],
          predicate: (query) => query.queryKey[1] !== "detail" || query.queryKey[2] !== resourceUuid,
        }),
        client.invalidateQueries({ queryKey: ["trash"] }),
        client.invalidateQueries({ queryKey: ["areas"] }),
        client.invalidateQueries({ queryKey: ["projects"] }),
        client.invalidateQueries({ queryKey: ["boards"] }),
        client.invalidateQueries({ queryKey: ["journal"] }),
        client.invalidateQueries({ queryKey: subscriptionKeys.all }),
      ]);
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}
