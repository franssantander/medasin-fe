"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/axios";
import { areaKeys } from "../queries/area-query";
import { areaService } from "../services/area-service";
import type { ApiResponse, HabitHistory } from "../type";

export const habitHistoryPrefix = (areaUuid: string, habitUuid: string) =>
  ["areas", "detail", areaUuid, "habits", habitUuid, "history"] as const;

export const habitHistoryKey = (
  areaUuid: string,
  habitUuid: string,
  startDate: string,
  endDate: string,
) => [...habitHistoryPrefix(areaUuid, habitUuid), startDate, endDate] as const;

type HabitHistoryQueryOptions = {
  areaUuid: string;
  habitUuid: string;
  startDate: string;
  endDate: string;
  enabled?: boolean;
};

export function useHabitHistory({
  areaUuid,
  habitUuid,
  startDate,
  endDate,
  enabled = true,
}: HabitHistoryQueryOptions) {
  const timezone = browserTimezone();

  return useQuery({
    queryKey: habitHistoryKey(areaUuid, habitUuid, startDate, endDate),
    queryFn: () =>
      areaService.habitHistory(
        areaUuid,
        habitUuid,
        startDate,
        endDate,
        timezone,
      ),
    enabled,
  });
}

type HabitCheckInInput = {
  date: string;
  completed: boolean;
};

export function useHabitCheckIn({
  areaUuid,
  habitUuid,
}: {
  areaUuid: string;
  habitUuid: string;
}) {
  const queryClient = useQueryClient();
  const timezone = browserTimezone();

  return useMutation<ApiResponse<HabitHistory>, Error, HabitCheckInInput>({
    mutationFn: ({ date, completed }) =>
      areaService.checkInHabit(
        areaUuid,
        habitUuid,
        date,
        completed,
        timezone,
      ),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: habitHistoryPrefix(areaUuid, habitUuid),
        }),
        queryClient.invalidateQueries({
          queryKey: areaKeys.section(areaUuid, "habits"),
        }),
      ]);
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: validationMessage(error) });
    },
  });
}

function validationMessage(error: unknown) {
  if (error instanceof ApiError) {
    return Object.values(error.validationErrors ?? {})[0]?.[0] ?? error.message;
  }
  return error instanceof Error
    ? error.message
    : "The check-in could not be saved.";
}

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
