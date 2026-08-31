"use client";

import {
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  CirclePile,
  Inbox,
  RefreshCw,
  StarCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  projectStatusBadgeClassNames,
  projectStatusLabels,
} from "../project-status";
import { useProjectMutation, useProjectQuery } from "../queries/project-query";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";
import { ProjectGoalsDialog } from "./project-goals-dialog";
import { ProjectKanban } from "./project-kanban";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

export function ProjectDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const projectQuery = useProjectQuery(uuid);
  const restore = useProjectMutation("restore", uuid);
  const project = projectQuery.data?.data;

  if (projectQuery.isLoading)
    return (
      <div className="grid gap-5">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-[30rem] rounded-xl" />
          ))}
        </div>
      </div>
    );
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
  const progress = Math.min(100, Math.max(0, project.progress_percentage));

  return (
    <div className="grid min-w-0 gap-5">
      <div>
        <Button
          render={<Link href={archived ? "/archives" : "/projects"} />}
          nativeButton={false}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft />
          Back to {archived ? "archives" : "projects"}
        </Button>
      </div>
      <Card className="overflow-hidden">
        <CardContent className="grid gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-md ring-4 ring-card"
              style={projectBadgeStyle(
                project.icon ? project.background : undefined,
              )}
            >
              <ProjectIcon name={project.icon} className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {project.name}
                </h1>
                <Badge
                  variant="outline"
                  className={projectStatusBadgeClassNames[project.status]}
                >
                  {projectStatusLabels[project.status]}
                </Badge>
                {archived && <Badge variant="outline">Archived</Badge>}
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                {project.description || "No description yet."}
              </p>
            </div>
            <div className="grid min-w-44 gap-2 text-sm">
              {archived && (
                <Button
                  size="sm"
                  className="justify-start"
                  disabled={restore.isPending}
                  onClick={() => restore.mutate()}
                >
                  <ArchiveRestore />
                  {restore.isPending ? "Restoring…" : "Restore"}
                </Button>
              )}
              {project.area ? (
                <Button
                  render={<Link href={`/areas/${project.area.uuid}`} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <CirclePile />
                  <span className="truncate">{project.area.name}</span>
                </Button>
              ) : (
                <div className="flex h-8 items-center gap-2 rounded-md border px-3 text-muted-foreground">
                  <Inbox className="size-4" />
                  Inbox
                </div>
              )}
              {project.area ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  aria-label={`Manage goals for ${project.name}`}
                  onClick={() => setGoalsOpen(true)}
                >
                  <StarCheck />
                  {project.goals.count}{" "}
                  {project.goals.count === 1 ? "goal" : "goals"}
                </Button>
              ) : (
                <div className="flex h-8 items-center gap-2 rounded-md border px-3 text-muted-foreground">
                  <StarCheck className="size-4" />0 goals
                </div>
              )}
            </div>
          </div>
          {archived && (
            <p className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              This Project is read-only. Restore it before making changes.
            </p>
          )}
          <div className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Project progress</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} aria-label="Project progress" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-4" />
            {project.start_date && project.due_date
              ? `${formatDate(project.start_date)} – ${formatDate(project.due_date)}`
              : project.start_date
                ? `Starts ${formatDate(project.start_date)}`
                : project.due_date
                  ? `Due ${formatDate(project.due_date)}`
                  : "No dates set"}
          </div>
          {project.is_overdue && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {project.days_overdue}{" "}
                {project.days_overdue === 1 ? "day" : "days"} overdue — keep
                going; small progress still counts.
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      <ProjectKanban
        projectUuid={uuid}
        boards={project.boards}
        archived={archived}
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
    </div>
  );
}
