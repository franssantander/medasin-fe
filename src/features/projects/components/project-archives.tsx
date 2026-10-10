"use client";

import { useMemo, useState } from "react";
import { CirclePile, Inbox } from "lucide-react";
import { RestoreConfirmDialog } from "@/components/shared/restore-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { ArchiveRow } from "@/features/archives/components/archive-list";
import {
  projectStatusBadgeClassNames,
  projectStatusLabels,
} from "../project-status";
import { useProjectMutation, useProjectsQuery } from "../queries/project-query";
import type { ProjectListCard } from "../type";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";

function archivedTime(value: string | null) {
  return value ? new Date(value).getTime() || 0 : 0;
}

export function useArchivedProjects(search: string) {
  const query = useProjectsQuery("archived");
  const term = search.trim().toLowerCase();
  const items = useMemo(
    () =>
      (query.data?.data ?? [])
        .filter((project) => !term || project.name.toLowerCase().includes(term))
        .sort((a, b) => archivedTime(b.archived_at) - archivedTime(a.archived_at)),
    [query.data, term],
  );
  return { query, items, total: query.data?.data.length };
}

export function ArchivedProjectRow({
  project,
  areaArchived,
}: {
  project: ProjectListCard;
  /** Whether the project's area is archived; undefined when unknown. */
  areaArchived?: boolean;
}) {
  const restore = useProjectMutation("restore", project.uuid);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <ArchiveRow
        media={
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={projectBadgeStyle(project.background)}
            aria-hidden="true"
          >
            <ProjectIcon name={project.icon} className="size-4" />
          </div>
        }
        title={project.name}
        secondary={project.description || "No description"}
        meta={
          <>
            <Badge
              variant="outline"
              className={projectStatusBadgeClassNames[project.status]}
            >
              {projectStatusLabels[project.status]}
            </Badge>
            <span className="flex w-32 min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {project.area ? (
                <CirclePile className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Inbox className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate" title={project.area?.name || "Inbox"}>
                {project.area?.name || "Inbox"}
              </span>
            </span>
          </>
        }
        archivedAt={project.archived_at}
        openLabel={`Open ${project.name}`}
        href={`/archives/projects/${project.uuid}`}
        restoring={restore.isPending}
        onRestore={() => setConfirming(true)}
      />
      <RestoreConfirmDialog
        open={confirming}
        kind="project"
        name={project.name}
        project={{ areaName: project.area?.name, areaArchived }}
        isPending={restore.isPending}
        onOpenChange={setConfirming}
        onConfirm={() =>
          restore.mutate(undefined, { onSuccess: () => setConfirming(false) })
        }
      />
    </>
  );
}
