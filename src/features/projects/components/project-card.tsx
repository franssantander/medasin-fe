"use client";

import {
  Archive,
  CalendarDays,
  CirclePile,
  Inbox,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  StarCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import {
  goalStatusBadgeClassNames,
  goalStatusLabels,
} from "@/features/areas/goal-status";
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import {
  projectStatusBadgeClassNames,
  projectStatusLabels,
} from "../project-status";
import { projectKeys, useProjectMutation } from "../queries/project-query";
import type { ProjectListCard } from "../type";
import { ProjectActionDialog } from "./project-action-dialog";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";

type ProjectConfirmationAction = "archive" | "delete";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

export function ProjectCard({
  project,
  onEdit,
}: {
  project: ProjectListCard;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmationAction, setConfirmationAction] =
    useState<ProjectConfirmationAction>();
  const [goalsMenuOpen, setGoalsMenuOpen] = useState(false);
  const areaUuid = project.area?.uuid;
  const goalsQuery = useQuery({
    queryKey: areaKeys.section(areaUuid ?? "", "goals", 1, "all"),
    queryFn: () => areaService.goals(areaUuid!, 1, "all"),
    enabled: goalsMenuOpen && Boolean(areaUuid),
  });
  const archive = useProjectMutation("archive", project.uuid);
  const remove = useProjectMutation("remove", project.uuid);
  const moveToInbox = useMutation({
    mutationFn: () => areaService.detachProject(areaUuid!, project.uuid),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        queryClient.invalidateQueries({ queryKey: areaKeys.all }),
      ]);
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) => {
      toast.add({ type: "error", description: error.message });
    },
  });
  const isPending =
    archive.isPending || remove.isPending || moveToInbox.isPending;
  const progress = Math.min(100, Math.max(0, project.progress_percentage));
  const statusLabel =
    projectStatusLabels[project.status] ?? project.status.replaceAll("_", " ");

  const confirmAction = async () => {
    if (confirmationAction === "archive") {
      await archive.mutateAsync();
    } else if (confirmationAction === "delete") {
      await remove.mutateAsync();
    }
    setConfirmationAction(undefined);
  };

  return (
    <>
      <Card className="relative gap-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <Link
          href={`/projects/${project.uuid}`}
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Open ${project.name}`}
        />
        <div className="absolute right-4 top-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  aria-label={`Actions for ${project.name}`}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              {project.area && (
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() => moveToInbox.mutate()}
                >
                  <Inbox />
                  Move to Inbox
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={isPending}
                onClick={() => setConfirmationAction("archive")}
              >
                <Archive />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                disabled={isPending}
                onClick={() => setConfirmationAction("delete")}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardContent className="pointer-events-none gap-4 pr-14">
          <div className="flex items-center gap-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-xl shadow-md ring-4 ring-card"
              style={projectBadgeStyle(
                project.icon ? project.background : undefined,
              )}
            >
              <ProjectIcon name={project.icon} className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate font-bold">
                {project.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={`mt-1 ${projectStatusBadgeClassNames[project.status]}`}
              >
                {statusLabel}
              </Badge>
            </div>
          </div>

          <CardDescription className="line-clamp-2 min-h-10">
            {project.description || "No description yet."}
          </CardDescription>

          <div className="grid gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress
              value={progress}
              aria-label={`${project.name} progress`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {project.area ? (
              <Button
                render={
                  <Link href={`/projects/areas/${project.area.uuid}`} />
                }
                nativeButton={false}
                variant="outline"
                size="sm"
                className="pointer-events-auto relative z-10 min-w-0 justify-start"
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
              <DropdownMenu
                open={goalsMenuOpen}
                onOpenChange={setGoalsMenuOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="pointer-events-auto relative z-10 justify-start"
                      aria-label={`View goals for ${project.name}`}
                    />
                  }
                >
                  <StarCheck />
                  {project.goals.count}{" "}
                  {project.goals.count === 1 ? "goal" : "goals"}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="bottom"
                  className="w-72 max-w-[calc(100vw-2rem)]"
                >
                  {goalsQuery.isLoading ? (
                    <div className="flex min-h-16 items-center justify-center gap-2 px-3 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading goals…
                    </div>
                  ) : goalsQuery.isError ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Goals could not be loaded.
                    </div>
                  ) : goalsQuery.data?.data.items.data.length ? (
                    goalsQuery.data.data.items.data.map((goal) => (
                      <DropdownMenuItem
                        key={goal.uuid}
                        render={
                          <Link
                            href={`/projects/areas/${project.area!.uuid}?tab=goals`}
                          />
                        }
                        className="items-start justify-between gap-3"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {goal.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`shrink-0 ${goalStatusBadgeClassNames[goal.status]}`}
                        >
                          {goalStatusLabels[goal.status]}
                        </Badge>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No goals yet.
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex h-8 items-center gap-2 rounded-md border px-3 text-muted-foreground">
                <StarCheck className="size-4" />0 goals
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <CalendarDays className="mt-0.5 size-4 shrink-0" />
            <span>
              {project.start_date && project.due_date
                ? `${formatDate(project.start_date)} – ${formatDate(project.due_date)}`
                : project.start_date
                  ? `Starts ${formatDate(project.start_date)}`
                  : project.due_date
                    ? `Due ${formatDate(project.due_date)}`
                    : "No dates set"}
            </span>
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

      <ProjectActionDialog
        action={confirmationAction}
        project={project}
        isPending={isPending}
        onConfirm={confirmAction}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirmationAction(undefined);
        }}
      />
    </>
  );
}
