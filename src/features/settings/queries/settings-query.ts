import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { settingsService } from "../services/settings-service";
import type { TrashFilters } from "../types";

export const trashKeys = {
  all: ["trash"] as const,
  list: (filters: TrashFilters) => ["trash", "list", filters] as const,
};

export function useTrashQuery(filters: TrashFilters) {
  return useQuery({
    queryKey: trashKeys.list(filters),
    queryFn: ({ signal }) => settingsService.trash(filters, signal),
    refetchOnMount: "always",
  });
}

function useTrashMutation(action: "restore" | "delete") {
  const client = useQueryClient();

  return useMutation({
    mutationFn:
      action === "restore"
        ? settingsService.restoreTrash
        : settingsService.deleteTrash,
    onSuccess: async (response) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: trashKeys.all }),
        client.invalidateQueries({ queryKey: ["areas"] }),
        client.invalidateQueries({ queryKey: ["projects"] }),
        client.invalidateQueries({ queryKey: ["resources"] }),
      ]);
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}

export function useRestoreTrash() {
  return useTrashMutation("restore");
}

export function useDeleteTrash() {
  return useTrashMutation("delete");
}
