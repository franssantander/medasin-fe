import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { focusService } from "../services/focus-service";
import type { FocusMood, FocusSessionType, FocusSettings } from "../type";

export const focusKeys = { all: ["focus"] as const, dashboard: (timezone: string) => ["focus", "dashboard", timezone] as const, tasks: (status: string) => ["focus", "tasks", status] as const, linkable: (search: string) => ["focus", "linkable", search] as const };

export function useFocusDashboardQuery() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return useQuery({ queryKey: focusKeys.dashboard(timezone), queryFn: () => focusService.dashboard(timezone), refetchInterval: 30000 });
}

export function useFocusTasksQuery(status: "active" | "completed", enabled = true) {
  return useQuery({ queryKey: focusKeys.tasks(status), queryFn: () => focusService.tasks(status), enabled });
}

export function useLinkableFocusTasksQuery(search: string, enabled: boolean) {
  return useQuery({ queryKey: focusKeys.linkable(search), queryFn: () => focusService.linkableTasks(search), enabled, staleTime: 15000 });
}

function useFocusMutation<T, R extends { message: string }>(mutationFn: (input: T) => Promise<R>, showToast = true) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: focusKeys.all });
      if (showToast) toast.add({ type: "success", description: response.message });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}

export const useCreateFocusTaskMutation = () => useFocusMutation(focusService.createTask);
export const useUpdateFocusTaskMutation = () => useFocusMutation(({ uuid, input }: { uuid: string; input: { title?: string; completed?: boolean } }) => focusService.updateTask(uuid, input));
export const useDeleteFocusTaskMutation = () => useFocusMutation((uuid: string) => focusService.deleteTask(uuid));
export const useUpdateFocusSettingsMutation = () => useFocusMutation((input: FocusSettings) => focusService.updateSettings(input));
export const useStartFocusSessionMutation = () => useFocusMutation(({ type, taskUuid }: { type: FocusSessionType; taskUuid?: string }) => focusService.startSession(type, taskUuid), false);
export const useFocusSessionActionMutation = () => useFocusMutation(({ uuid, action }: { uuid: string; action: "pause" | "resume" | "complete" | "cancel" }) => focusService.sessionAction(uuid, action), false);
export const useSaveFocusReflectionMutation = () => useFocusMutation(({ uuid, mood, note }: { uuid: string; mood: FocusMood | null; note: string | null }) => focusService.reflect(uuid, mood, note), false);
