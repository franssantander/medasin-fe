"use client";

import {
  ArchiveRestore,
  CalendarDays,
  CirclePile,
  Target,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  projectStatusBadgeClassNames,
  projectStatusLabels,
} from "../project-status";
import { useProjectMutation, useProjectsQuery } from "../queries/project-query";
import type { ProjectListCard } from "../type";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";

export function ProjectArchives() {
  const query = useProjectsQuery("archived");

  return (
    <section className="grid gap-5" aria-labelledby="archived-projects-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Target className="size-4" />
          </div>
          <div>
            <h2 id="archived-projects-title" className="font-semibold">
              Archived projects
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Restore a project when you are ready to continue its work and
              Kanban board.
            </p>
          </div>
        </div>
        {query.data && (
          <Badge variant="secondary" className="tabular-nums">
            {query.data.data.length} archived
          </Badge>
        )}
      </div>

      {query.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-64 rounded-xl" />
          ))}
        </div>
      )}

      {query.isError && (
        <Card className="items-center py-10 text-center">
          <CardTitle>Archived projects could not be loaded</CardTitle>
          <CardDescription>
            Check your connection and try again.
          </CardDescription>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {query.data?.data.length === 0 && (
        <Card className="items-center py-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <Target className="size-6" />
          </div>
          <CardTitle>No archived projects</CardTitle>
          <CardDescription className="max-w-sm">
            Projects you archive will appear here until you restore them.
          </CardDescription>
        </Card>
      )}

      {query.data && query.data.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {query.data.data.map((project) => (
            <ArchivedProjectCard key={project.uuid} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArchivedProjectCard({ project }: { project: ProjectListCard }) {
  const restore = useProjectMutation("restore", project.uuid);

  return (
    <Card className="relative h-full gap-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/archives/projects/${project.uuid}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Open ${project.name}`}
      />
      <CardContent className="pointer-events-none h-full gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={projectBadgeStyle(project.background)}
          >
            <ProjectIcon name={project.icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{project.name}</CardTitle>
            <CardDescription>Archived project</CardDescription>
          </div>
        </div>
        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {project.description || "No description was added to this project."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={projectStatusBadgeClassNames[project.status]}
          >
            {projectStatusLabels[project.status]}
          </Badge>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {project.area ? (
              <CirclePile className="size-3.5 shrink-0" />
            ) : (
              <Inbox className="size-3.5 shrink-0" />
            )}
            <span className="truncate">{project.area?.name || "Inbox"}</span>
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {project.archived_at
              ? `Archived ${formatDate(project.archived_at)}`
              : "Archived"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="pointer-events-auto relative z-10"
            disabled={restore.isPending}
            onClick={() => restore.mutate()}
          >
            <ArchiveRestore />
            {restore.isPending ? "Restoring…" : "Restore"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
