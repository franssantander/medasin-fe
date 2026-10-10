"use client";

import { CalendarDays, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectFormDialog } from "../hooks/use-project-form-dialog";
import { useProjectListView } from "../hooks/use-project-list-view";
import {
  countProjectsByStatus,
  filterProjectsByStatus,
  searchProjects,
  sortProjects,
  type ProjectListTab,
} from "../project-list-utils";
import { useProjectsQuery } from "../queries/project-query";
import { ProjectCalendarTimelineDialog } from "./project-calendar-timeline-dialog";
import { ProjectCard } from "./project-card";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectListRow } from "./project-list-row";
import {
  ProjectListEmpty,
  ProjectListError,
} from "./project-list-states";
import { ProjectListToolbar } from "./project-list-toolbar";
import { ProjectListSkeleton } from "./project-skeletons";

const tabs: { value: ProjectListTab; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inbox", label: "Inbox" },
];

export function ProjectList() {
  const { data, isLoading, isError, refetch } = useProjectsQuery("active");
  const projectForm = useProjectFormDialog();
  const listView = useProjectListView();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const projects = data?.data;

  const tabProjects = useMemo(
    () => ({
      active: projects?.filter((project) => project.area) ?? [],
      inbox: projects?.filter((project) => !project.area) ?? [],
    }),
    [projects],
  );
  const searchedProjects = useMemo(
    () => searchProjects(tabProjects[listView.tab], listView.deferredSearch),
    [tabProjects, listView.tab, listView.deferredSearch],
  );
  const statusCounts = useMemo(
    () => countProjectsByStatus(searchedProjects),
    [searchedProjects],
  );
  const visibleProjects = useMemo(
    () =>
      sortProjects(
        filterProjectsByStatus(searchedProjects, listView.status),
        listView.sort,
      ),
    [searchedProjects, listView.status, listView.sort],
  );
  const currentTabIsEmpty = tabProjects[listView.tab].length === 0;

  const results = currentTabIsEmpty ? (
    <ProjectListEmpty
      variant={listView.tab}
      onCreate={projectForm.openCreate}
      onClearFilters={listView.clearFilters}
    />
  ) : (
    <div className="grid gap-5">
      <ProjectListToolbar
        search={listView.search}
        status={listView.status}
        sort={listView.sort}
        view={listView.view}
        counts={statusCounts}
        onSearchChange={listView.setSearch}
        onStatusChange={listView.setStatus}
        onSortChange={listView.setSort}
        onViewChange={listView.setView}
      />

      <section aria-labelledby="project-results-heading">
        <h2 id="project-results-heading" className="sr-only">
          {listView.tab === "active" ? "Active projects" : "Inbox projects"}
        </h2>
        <p className="sr-only" aria-live="polite">
          {visibleProjects.length}{" "}
          {visibleProjects.length === 1 ? "project" : "projects"} shown
        </p>

        {visibleProjects.length === 0 ? (
          <ProjectListEmpty
            variant="no-results"
            onCreate={projectForm.openCreate}
            onClearFilters={listView.clearFilters}
          />
        ) : listView.view === "list" ? (
          <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {visibleProjects.map((project) => (
              <ProjectListRow
                key={project.uuid}
                project={project}
                onEdit={() => projectForm.openEdit(project)}
              />
            ))}
          </ul>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => (
              <li key={project.uuid} className="min-w-0">
                <ProjectCard
                  project={project}
                  onEdit={() => projectForm.openEdit(project)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Projects"
        description="Organize your work into projects, and track progress with tasks, goals, and habits."
        action={
          <>
            <Button
              variant="ghost"
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

      {isLoading && <ProjectListSkeleton view={listView.view} />}

      {isError && <ProjectListError onRetry={() => void refetch()} />}

      {data && (
        <Tabs
          value={listView.tab}
          onValueChange={(value) => listView.setTab(value as ProjectListTab)}
          className="gap-6"
        >
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-4 border-b pb-1"
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-none px-0.5 group-data-horizontal/tabs:after:bottom-[-5px]"
              >
                {tab.label}
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  {tabProjects[tab.value].length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {results}
            </TabsContent>
          ))}
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
        projects={projects ?? []}
      />
    </div>
  );
}
