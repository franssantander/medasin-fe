"use client";

import { CalendarDays, FolderKanban, Inbox, Plus } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectFormDialog } from "../hooks/use-project-form-dialog";
import { useProjectsQuery } from "../queries/project-query";
import { ProjectCard } from "./project-card";
import { ProjectCalendarTimelineDialog } from "./project-calendar-timeline-dialog";
import { ProjectFormDialog } from "./project-form-dialog";

export function ProjectList() {
  const { data, isLoading, isError, refetch } = useProjectsQuery("active");
  const projectForm = useProjectFormDialog();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const activeProjects = data?.data.filter((project) => project.area) ?? [];
  const inboxProjects = data?.data.filter((project) => !project.area) ?? [];

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

      {data && (
        <Tabs defaultValue="active">
          <TabsList variant="line" className="max-w-full">
            <TabsTrigger value="active">All Active Projects</TabsTrigger>
            <TabsTrigger value="inbox">
              Inbox Projects
              <Badge
                variant="secondary"
                className="min-w-6 px-1.5 tabular-nums"
              >
                {inboxProjects.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-2">
            {activeProjects.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {activeProjects.map((project) => (
                  <ProjectCard
                    key={project.uuid}
                    project={project}
                    onEdit={() => projectForm.openEdit(project)}
                  />
                ))}
              </div>
            ) : (
              <Card className="items-center py-14 text-center">
                <div className="rounded-full bg-muted p-3">
                  <FolderKanban className="size-6" />
                </div>
                <CardTitle>No active projects</CardTitle>
                <CardDescription className="max-w-sm">
                  Projects assigned to an area will appear here. Create a
                  project and choose an area to get started.
                </CardDescription>
                <Button onClick={projectForm.openCreate}>
                  <Plus />
                  New project
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="inbox" className="mt-2">
            {inboxProjects.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {inboxProjects.map((project) => (
                  <ProjectCard
                    key={project.uuid}
                    project={project}
                    onEdit={() => projectForm.openEdit(project)}
                  />
                ))}
              </div>
            ) : (
              <Card className="items-center py-14 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Inbox className="size-6" />
                </div>
                <CardTitle>Inbox is clear</CardTitle>
                <CardDescription className="max-w-sm">
                  Projects without an area will appear here until you organize
                  them.
                </CardDescription>
                <Button onClick={projectForm.openCreate}>
                  <Plus />
                  New project
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
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
