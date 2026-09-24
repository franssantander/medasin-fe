import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { trashKeys } from "@/features/settings/queries/settings-query";
import { planService } from "../services/plan-service";
import type { CalendarRange, PlanInput } from "../type";

export const planKeys = {
  all: ["calendar-plans"] as const,
  list: (range: CalendarRange, timezone: string) =>
    ["calendar-plans", "list", range.startDate, range.endDate, timezone] as const,
  upcoming: (timezone: string) =>
    ["calendar-plans", "upcoming", timezone] as const,
  detail: (uuid: string) => ["calendar-plans", "detail", uuid] as const,
};

export function usePlanListQuery(range: CalendarRange | null, timezone: string) {
  return useQuery({
    queryKey: planKeys.list(range ?? { startDate: "", endDate: "" }, timezone),
    queryFn: ({ signal }) => planService.list(range!, timezone, signal),
    enabled: Boolean(range),
  });
}

export function useUpcomingPlansQuery(timezone: string) {
  return useQuery({
    queryKey: planKeys.upcoming(timezone),
    queryFn: ({ signal }) => planService.upcoming(timezone, signal),
    refetchInterval: 60_000,
  });
}

export function usePlanQuery(uuid?: string) {
  return useQuery({
    queryKey: planKeys.detail(uuid ?? ""),
    queryFn: ({ signal }) => planService.show(uuid!, signal),
    enabled: Boolean(uuid),
    retry: (count, error) =>
      (error as { status?: number }).status !== 404 && count < 1,
  });
}

function usePlanInvalidation() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: planKeys.all }),
      client.invalidateQueries({ queryKey: trashKeys.all }),
    ]);
  };
}

export function useCreatePlan() {
  const invalidate = usePlanInvalidation();
  return useMutation({
    mutationFn: (input: PlanInput) => planService.create(input),
    onSuccess: async (response) => {
      await invalidate();
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}

export function useUpdatePlan() {
  const invalidate = usePlanInvalidation();
  return useMutation({
    mutationFn: ({ uuid, input }: { uuid: string; input: PlanInput }) =>
      planService.update(uuid, input),
    onSuccess: async (response) => {
      await invalidate();
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}

export function useDeletePlan() {
  const invalidate = usePlanInvalidation();
  return useMutation({
    mutationFn: (uuid: string) => planService.remove(uuid),
    onSuccess: async (response) => {
      await invalidate();
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}
