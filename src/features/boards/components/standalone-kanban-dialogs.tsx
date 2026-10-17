import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectLabelDialog } from "@/features/projects/components/project-label-dialog";
import { ProjectBoardDialog } from "@/features/projects/components/project-kanban-toolbar";
import type { StandaloneKanbanController } from "../hooks/use-standalone-kanban";

type BoardDialogsProps = Pick<
  StandaloneKanbanController,
  | "board"
  | "boardDialog"
  | "deleteBoardOpen"
  | "labelsOpen"
  | "mutations"
  | "setBoardDialog"
  | "setDeleteBoardOpen"
  | "setLabelsOpen"
>;

export function StandaloneKanbanDialogs({
  board,
  boardDialog,
  deleteBoardOpen,
  labelsOpen,
  mutations,
  setBoardDialog,
  setDeleteBoardOpen,
  setLabelsOpen,
}: BoardDialogsProps) {
  return (
    <>
      {board && (
        <ProjectLabelDialog
          open={labelsOpen}
          onOpenChange={setLabelsOpen}
          labels={board.labels}
          isPending={
            mutations.saveLabel.isPending || mutations.deleteLabel.isPending
          }
          onSave={(input, label) =>
            mutations.saveLabel
              .mutateAsync({ input, label })
              .then(() => undefined)
          }
          onDelete={(label) =>
            mutations.deleteLabel.mutateAsync(label.uuid).then(() => undefined)
          }
        />
      )}
      <ProjectBoardDialog
        dialog={boardDialog}
        isSaving={mutations.saveBoard.isPending}
        onChange={setBoardDialog}
        onClose={() => setBoardDialog(undefined)}
        onSave={(value) =>
          mutations.saveBoard.mutate(value, {
            onSuccess: () => setBoardDialog(undefined),
          })
        }
      />
      <Dialog
        open={deleteBoardOpen}
        onOpenChange={(open) =>
          !mutations.deleteBoard.isPending && setDeleteBoardOpen(open)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete board?</DialogTitle>
            <DialogDescription>
              “{board?.name}” and all of its tasks will move to Trash for 30
              days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={mutations.deleteBoard.isPending}
              onClick={() => setDeleteBoardOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={mutations.deleteBoard.isPending}
              onClick={() =>
                mutations.deleteBoard.mutate(undefined, {
                  onSuccess: () => setDeleteBoardOpen(false),
                })
              }
            >
              Delete board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
