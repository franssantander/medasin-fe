import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard-service";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: (timezone: string) => ["dashboard", "overview", timezone] as const,
};

export function useDashboardQuery(timezone: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.overview(timezone),
    queryFn: ({ signal }) => dashboardService.show(timezone, signal),
    enabled: enabled && Boolean(timezone),
    staleTime: 0,
  });
}
