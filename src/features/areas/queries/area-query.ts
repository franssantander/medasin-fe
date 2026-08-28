import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { areaService } from "../services/area-service";
import type { ApiResponse, Area, AreaInput, AreaStatusFilter } from "../type";

export const areaKeys = {
  all: ["areas"] as const,
  list: (status: AreaStatusFilter) => ["areas", "list", status] as const,
  detail: (uuid: string) => ["areas", "detail", uuid] as const,
  section: (uuid: string, section: string, page = 1) =>
    ["areas", "detail", uuid, section, page] as const,
};

export function useAreasQuery(status: AreaStatusFilter = "active") {
  return useQuery({ queryKey: areaKeys.list(status), queryFn: () => areaService.list(status) });
}

export function useAreaQuery(uuid: string) {
  return useQuery({ queryKey: areaKeys.detail(uuid), queryFn: () => areaService.show(uuid), enabled: Boolean(uuid) });
}

export function useAreaMutation(
  action: "create" | "update" | "archive" | "restore" | "remove",
  areaUuid?: string,
) {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<Area | null>, Error, AreaInput | undefined>({
    mutationFn: (input?: AreaInput) => {
      if (action === "create") return areaService.create(input!) as Promise<ApiResponse<Area | null>>;
      if (action === "update") return areaService.update(areaUuid!, input!) as Promise<ApiResponse<Area | null>>;
      if (action === "archive") return areaService.archive(areaUuid!) as Promise<ApiResponse<Area | null>>;
      if (action === "restore") return areaService.restore(areaUuid!) as Promise<ApiResponse<Area | null>>;
      return areaService.remove(areaUuid!) as Promise<ApiResponse<Area | null>>;
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: areaKeys.all });
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}
