import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  Newspaper,
  PenLine,
  Pencil,
  Plus,
  StarCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { stageDotColors } from "@/features/projects/components/project-kanban-utils";
import { projectStatusBadgeClassNames } from "@/features/projects/project-status";
import { cn } from "@/lib/utils";
import { PreviewBoard } from "./preview-board";
import { previewProject, previewStages } from "./preview-fixtures";

// Mirrors the project detail page: header card (project-detail-header.tsx), resources, and the board.
const chipClassName = "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-2 text-xs font-medium";

export function ProjectsScreen() {
  const total = previewStages.reduce((sum, stage) => sum + stage.tasks.length, 0);
  const done = previewStages.find((stage) => stage.key === "done")?.tasks.length ?? 0;
  const progress = Math.round((done / total) * 100);

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid gap-3">
        <div className="flex min-w-0 items-center gap-1 text-sm">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground">
            <ArrowLeft className="size-4" />
            Projects
          </span>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
          <span className="truncate font-medium">{previewProject.name}</span>
        </div>
        <Card className="gap-0 overflow-hidden py-0">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm"
                  style={{ backgroundColor: previewProject.badge, color: "#ffffff" }}
                >
                  <Newspaper className="size-5" />
                </div>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-bold tracking-tight">{previewProject.name}</p>
                    <Badge variant="outline" className={projectStatusBadgeClassNames.in_progress}>
                      In progress
                    </Badge>
                  </div>
                  <p className="line-clamp-3 max-w-3xl text-sm text-muted-foreground">{previewProject.description}</p>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-2 self-start sm:flex">
                <Button variant="outline" size="sm">
                  <Pencil data-icon="inline-start" />
                  Edit
                </Button>
                <Button variant="ghost" size="icon-sm" className="border">
                  <Ellipsis />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(chipClassName, "bg-muted/70 text-foreground")}>
                <PenLine className="size-3.5 shrink-0" />
                {previewProject.area}
              </span>
              <span className={cn(chipClassName, "bg-muted/70 text-foreground")}>
                <StarCheck className="size-3.5 shrink-0" />1 goal
              </span>
              <span className={cn(chipClassName, "text-muted-foreground")}>
                <CalendarDays className="size-3.5 shrink-0" />
                Due Nov 2
              </span>
            </div>
            <div className="grid gap-2.5 border-t pt-4">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} aria-label="Project progress" />
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {previewStages.map((stage) => (
                    <li key={stage.key} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: stageDotColors[stage.key] }} />
                      <span className="text-foreground tabular-nums">{stage.tasks.length}</span>
                      {stage.key === "todos" ? "Todo" : stage.key === "in_progress" ? "In progress" : stage.name}
                    </li>
                  ))}
                </ul>
                <span className="tabular-nums">
                  {done} of {total} tasks done
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="grid gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold">
              <BookOpen className="size-4 text-muted-foreground" />
              Resources
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">1</span>
            </p>
            <Button variant="outline" size="sm">
              <Plus data-icon="inline-start" />
              Add resource
              <ChevronDown data-icon="inline-end" className="text-muted-foreground" />
            </Button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4">
            <div className="min-w-0 rounded-xl border bg-card">
              <div className="flex w-full min-w-0 items-start gap-3 rounded-xl p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <BookOpen className="size-4" />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium">Interview notes</span>
                  <span className="truncate text-xs text-muted-foreground">Ana on raised beds</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* A tall board region, like projectKanbanRegionStyles in the app. */}
      <PreviewBoard name="Board 1" stages={previewStages} fill className="md:h-[30rem]" />
    </div>
  );
}
