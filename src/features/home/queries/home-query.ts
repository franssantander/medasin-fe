import { useQuery } from "@tanstack/react-query";
import { homeService } from "../services/home-service";

export const homeKeys = {
  all: ["home"] as const,
  overview: (timezone: string) => ["home", "overview", timezone] as const,
};

export function useHomeQuery(timezone: string, enabled = true) {
  return useQuery({
    queryKey: homeKeys.overview(timezone),
    queryFn: ({ signal }) => homeService.show(timezone, signal),
    enabled: enabled && Boolean(timezone),
    staleTime: 0,
  });
}
