"use client";

import Link from "next/link";
import type { ProjectListCard } from "../type";
import { ProjectActionsMenu } from "./project-actions-menu";
import {
  ProjectAreaLink,
  ProjectDueLabel,
  ProjectIconTile,
  ProjectProgressLine,
  ProjectStatusLabel,
} from "./project-meta";

export function ProjectListRow({
  project,
  onEdit,
}: {
  project: ProjectListCard;
  onEdit: () => void;
}) {
  const progress = Math.min(100, Math.max(0, project.progress_percentage));

  return (
    <li className="relative transition-colors duration-200 hover:bg-muted/40 has-[[data-project-link]:focus-visible]:bg-muted/40 has-[[data-project-link]:focus-visible]:ring-2 has-[[data-project-link]:focus-visible]:ring-ring has-[[data-project-link]:focus-visible]:ring-inset motion-reduce:transition-none">
      <Link
        href={`/projects/${project.uuid}`}
        data-project-link=""
        className="absolute inset-0 z-0 outline-none"
        aria-label={`Open ${project.name}`}
      />
      <div className="pointer-events-none flex min-h-16 items-center gap-3 px-4 py-3 sm:gap-4">
        <ProjectIconTile project={project} className="size-8" />

        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="truncate text-sm font-medium" title={project.name}>
            {project.name}
          </h3>
          <ProjectAreaLink project={project} />
        </div>

        <ProjectStatusLabel
          project={project}
          className="hidden w-28 shrink-0 sm:inline-flex"
        />

        <div className="hidden w-36 shrink-0 items-center gap-2.5 md:flex">
          <ProjectProgressLine project={project} />
          <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
            {progress}%
          </span>
        </div>

        <ProjectDueLabel
          project={project}
          className="hidden w-32 shrink-0 text-right sm:block"
        />

        <ProjectActionsMenu
          project={project}
          onEdit={onEdit}
          className="pointer-events-auto -mr-1.5 shrink-0"
        />
      </div>
    </li>
  );
}
