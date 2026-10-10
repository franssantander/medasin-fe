"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceDialogBodySkeleton } from "./resource-skeletons";

// Stand-in for ResourceDetailDialog while a deep-linked resource loads. The
// loading state uses the same frame as the real dialog so it swaps in place.
export function ResourceOpeningDialog({
  error,
  onClose,
  onRetry,
}: {
  error?: unknown;
  onClose: () => void;
  onRetry: () => void;
}) {
  const failed = error !== undefined && error !== null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {failed ? (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resource could not be loaded</DialogTitle>
            <DialogDescription role="alert">
              {error instanceof Error
                ? error.message
                : "The resource could not be loaded. Try again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onRetry}>Try again</Button>
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent
          showCloseButton={false}
          className="h-[min(90dvh,50rem)] max-h-[92dvh] w-[calc(100%-1rem)] max-w-5xl gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)]"
        >
          <DialogHeader className="flex shrink-0 flex-row items-center gap-3 border-b px-5 py-4 pr-4 sm:px-6 sm:pr-5">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <DialogTitle>Opening resource</DialogTitle>
              <DialogDescription className="truncate">
                Loading resource details…
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 self-start"
              aria-label="Close resource dialog"
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </Button>
          </DialogHeader>
          <ResourceDialogBodySkeleton />
          <div
            aria-hidden="true"
            className="flex shrink-0 flex-col gap-3 border-t bg-popover px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <Skeleton className="h-3.5 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 sm:w-36 sm:flex-none" />
              <Skeleton className="h-9 flex-1 sm:w-16 sm:flex-none" />
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
