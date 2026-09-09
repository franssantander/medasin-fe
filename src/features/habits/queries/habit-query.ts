import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import { habitService } from "../services/habit-service";
import type { HabitCalendarRange, HabitInput } from "../type";

export const habitKeys = {
  all: ["habits"] as const,
  list: () => ["habits", "list"] as const,
  calendar: (startDate: string, endDate: string) =>
    ["habits", "calendar", startDate, endDate] as const,
};

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function useHabitsQuery(enabled = true) {
  return useQuery({
    queryKey: habitKeys.list(),
    queryFn: ({ signal }) => habitService.list(signal),
    enabled,
  });
}

export function useHabitCalendarQuery(range: HabitCalendarRange) {
  return useQuery({
    queryKey: habitKeys.calendar(range.startDate, range.endDate),
    queryFn: ({ signal }) =>
      habitService.calendar(
        range.startDate,
        range.endDate,
        browserTimezone(),
        signal,
      ),
  });
}

function useHabitInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: habitKeys.all }),
      queryClient.invalidateQueries({ queryKey: areaKeys.all }),
    ]);
  };
}

export function useHabitCreateMutation() {
  const invalidate = useHabitInvalidation();
  return useMutation({
    mutationFn: habitService.create,
    onSuccess: async (response) => {
      await invalidate();
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}

export function useHabitUpdateMutation() {
  const invalidate = useHabitInvalidation();
  return useMutation({
    mutationFn: async ({
      habitUuid,
      input,
    }: {
      habitUuid: string;
      input: Partial<HabitInput>;
    }) => {
      const { area_uuid: areaUuid, ...habitInput } = input;
      const response = await habitService.update(habitUuid, habitInput);

      return areaUuid
        ? areaService.linkHabit(areaUuid, habitUuid)
        : response;
    },
    onSuccess: async (response) => {
      await invalidate();
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}

export function useHabitDeleteMutation() {
  const invalidate = useHabitInvalidation();
  return useMutation({
    mutationFn: habitService.remove,
    onSuccess: async (response) => {
      await invalidate();
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}

export function useHabitCheckInMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      habitUuid,
      date,
      completed,
    }: {
      habitUuid: string;
      date: string;
      completed: boolean;
    }) => habitService.checkIn(habitUuid, date, completed, browserTimezone()),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: habitKeys.all });
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}
