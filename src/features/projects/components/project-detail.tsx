"use client";

import { ArrowLeft, CalendarDays, CirclePile, Inbox, RefreshCw, StarCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectQuery } from "../queries/project-query";
import type { ProjectStatus } from "../type";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";
import { ProjectKanban } from "./project-kanban";

const statusLabels: Record<ProjectStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

export function ProjectDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const projectQuery = useProjectQuery(uuid);
  const project = projectQuery.data?.data;

  if (projectQuery.isLoading) return <div className="grid gap-5"><Skeleton className="h-40 rounded-xl" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-[30rem] rounded-xl" />)}</div></div>;
  if (projectQuery.isError || !project) return <Card className="items-center py-14 text-center"><CardTitle>Project could not be loaded</CardTitle><CardDescription>Check your connection and try again.</CardDescription><Button variant="outline" onClick={() => projectQuery.refetch()}><RefreshCw />Try again</Button></Card>;

  const archived = Boolean(project.archived_at);
  const progress = Math.min(100, Math.max(0, project.progress_percentage));

  return <div className="grid min-w-0 gap-5">
    <div><Button render={<Link href={archived ? "/archives" : "/projects"} />} nativeButton={false} variant="ghost" size="sm"><ArrowLeft />Back to {archived ? "archives" : "projects"}</Button></div>
    <Card className="overflow-hidden">
      <CardContent className="grid gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-md ring-4 ring-card" style={projectBadgeStyle(project.icon ? project.background : undefined)}><ProjectIcon name={project.icon} className="size-6" /></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight">{project.name}</h1><Badge variant={project.status === "completed" ? "default" : "secondary"}>{statusLabels[project.status]}</Badge>{archived && <Badge variant="outline">Archived</Badge>}</div><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{project.description || "No description yet."}</p></div>
          <div className="grid min-w-44 gap-2 text-sm">
            {project.area ? <Button render={<Link href={`/areas/${project.area.uuid}`} />} nativeButton={false} variant="outline" size="sm" className="justify-start"><CirclePile /><span className="truncate">{project.area.name}</span></Button> : <div className="flex h-8 items-center gap-2 rounded-md border px-3 text-muted-foreground"><Inbox className="size-4" />Inbox</div>}
            <div className="flex h-8 items-center gap-2 rounded-md border px-3 text-muted-foreground"><StarCheck className="size-4" />{project.goals.count} {project.goals.count === 1 ? "goal" : "goals"}</div>
          </div>
        </div>
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-2"><div className="flex items-center justify-between text-xs"><span className="font-medium">Project progress</span><span className="text-muted-foreground">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4" />{project.start_date && project.due_date ? `${formatDate(project.start_date)} – ${formatDate(project.due_date)}` : project.start_date ? `Starts ${formatDate(project.start_date)}` : project.due_date ? `Due ${formatDate(project.due_date)}` : "No dates set"}</div>
        </div>
        {project.is_overdue && <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span>{project.days_overdue} {project.days_overdue === 1 ? "day" : "days"} overdue — keep going; small progress still counts.</span></div>}
      </CardContent>
    </Card>
    <ProjectKanban projectUuid={uuid} boards={project.boards} archived={archived} />
  </div>;
}
