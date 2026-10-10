"use client";

import { LoaderCircle, Unlink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Resource } from "@/features/resources/type";

export function ProjectUnlinkResourceDialog({
  resource,
  isPending,
  onClose,
  onConfirm,
}: {
  resource?: Resource;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={Boolean(resource)}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Unlink className="size-5" aria-hidden="true" />
          </span>
          <AlertDialogTitle>Remove resource from project?</AlertDialogTitle>
          <AlertDialogDescription>
            “{resource?.title}” will be unlinked from this project. The resource
            itself will not be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Unlink />
            )}
            {isPending ? "Removing…" : "Remove resource"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
