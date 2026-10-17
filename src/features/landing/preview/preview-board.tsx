import { ChevronDown, Ellipsis, LayoutDashboard, Plus, Search, Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/features/projects/components/project-kanban-board";
import {
  kanbanGridStyles,
  stageColumnStyles,
  stageCountStyles,
  stageDotColors,
} from "@/features/projects/components/project-kanban-utils";
import type { BoardStage } from "@/features/projects/type";
import { cn } from "@/lib/utils";

// The board toolbar (project-kanban-toolbar.tsx) and its four stage columns, shared by the Projects and Board screens.
export function PreviewBoard({
  name,
  stages,
  fill = false,
  search = true,
  className,
}: {
  name: string;
  stages: BoardStage[];
  /** The columns fit the canvas width and fill the board's height, like a board on a desktop screen. */
  fill?: boolean;
  /** Project boards have a task search; the standalone Board page does not. */
  search?: boolean;
  className?: string;
}) {
  const total = stages.reduce((sum, stage) => sum + stage.tasks.length, 0);

  return (
    <section className={cn("@container min-w-0 gap-3", fill ? "flex flex-col" : "grid", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="-ml-2 flex h-9 items-center gap-2 px-2 text-base font-semibold">
          <LayoutDashboard className="size-4 shrink-0 text-muted-foreground" />
          {name}
          <span className="text-sm font-normal text-muted-foreground tabular-nums">{total}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </span>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          {search && (
            <span className="flex h-8 w-56 items-center gap-2 rounded-lg border border-input px-2.5 text-sm text-muted-foreground">
              <Search className="size-4" />
              Search tasks…
            </span>
          )}
          <Button variant="outline" size="sm">
            <Tags />
            Labels
            <Badge variant="secondary">3</Badge>
          </Button>
          <Button variant="outline" size="icon-sm">
            <Ellipsis />
          </Button>
        </div>
      </div>
      <div
        className={cn(
          kanbanGridStyles,
          // The scaled canvas is 1280px wide, so all four columns fit side by side, as on a desktop.
          fill && "min-h-0 flex-1 md:grid-flow-row md:auto-cols-auto md:grid-cols-4 md:overflow-x-visible md:pb-0",
        )}
      >
        {stages.map((stage) => (
          <section
            key={stage.key}
            className={cn(
              "flex min-h-64 min-w-0 flex-col overflow-hidden rounded-xl border",
              fill ? "h-full" : "max-h-[40rem]",
              stageColumnStyles[stage.key].column,
            )}
          >
            <div
              className={cn(
                "flex shrink-0 items-center justify-between gap-2 border-t-2 border-b px-3 py-2",
                stageColumnStyles[stage.key].header,
              )}
            >
              <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: stageDotColors[stage.key] }} />
                <span className="truncate">{stage.name}</span>
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                    stageCountStyles[stage.key],
                  )}
                >
                  {stage.tasks.length}
                </span>
              </p>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                <Plus />
              </Button>
            </div>
            <div className="grid min-h-0 flex-1 content-start gap-2 p-2">
              {stage.tasks.map((task) => (
                <TaskCard key={task.uuid} task={task} disabled />
              ))}
            </div>
            <div className={cn("shrink-0 border-t p-1.5", stageColumnStyles[stage.key].footer)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                <Plus data-icon="inline-start" />
                Add task
              </Button>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
