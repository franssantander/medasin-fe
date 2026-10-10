"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { ProjectListCard } from "../type";
import { ProjectActionsMenu } from "./project-actions-menu";
import { ProjectGoalsMenu } from "./project-goals-menu";
import {
  ProjectAreaLink,
  ProjectDueLabel,
  ProjectIconTile,
  ProjectProgressLine,
  ProjectStatusLabel,
} from "./project-meta";

export function ProjectCard({
  project,
  onEdit,
}: {
  project: ProjectListCard;
  onEdit: () => void;
}) {
  const progress = Math.min(100, Math.max(0, project.progress_percentage));

  return (
    <Card
      size="sm"
      className="relative h-full gap-0 p-0 shadow-none transition-[background-color,box-shadow] duration-200 hover:bg-muted/30 hover:ring-foreground/20 has-[[data-project-link]:focus-visible]:ring-2 has-[[data-project-link]:focus-visible]:ring-ring motion-reduce:transition-none"
    >
      <Link
        href={`/projects/${project.uuid}`}
        data-project-link=""
        className="absolute inset-0 z-0 rounded-xl outline-none"
        aria-label={`Open ${project.name}`}
      />

      <div className="pointer-events-none flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <ProjectIconTile project={project} />
          <div className="grid min-w-0 flex-1 gap-1 pt-px">
            <h3
              className="truncate text-[15px] leading-snug font-medium"
              title={project.name}
            >
              {project.name}
            </h3>
            <ProjectAreaLink project={project} />
          </div>
          <ProjectActionsMenu
            project={project}
            onEdit={onEdit}
            className="pointer-events-auto -mt-1 -mr-2"
          />
        </div>

        {project.description && (
          <p className="line-clamp-2 text-sm/relaxed text-muted-foreground">
            {project.description}
          </p>
        )}

        <div className="mt-auto grid gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <ProjectStatusLabel project={project} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress}%
            </span>
          </div>
          <ProjectProgressLine project={project} />
        </div>

        <div className="-mb-1.5 flex min-h-7 items-center justify-between gap-3 border-t pt-3">
          <ProjectDueLabel project={project} />
          <div className="pointer-events-auto -mr-2 shrink-0">
            <ProjectGoalsMenu project={project} />
          </div>
        </div>
      </div>
    </Card>
  );
}
