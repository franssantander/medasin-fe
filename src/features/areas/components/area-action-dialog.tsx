import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Area } from "../type";

export type AreaConfirmationAction = "archive" | "delete";

export function AreaActionDialog({
  action,
  area,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  action?: AreaConfirmationAction;
  area: Area;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const isDeleting = action === "delete";

  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isDeleting ? "Delete area?" : "Archive area?"}
          </DialogTitle>
          <DialogDescription>
            {isDeleting
              ? `“${area.name}” will be permanently deleted. This action cannot be undone.`
              : `“${area.name}” will be moved to your archived areas. You can restore it later.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant={isDeleting ? "destructive" : "default"}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending
              ? isDeleting
                ? "Deleting…"
                : "Archiving…"
              : isDeleting
                ? "Delete area"
                : "Archive area"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
