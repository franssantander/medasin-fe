"use client";

import { Archive, Inbox, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import { cn } from "@/lib/utils";
import { projectKeys, useProjectMutation } from "../queries/project-query";
import type { ProjectListCard } from "../type";
import { ProjectActionDialog } from "./project-action-dialog";

type ProjectConfirmationAction = "archive" | "delete";

export function ProjectActionsMenu({
  project,
  onEdit,
  onArchived,
  onDeleted,
  className,
}: {
  project: ProjectListCard;
  onEdit: () => void;
  onArchived?: () => void;
  onDeleted?: () => void;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [confirmationAction, setConfirmationAction] =
    useState<ProjectConfirmationAction>();
  const areaUuid = project.area?.uuid;
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

  const confirmAction = async () => {
    const action = confirmationAction;
    if (action === "archive") {
      await archive.mutateAsync();
    } else if (action === "delete") {
      await remove.mutateAsync();
    }
    setConfirmationAction(undefined);
    if (action === "archive") onArchived?.();
    if (action === "delete") onDeleted?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              className={cn(
                "relative z-10 text-muted-foreground hover:text-foreground aria-expanded:text-foreground",
                className,
              )}
              aria-label={`Actions for ${project.name}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
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
          <DropdownMenuSeparator />
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
