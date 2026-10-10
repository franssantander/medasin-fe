"use client";

import { RefreshCw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { ResourceDetailDialog } from "@/features/resources/components/resource-detail-dialog";
import { ResourceFormDialog } from "@/features/resources/components/resource-form-dialog";
import type { Resource } from "@/features/resources/type";
import { useProjectFormDialog } from "../hooks/use-project-form-dialog";
import {
  useDetachProjectResource,
  useProjectMutation,
  useProjectQuery,
} from "../queries/project-query";
import { ProjectDetailHeader } from "./project-detail-header";
import { ProjectDetailResources } from "./project-detail-resources";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectGoalsDialog } from "./project-goals-dialog";
import { ProjectKanban } from "./project-kanban";
import { ProjectLinkResourcesDialog } from "./project-link-resources-dialog";
import { ProjectUnlinkResourceDialog } from "./project-unlink-resource-dialog";
import { ProjectDetailSkeleton } from "./project-skeletons";

export function ProjectDetail({
  projectUuid,
  routeContext = "projects",
  sourceAreaUuid,
}: {
  projectUuid?: string;
  routeContext?: "projects" | "archives" | "areas";
  sourceAreaUuid?: string;
}) {
  const params = useParams<{ uuid?: string }>();
  const uuid = projectUuid ?? params.uuid ?? "";
  const router = useRouter();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource>();
  const [resourceToRemove, setResourceToRemove] = useState<Resource>();
  const [resourceAction, setResourceAction] = useState<"create" | "link">();
  const projectQuery = useProjectQuery(uuid);
  const restore = useProjectMutation("restore", uuid);
  const detachResource = useDetachProjectResource(uuid);
  const projectForm = useProjectFormDialog();
  const project = projectQuery.data?.data;

  if (projectQuery.isLoading)
    return <ProjectDetailSkeleton />;
  if (projectQuery.isError || !project)
    return (
      <Card className="items-center py-14 text-center">
        <CardTitle>Project could not be loaded</CardTitle>
        <CardDescription>Check your connection and try again.</CardDescription>
        <Button variant="outline" onClick={() => projectQuery.refetch()}>
          <RefreshCw />
          Try again
        </Button>
      </Card>
    );

  const archived = Boolean(project.archived_at);
  const backContext =
    routeContext === "projects" && archived ? "archives" : routeContext;
  const backHref =
    backContext === "archives"
      ? "/archives"
      : backContext === "areas" && sourceAreaUuid
        ? `/areas/${sourceAreaUuid}?tab=projects`
        : "/projects";
  const backLabel = backContext === "areas" ? "area" : backContext;
  const areaHref =
    routeContext === "areas" && sourceAreaUuid
      ? `/areas/${sourceAreaUuid}?tab=projects`
      : `/projects/${project.uuid}/areas/${project.area?.uuid}`;

  const restoreProject = () =>
    restore.mutate(undefined, {
      onSuccess: () => {
        if (routeContext === "archives") router.replace(`/projects/${uuid}`);
      },
    });

  return (
    <div className="grid min-w-0 gap-6">
      <ProjectDetailHeader
        project={project}
        archived={archived}
        backHref={backHref}
        backLabel={backLabel}
        areaHref={areaHref}
        isRestoring={restore.isPending}
        onRestore={restoreProject}
        onEdit={() => projectForm.openEdit(project)}
        onOpenGoals={() => setGoalsOpen(true)}
        onDeleted={() => router.replace(backHref)}
      />
      <ProjectDetailResources
        resources={project.resources}
        archived={archived}
        removingResourceUuid={
          detachResource.isPending ? resourceToRemove?.uuid : undefined
        }
        onOpen={setSelectedResource}
        onRemove={setResourceToRemove}
        onCreate={() => setResourceAction("create")}
        onLink={() => setResourceAction("link")}
      />
      <ProjectKanban
        projectUuid={uuid}
        boards={project.boards}
        archived={archived}
      />
      <ProjectFormDialog
        open={projectForm.isOpen}
        onOpenChange={projectForm.setIsOpen}
        project={projectForm.project}
        isPending={projectForm.isPending}
        onSubmit={projectForm.submit}
      />
      {project.area && (
        <ProjectGoalsDialog
          open={goalsOpen}
          onOpenChange={setGoalsOpen}
          areaUuid={project.area.uuid}
          areaName={project.area.name}
          projectName={project.name}
          archived={archived}
        />
      )}
      {selectedResource && (
        <ResourceDetailDialog
          resource={selectedResource}
          onClose={() => setSelectedResource(undefined)}
        />
      )}
      {resourceAction === "create" && (
        <ResourceFormDialog
          initialProjectUuids={[project.uuid]}
          onClose={() => setResourceAction(undefined)}
        />
      )}
      {resourceAction === "link" && (
        <ProjectLinkResourcesDialog
          projectUuid={project.uuid}
          excludedResourceUuids={project.resources.map(
            (resource) => resource.uuid,
          )}
          onClose={() => setResourceAction(undefined)}
        />
      )}
      <ProjectUnlinkResourceDialog
        resource={resourceToRemove}
        isPending={detachResource.isPending}
        onClose={() => setResourceToRemove(undefined)}
        onConfirm={() => {
          if (!resourceToRemove) return;
          detachResource.mutate(resourceToRemove.uuid, {
            onSuccess: () => setResourceToRemove(undefined),
          });
        }}
      />
    </div>
  );
}
