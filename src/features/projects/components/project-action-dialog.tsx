import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectListCard } from "../type";

export function ProjectActionDialog({
  action,
  project,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  action?: "archive" | "delete";
  project: ProjectListCard;
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
            {isDeleting ? "Delete project?" : "Archive project?"}
          </DialogTitle>
          <DialogDescription>
            {isDeleting
              ? `“${project.name}” will be permanently deleted. This action cannot be undone.`
              : `“${project.name}” will be moved to your archived projects. You can restore it later.`}
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
                ? "Delete project"
                : "Archive project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
