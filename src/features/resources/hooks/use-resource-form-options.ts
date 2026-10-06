"use client";

import { useQuery } from "@tanstack/react-query";
import { areaService } from "@/features/areas/services/area-service";
import { projectService } from "@/features/projects/services/project-service";
import { useResourceTagsQuery } from "../queries/resource-query";
import { mergeResourceOptions } from "../resource-form-utils";
import type { Resource } from "../type";

export function useResourceFormOptions(enabled = true, resource?: Resource) {
  const tags = useResourceTagsQuery();
  const projects = useQuery({
    queryKey: ["projects", "list", "active"],
    queryFn: () => projectService.list("active"),
    enabled,
  });
  const areas = useQuery({
    queryKey: ["areas", "list", "active"],
    queryFn: () => areaService.list("active"),
    enabled,
  });
  return {
    tags, projects, areas,
    tagItems: mergeResourceOptions(resource?.tags ?? [], tags.data?.data ?? []),
    projectItems: mergeResourceOptions(resource?.projects ?? [], projects.data?.data ?? []),
    areaItems: mergeResourceOptions(resource?.areas ?? [], areas.data?.data ?? []),
  };
}
