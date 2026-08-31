"use client";

import { CalendarDays, FolderKanban, Plus } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectFormDialog } from "../hooks/use-project-form-dialog";
import { useProjectsQuery } from "../queries/project-query";
import { ProjectCard } from "./project-card";
import { ProjectCalendarTimelineDialog } from "./project-calendar-timeline-dialog";
import { ProjectFormDialog } from "./project-form-dialog";

export function ProjectList() {
  const { data, isLoading, isError, refetch } = useProjectsQuery("active");
  const projectForm = useProjectFormDialog();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Projects"
        action={
          <>
            <Button
              variant="outline"
              disabled={!data}
              aria-haspopup="dialog"
              onClick={() => setCalendarOpen(true)}
            >
              <CalendarDays />
              Calendar
            </Button>
            <Button onClick={projectForm.openCreate}>
              <Plus />
              New project
            </Button>
          </>
        }
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-96 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="items-center py-12 text-center">
          <CardTitle>Projects could not be loaded</CardTitle>
          <CardDescription>
            Check your connection and try again.
          </CardDescription>
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {data?.data.length === 0 && (
        <Card className="items-center py-14 text-center">
          <div className="rounded-full bg-muted p-3">
            <FolderKanban className="size-6" />
          </div>
          <CardTitle>Create your first project</CardTitle>
          <CardDescription className="max-w-sm">
            Turn an outcome into a focused plan with goals, deadlines, and
            visible progress.
          </CardDescription>
          <Button onClick={projectForm.openCreate}>
            <Plus />
            New project
          </Button>
        </Card>
      )}

      {data && data.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.data.map((project) => (
            <ProjectCard
              key={project.uuid}
              project={project}
              onEdit={() => projectForm.openEdit(project)}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={projectForm.isOpen}
        onOpenChange={projectForm.setIsOpen}
        project={projectForm.project}
        isPending={projectForm.isPending}
        onSubmit={projectForm.submit}
      />

      <ProjectCalendarTimelineDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        projects={data?.data ?? []}
      />
    </div>
  );
}
