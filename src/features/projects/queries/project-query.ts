import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { areaKeys } from "@/features/areas/queries/area-query";
import { projectService } from "../services/project-service";
import type { ProjectArchiveFilter, ProjectInput } from "../type"; 

export const projectKeys = {
  all: ["projects"] as const,
  list: (status: ProjectArchiveFilter) =>
    ["projects", "list", status] as const,
  detail: (projectUuid: string) =>
    ["projects", "detail", projectUuid] as const,
  board: (projectUuid: string, boardUuid: string) =>
    ["projects", "detail", projectUuid, "boards", boardUuid] as const,
};

export function useProjectsQuery(status: ProjectArchiveFilter = "active") {
  return useQuery({
    queryKey: projectKeys.list(status),
    queryFn: () => projectService.list(status),
  });
}

export function useProjectQuery(projectUuid: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectUuid),
    queryFn: () => projectService.show(projectUuid),
    enabled: Boolean(projectUuid),
  });
}

export function useProjectBoardQuery(
  projectUuid: string,
  boardUuid?: string,
) {
  return useQuery({
    queryKey: projectKeys.board(projectUuid, boardUuid ?? ""),
    queryFn: () => projectService.board(projectUuid, boardUuid!),
    enabled: Boolean(projectUuid && boardUuid),
  });
}

export function useProjectMutation(
  action:
    | "create"
    | "update"
    | "updateArea"
    | "archive"
    | "restore"
    | "remove",
  projectUuid?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: ProjectInput) => {
      if (action === "create") return projectService.create(input!);
      if (action === "update") return projectService.update(projectUuid!, input!);
      if (action === "updateArea")
        return projectService.updateArea(projectUuid!, input!);
      if (action === "archive") return projectService.archive(projectUuid!);
      if (action === "restore") return projectService.restore(projectUuid!);
      return projectService.remove(projectUuid!);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
      if (
        action === "create" ||
        action === "updateArea" ||
        action === "restore"
      ) {
        await queryClient.invalidateQueries({ queryKey: areaKeys.all });
      }
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
}
