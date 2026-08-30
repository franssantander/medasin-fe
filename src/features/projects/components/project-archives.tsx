"use client";

import { ArchiveRestore, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectMutation, useProjectsQuery } from "../queries/project-query";
import type { ProjectListCard } from "../type";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";

export function ProjectArchives() {
  const query = useProjectsQuery("archived");

  return (
    <section className="grid gap-4" aria-labelledby="archived-projects-title">
      <div>
        <h2 id="archived-projects-title" className="font-semibold">
          Archived projects
        </h2>
        <p className="text-sm text-muted-foreground">
          Restore projects when you are ready to continue them.
        </p>
      </div>

      {query.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {query.isError && (
        <Card className="items-center py-10 text-center">
          <CardTitle>Archived projects could not be loaded</CardTitle>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {query.data?.data.length === 0 && (
        <Card className="items-center py-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <FolderKanban />
          </div>
          <CardTitle>No archived projects</CardTitle>
          <CardDescription>
            Projects you archive will appear here.
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
    <Card>
      <CardContent className="gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={projectBadgeStyle(project.background)}
          >
            <ProjectIcon name={project.icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{project.name}</CardTitle>
            <CardDescription>
              {project.archived_at
                ? `Archived ${formatDate(project.archived_at)}`
                : "Archived"}
            </CardDescription>
          </div>
        </div>
        {project.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {project.description}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={restore.isPending}
          onClick={() => restore.mutate()}
        >
          <ArchiveRestore />
          {restore.isPending ? "Restoring…" : "Restore"}
        </Button>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
