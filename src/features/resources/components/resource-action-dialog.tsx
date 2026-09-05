import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Resource } from "../type";

export function ResourceActionDialog({
  resource,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  resource?: Resource;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(resource)} onOpenChange={onOpenChange}>
      <DialogContent className="w-full overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Archive resource?</DialogTitle>
          <DialogDescription>
            {resource
              ? `“${resource.title}” will be archived and removed from your active resources.`
              : "This resource will be archived."}
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
          <Button disabled={isPending} onClick={onConfirm}>
            {isPending ? "Archiving…" : "Archive resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
