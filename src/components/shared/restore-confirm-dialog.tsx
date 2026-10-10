"use client";

import { useRef } from "react";
import { ArchiveRestore, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type RestoreKind = "area" | "project" | "resource";

export type RestoreProjectDetails = {
  /** Name of the project's area, if it has one. */
  areaName?: string | null;
  /** Whether that area is still archived. Unknown when undefined. */
  areaArchived?: boolean;
};

const plural: Record<RestoreKind, string> = {
  area: "areas",
  project: "projects",
  resource: "resources",
};

function restoreNote(kind: RestoreKind, project?: RestoreProjectDetails) {
  if (kind === "area") {
    return "Projects that moved to Inbox when this area was archived stay in Inbox. You can link them again from the area.";
  }
  if (kind === "resource") {
    return "Links to projects and areas that were removed when it was archived won’t be reconnected.";
  }
  if (!project?.areaName) return "It will return to your Inbox.";
  if (project.areaArchived === true) {
    return `Its area “${project.areaName}” is still archived, so this project will move to Inbox.`;
  }
  if (project.areaArchived === false) {
    return `It will return to the “${project.areaName}” area.`;
  }
  return `It will return to “${project.areaName}”, or to Inbox if that area is still archived.`;
}

export function RestoreConfirmDialog({
  open,
  kind,
  name,
  project,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  kind: RestoreKind;
  name: string;
  project?: RestoreProjectDetails;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <AlertDialogContent initialFocus={cancelRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore {kind}?</AlertDialogTitle>
          <AlertDialogDescription>
            “{name}” will return to your active {plural[kind]} and become
            editable again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p
          role="note"
          className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{restoreNote(kind, project)}</span>
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            <ArchiveRestore data-icon="inline-start" aria-hidden="true" />
            {isPending ? "Restoring…" : `Restore ${kind}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
