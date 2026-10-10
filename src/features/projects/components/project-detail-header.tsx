"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Inbox,
  Pencil,
  StarCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AreaIcon } from "@/features/areas/components/area-icons";
import { cn } from "@/lib/utils";
import {
  projectStatusBadgeClassNames,
  projectStatusLabels,
} from "../project-status";
import type { BoardStageKey, ProjectDetail } from "../type";
import { ProjectActionsMenu } from "./project-actions-menu";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";
import { stageDotColors } from "./project-kanban-utils";

const STAGES: { key: BoardStageKey; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todos", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

const chipClassName =
  "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-2 text-xs font-medium";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

function scheduleLabel(project: ProjectDetail) {
  if (project.start_date && project.due_date)
    return `${formatDate(project.start_date)} – ${formatDate(project.due_date)}`;
  if (project.start_date) return `Starts ${formatDate(project.start_date)}`;
  if (project.due_date) return `Due ${formatDate(project.due_date)}`;
  return "No dates set";
}

function dueHint(project: ProjectDetail) {
  if (!project.due_date || project.is_overdue || project.status === "completed")
    return null;
  const due = new Date(`${project.due_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return null;
  return days === 0 ? "Due today" : `Due in ${plural(days, "day")}`;
}

export function ProjectDetailHeader({
  project,
  archived,
  backHref,
  backLabel,
  areaHref,
  isRestoring,
  onRestore,
  onEdit,
  onOpenGoals,
  onDeleted,
}: {
  project: ProjectDetail;
  archived: boolean;
  backHref: string;
  backLabel: string;
  areaHref: string;
  isRestoring: boolean;
  onRestore: () => void;
  onEdit: () => void;
  onOpenGoals: () => void;
  onDeleted: () => void;
}) {
  const progress = Math.min(100, Math.max(0, project.progress_percentage));
  const stageCounts = STAGES.map((stage) => ({
    ...stage,
    count: project.boards.reduce(
      (total, board) => total + (board.stage_counts?.[stage.key] ?? 0),
      0,
    ),
  }));
  const totalTasks = stageCounts.reduce((total, stage) => total + stage.count, 0);
  const doneTasks = stageCounts.find((stage) => stage.key === "done")?.count ?? 0;
  const due = dueHint(project);

  return (
    <div className="grid gap-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        <Link
          href={backHref}
          aria-label={`Back to ${backLabel}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="capitalize">{backLabel}</span>
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
        <span aria-current="page" className="truncate font-medium">
          {project.name}
        </span>
      </nav>

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="grid gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm"
                style={projectBadgeStyle(project.background)}
              >
                <ProjectIcon name={project.icon} className="size-5" />
              </div>
              <div className="grid min-w-0 flex-1 gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight [overflow-wrap:anywhere]">
                    {project.name}
                  </h1>
                  <Badge
                    variant="outline"
                    className={projectStatusBadgeClassNames[project.status]}
                  >
                    {projectStatusLabels[project.status]}
                  </Badge>
                  {archived && <Badge variant="secondary">Archived</Badge>}
                </div>
                {project.description ? (
                  <p className="line-clamp-3 max-w-3xl text-sm text-muted-foreground">
                    {project.description}
                  </p>
                ) : archived ? (
                  <p className="text-sm text-muted-foreground">No description.</p>
                ) : (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto w-fit p-0 text-muted-foreground"
                    onClick={onEdit}
                  >
                    <Pencil data-icon="inline-start" />
                    Add a description
                  </Button>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start">
              {archived ? (
                <Button size="sm" disabled={isRestoring} onClick={onRestore}>
                  <ArchiveRestore data-icon="inline-start" />
                  {isRestoring ? "Restoring…" : "Restore"}
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Pencil data-icon="inline-start" />
                    Edit
                  </Button>
                  <ProjectActionsMenu
                    project={project}
                    onEdit={onEdit}
                    onDeleted={onDeleted}
                    className="border"
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {project.area ? (
              <Link
                href={areaHref}
                aria-label={`View area ${project.area.name}`}
                className={cn(
                  chipClassName,
                  "bg-muted/70 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <AreaIcon name={project.area.icon} className="size-3.5 shrink-0" />
                <span className="truncate">{project.area.name}</span>
              </Link>
            ) : (
              <span className={cn(chipClassName, "text-muted-foreground")}>
                <Inbox className="size-3.5 shrink-0" aria-hidden="true" />
                Inbox
              </span>
            )}

            {project.area ? (
              <button
                type="button"
                aria-label={`Manage goals for ${project.name}`}
                className={cn(
                  chipClassName,
                  "bg-muted/70 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                )}
                onClick={onOpenGoals}
              >
                <StarCheck className="size-3.5 shrink-0" aria-hidden="true" />
                {plural(project.goals.count, "goal")}
              </button>
            ) : (
              <span
                className={cn(chipClassName, "text-muted-foreground")}
                title="Assign an area to track goals"
              >
                <StarCheck className="size-3.5 shrink-0" aria-hidden="true" />
                No goals
              </span>
            )}

            <span className={cn(chipClassName, "text-muted-foreground")}>
              <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
              {scheduleLabel(project)}
              {due && <span className="text-foreground">· {due}</span>}
            </span>

            {project.is_overdue && (
              <span
                className={cn(
                  chipClassName,
                  "bg-red-500/10 text-red-700 dark:text-red-300",
                )}
                title="Keep going — small progress still counts."
              >
                <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                {plural(project.days_overdue ?? 0, "day")} overdue
              </span>
            )}
          </div>

          {archived && (
            <Alert role="note" className="bg-muted/40">
              <Archive aria-hidden="true" />
              <AlertDescription>
                This project is archived and read-only. Restore it to make
                changes.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2.5 border-t pt-4">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">Progress</span>
              <span className="tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>
            <Progress value={progress} aria-label="Project progress" />
            {totalTasks > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Tasks by stage">
                  {stageCounts.map((stage) => (
                    <li key={stage.key} className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: stageDotColors[stage.key] }}
                        aria-hidden="true"
                      />
                      <span className="tabular-nums text-foreground">{stage.count}</span>
                      {stage.label}
                    </li>
                  ))}
                </ul>
                <span className="tabular-nums">
                  {doneTasks} of {plural(totalTasks, "task")} done
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
