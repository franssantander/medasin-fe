import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TrashPendingAction } from "../hooks/use-trash-list";

type TrashActionDialogProps = {
  pendingAction?: TrashPendingAction;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function TrashActionDialog({
  pendingAction,
  isPending,
  onCancel,
  onConfirm,
}: TrashActionDialogProps) {
  const isRestore = pendingAction?.action === "restore";

  return (
    <Dialog open={Boolean(pendingAction)} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isRestore ? "Restore item?" : "Delete forever?"}</DialogTitle>
          <DialogDescription>
            {isRestore
              ? `“${pendingAction.item.title}”${pendingAction.item.group_size > 1 ? ` and ${pendingAction.item.group_size - 1} related items` : ""} will return to its previous location.`
              : `“${pendingAction?.item.title}” will be permanently deleted. This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={isRestore ? "default" : "destructive"}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending
              ? isRestore
                ? "Restoring…"
                : "Deleting…"
              : isRestore
                ? "Restore"
                : "Delete forever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
