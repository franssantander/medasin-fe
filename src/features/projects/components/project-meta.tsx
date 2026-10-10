import { ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { AreaIcon } from "@/features/areas/components/area-icons";
import { cn } from "@/lib/utils";
import {
  projectStatusDotClassNames,
  projectStatusLabels,
} from "../project-status";
import { formatProjectDue } from "../project-list-utils";
import type { ProjectListCard } from "../type";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";

export function projectAccentColor(project: ProjectListCard) {
  return project.icon && project.background
    ? projectBadgeStyle(project.background).backgroundColor
    : undefined;
}

export function ProjectIconTile({
  project,
  className,
}: {
  project: ProjectListCard;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        className,
      )}
      style={projectBadgeStyle(project.icon ? project.background : undefined)}
    >
      <ProjectIcon name={project.icon} className="size-4" />
    </div>
  );
}

export function ProjectAreaLink({
  project,
  className,
}: {
  project: ProjectListCard;
  className?: string;
}) {
  if (!project.area) {
    return (
      <span
        className={cn(
          "inline-flex h-5 w-fit items-center gap-1 text-xs text-muted-foreground/70",
          className,
        )}
      >
        <Inbox className="size-3 shrink-0" aria-hidden="true" />
        Inbox
      </span>
    );
  }

  return (
    <Link
      href={`/projects/areas/${project.area.uuid}`}
      aria-label={`View area ${project.area.name}`}
      title={project.area.name}
      className={cn(
        "group/area pointer-events-auto relative z-10 inline-flex h-5 w-fit max-w-full items-center gap-1 rounded-md bg-muted/70 px-1.5 text-xs text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        className,
      )}
    >
      <AreaIcon name={project.area.icon} className="size-3 shrink-0" />
      <span className="truncate">{project.area.name}</span>
      <ChevronRight
        className="-ml-1 size-3 w-0 shrink-0 -translate-x-0.5 opacity-0 transition-[margin,width,opacity,translate] duration-150 group-hover/area:ml-0 group-hover/area:w-3 group-hover/area:translate-x-0 group-hover/area:opacity-100 group-focus-visible/area:ml-0 group-focus-visible/area:w-3 group-focus-visible/area:translate-x-0 group-focus-visible/area:opacity-100 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}

export function ProjectStatusLabel({
  project,
  className,
}: {
  project: ProjectListCard;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          projectStatusDotClassNames[project.status] ?? "bg-muted-foreground",
        )}
        aria-hidden="true"
      />
      {projectStatusLabels[project.status] ??
        project.status.replaceAll("_", " ")}
    </span>
  );
}

export function ProjectProgressLine({
  project,
  className,
}: {
  project: ProjectListCard;
  className?: string;
}) {
  const progress = Math.min(100, Math.max(0, project.progress_percentage));
  const accent = projectAccentColor(project);

  return (
    <div
      role="progressbar"
      aria-label={`${project.name} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
          !accent && "bg-foreground/70",
        )}
        style={{ width: `${progress}%`, backgroundColor: accent }}
      />
    </div>
  );
}

export function ProjectDueLabel({
  project,
  className,
}: {
  project: ProjectListCard;
  className?: string;
}) {
  const due = formatProjectDue(project);

  return (
    <span
      className={cn(
        "truncate text-xs",
        due.tone === "overdue"
          ? "font-medium text-amber-700 dark:text-amber-400"
          : due.tone === "none"
            ? "text-muted-foreground/70"
            : "text-muted-foreground",
        className,
      )}
      title={
        due.tone === "overdue"
          ? "Past the due date. Small progress still counts."
          : undefined
      }
    >
      {due.label}
    </span>
  );
}
