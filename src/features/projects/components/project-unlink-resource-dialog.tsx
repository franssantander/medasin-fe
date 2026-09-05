"use client";

import { LoaderCircle, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog
      open={Boolean(resource)}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <DialogContent className="w-full max-w-md overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Remove resource from project?</DialogTitle>
          <DialogDescription>
            “{resource?.title}” will be unlinked from this project. The resource
            itself will not be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
