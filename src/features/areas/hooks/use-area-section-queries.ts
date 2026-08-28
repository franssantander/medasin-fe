import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { areaKeys } from "../queries/area-query";
import { areaService } from "../services/area-service";
import type {
  ApiResponse,
  GoalFilter,
  GoalTrackerData,
  Habit,
  Note,
  Paginated,
  Project,
  Resource,
} from "../type";
import type { AreaTab } from "../components/area-detail-types";

export function useAreaSectionQueries({
  areaUuid,
  tab,
  page,
  goalFilter,
  enabled,
}: {
  areaUuid: string;
  tab: AreaTab;
  page: number;
  goalFilter: GoalFilter;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const sectionQuery = useQuery<
    ApiResponse<Paginated<Habit | Note | Project | Resource>>
  >({
    queryKey: areaKeys.section(areaUuid, tab, page),
    queryFn: () => {
      if (tab === "projects") return areaService.projects(areaUuid, page);
      if (tab === "habits") return areaService.habits(areaUuid, page);
      if (tab === "notes") return areaService.notes(areaUuid, page);
      return areaService.resources(areaUuid, page);
    },
    enabled: enabled && tab !== "goals",
  });
  const goalsQuery = useQuery<ApiResponse<GoalTrackerData>>({
    queryKey: areaKeys.section(areaUuid, "goals", page, goalFilter),
    queryFn: () => areaService.goals(areaUuid, page, goalFilter),
    enabled: enabled && tab === "goals",
  });

  const invalidate = async (message: string) => {
    await queryClient.invalidateQueries({
      queryKey: ["areas", "detail", areaUuid],
    });
    toast.add({ type: "success", description: message });
  };

  return { goalsQuery, invalidate, sectionQuery };
}
