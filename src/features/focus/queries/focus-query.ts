import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { journalKeys } from "@/features/journal/queries/journal-query";
import { focusService } from "../services/focus-service";
import type { FocusApiResponse, FocusDashboard, FocusMood, FocusSession, FocusSessionType, FocusSettings } from "../type";

export const focusKeys = { all: ["focus"] as const, dashboard: (timezone: string) => ["focus", "dashboard", timezone] as const, tasks: (status: string) => ["focus", "tasks", status] as const, linkable: (search: string) => ["focus", "linkable", search] as const };

export function useFocusDashboardQuery() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return useQuery({ queryKey: focusKeys.dashboard(timezone), queryFn: () => focusService.dashboard(timezone), refetchInterval: 30000, refetchOnWindowFocus: true });
}

export function useFocusTasksQuery(status: "active" | "completed", enabled = true) {
  return useQuery({ queryKey: focusKeys.tasks(status), queryFn: () => focusService.tasks(status), enabled });
}

export function useLinkableFocusTasksQuery(search: string, enabled: boolean) {
  return useQuery({ queryKey: focusKeys.linkable(search), queryFn: ({ signal }) => focusService.linkableTasks(search, signal), enabled, staleTime: 15000 });
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
function useFocusSessionMutation<T>(mutationFn: (input: T) => Promise<FocusApiResponse<FocusSession>>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      const session = response.data;
      queryClient.setQueriesData<FocusApiResponse<FocusDashboard>>(
        { queryKey: ["focus", "dashboard"] },
        (current) => {
          if (!current) return current;
          const active = session.status === "running" || session.status === "paused";
          return {
            ...current,
            data: {
              ...current.data,
              active_session: active
                ? session
                : current.data.active_session?.uuid === session.uuid
                  ? null
                  : current.data.active_session,
            },
          };
        },
      );
      await queryClient.invalidateQueries({ queryKey: focusKeys.all });
    },
  });
}

export const useStartFocusSessionMutation = () => useFocusSessionMutation(({ type, taskUuid }: { type: FocusSessionType; taskUuid?: string }) => focusService.startSession(type, taskUuid));
export const useFocusSessionActionMutation = () => useFocusSessionMutation(({ uuid, action }: { uuid: string; action: "pause" | "resume" | "complete" | "cancel" }) => focusService.sessionAction(uuid, action));
export function useSaveFocusReflectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, mood, note }: {
      uuid: string;
      mood: FocusMood | null;
      note: string | null;
    }) => focusService.reflect(uuid, mood, note),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: focusKeys.all }),
        queryClient.invalidateQueries({ queryKey: journalKeys.all }),
      ]);
    },
  });
}
