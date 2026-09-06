"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "@/components/ui/toast";
import { projectKeys } from "@/features/projects/queries/project-query";
import { useResourcesQuery } from "@/features/resources/queries/resource-query";
import type { Resource as ResourceDetail } from "@/features/resources/type";
import { areaKeys } from "../queries/area-query";
import { areaService } from "../services/area-service";
import type { Project } from "../type";

type LinkedKind = "projects" | "resources";

function useLinkDialogState() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);

  const reset = () => {
    setSearch("");
    setSelectedUuids([]);
  };
  const close = () => {
    setOpen(false);
    reset();
  };
  const toggle = (uuid: string) => {
    setSelectedUuids((current) =>
      current.includes(uuid)
        ? current.filter((item) => item !== uuid)
        : [...current, uuid],
    );
  };

  return {
    close,
    open,
    reset,
    search,
    selectedUuids,
    setOpen,
    setSearch,
    setSelectedUuids,
    toggle,
  };
}

export function useDetachAreaRecord({
  areaUuid,
  kind,
  recordUuid,
  onChanged,
}: {
  areaUuid: string;
  kind: LinkedKind;
  recordUuid: string;
  onChanged: (message: string) => Promise<void>;
}) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      kind === "projects"
        ? areaService.detachProject(areaUuid, recordUuid)
        : areaService.detachResource(areaUuid, recordUuid),
    onSuccess: async (response) => {
      setConfirmationOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: areaKeys.all }),
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      ]);
      await onChanged(response.message);
    },
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });

  return { confirmationOpen, mutation, setConfirmationOpen };
}

export function useProjectLinkDialog({
  areaUuid,
  linked,
  onChanged,
}: {
  areaUuid: string;
  linked: Project[];
  onChanged: (message: string) => Promise<void>;
}) {
  const state = useLinkDialogState();
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({
    queryKey: ["projects", "available"],
    queryFn: () => areaService.allProjects(),
    enabled: state.open,
  });
  const linkedIds = useMemo(
    () => new Set(linked.map((project) => project.uuid)),
    [linked],
  );
  const options = useMemo(
    () =>
      (projectsQuery.data?.data ?? []).filter(
        (project) =>
          !linkedIds.has(project.uuid) && project.area?.uuid !== areaUuid,
      ),
    [areaUuid, linkedIds, projectsQuery.data],
  );
  const filteredOptions = useMemo(() => {
    const search = state.search.trim().toLocaleLowerCase();
    return options.filter((project) =>
      [project.name, project.description, project.area?.name]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(search)),
    );
  }, [options, state.search]);
  const selectedProjects = options.filter((project) =>
    state.selectedUuids.includes(project.uuid),
  );
  const movingProjects = selectedProjects.filter((project) => project.area);
  const mutation = useMutation({
    mutationFn: async (projectUuids: string[]) => {
      const results = await Promise.allSettled(
        projectUuids.map((uuid) => areaService.linkProject(areaUuid, uuid)),
      );
      return {
        succeeded: projectUuids.filter(
          (_, index) => results[index].status === "fulfilled",
        ),
        failed: projectUuids.filter(
          (_, index) => results[index].status === "rejected",
        ),
      };
    },
    onSuccess: async ({ succeeded, failed }) => {
      if (succeeded.length > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: areaKeys.all }),
          queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        ]);
        await onChanged(
          `${succeeded.length} ${succeeded.length === 1 ? "project" : "projects"} linked successfully.`,
        );
      }
      if (failed.length > 0) {
        state.setSelectedUuids(failed);
        toast.add({
          type: "error",
          description: `${failed.length} ${failed.length === 1 ? "project could" : "projects could"} not be linked. Review your selection and try again.`,
        });
        return;
      }
      state.close();
    },
  });

  return { ...state, filteredOptions, movingProjects, mutation, options, projectsQuery };
}

export function useResourceLinkDialog({
  areaUuid,
  linkedUuids,
  onChanged,
}: {
  areaUuid: string;
  linkedUuids: string[];
  onChanged: (message: string) => Promise<void>;
}) {
  const state = useLinkDialogState();
  const queryClient = useQueryClient();
  const resourcesQuery = useResourcesQuery({}, state.open);
  const available = useMemo<ResourceDetail[]>(
    () => [
      ...new Map(
        resourcesQuery.data?.pages
          .flatMap((page) => page.data.data)
          .map((resource) => [resource.uuid, resource]),
      ).values(),
    ],
    [resourcesQuery.data],
  );
  const linkedIds = useMemo(() => new Set(linkedUuids), [linkedUuids]);
  const options = useMemo(
    () => available.filter((resource) => !linkedIds.has(resource.uuid)),
    [available, linkedIds],
  );
  const filteredOptions = useMemo(() => {
    const search = state.search.trim().toLocaleLowerCase();
    return options.filter((resource) =>
      [
        resource.title,
        resource.description,
        resource.author,
        resource.source,
        ...resource.types,
        ...resource.tags.map((tag) => tag.name),
      ]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(search)),
    );
  }, [options, state.search]);
  const mutation = useMutation({
    mutationFn: async (resourceUuids: string[]) => {
      const results = await Promise.allSettled(
        resourceUuids.map((uuid) => areaService.linkResource(areaUuid, uuid)),
      );
      return {
        succeeded: resourceUuids.filter(
          (_, index) => results[index].status === "fulfilled",
        ),
        failed: resourceUuids.filter(
          (_, index) => results[index].status === "rejected",
        ),
      };
    },
    onSuccess: async ({ succeeded, failed }) => {
      if (succeeded.length > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: areaKeys.all }),
          queryClient.invalidateQueries({ queryKey: ["resources"] }),
          queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        ]);
        await onChanged(
          `${succeeded.length} ${succeeded.length === 1 ? "resource" : "resources"} linked successfully.`,
        );
      }
      if (failed.length > 0) {
        state.setSelectedUuids(failed);
        toast.add({
          type: "error",
          description: `${failed.length} ${failed.length === 1 ? "resource could" : "resources could"} not be linked. Review your selection and try again.`,
        });
        return;
      }
      state.close();
    },
  });

  return { ...state, filteredOptions, mutation, options, resourcesQuery };
}
