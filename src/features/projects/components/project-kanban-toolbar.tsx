import {
  Check,
  ChevronDown,
  Edit3,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { BoardSummary } from "../type";

export type BoardDialogValue = {
  mode: "create" | "rename";
  name: string;
};

export function ProjectKanbanToolbar({
  boards,
  selectedBoardUuid,
  archived,
  boardName,
  onSelectBoard,
  onOpenLabels,
  onOpenBoardDialog,
  onDeleteBoard,
}: {
  boards: BoardSummary[];
  selectedBoardUuid?: string;
  archived: boolean;
  boardName?: string;
  onSelectBoard: (boardUuid: string) => void;
  onOpenLabels: () => void;
  onOpenBoardDialog: (dialog: BoardDialogValue) => void;
  onDeleteBoard: () => void;
}) {
  const selectedBoard = boards.find((item) => item.uuid === selectedBoardUuid);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="w-fit max-w-full justify-between sm:max-w-96"
              aria-label="Select board"
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <LayoutDashboard className="shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selectedBoard?.name ?? "Select a board"}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {selectedBoard && (
              <Badge variant="secondary">{selectedBoard.task_count}</Badge>
            )}
            <ChevronDown className="size-4 text-muted-foreground" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={4}
          className="w-max min-w-(--anchor-width) max-w-[calc(100vw-2rem)] sm:max-w-96"
        >
          {boards.map((item) => (
            <DropdownMenuItem
              key={item.uuid}
              onClick={() => onSelectBoard(item.uuid)}
              aria-current={
                item.uuid === selectedBoardUuid ? "true" : undefined
              }
            >
              <Check
                className={
                  item.uuid === selectedBoardUuid ? "opacity-100" : "opacity-0"
                }
              />
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="truncate">{item.name}</span>
                <Badge variant="secondary">{item.task_count}</Badge>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {!archived && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenLabels}>
            <Tags />
            Labels
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Board actions"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => onOpenBoardDialog({ mode: "create", name: "" })}
              >
                <Plus />
                New board
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onOpenBoardDialog({ mode: "rename", name: boardName ?? "" })
                }
              >
                <Edit3 />
                Rename board
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                disabled={boards.length <= 1}
                onClick={onDeleteBoard}
              >
                <Trash2 />
                Delete board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export function ProjectBoardDialog({
  dialog,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  dialog?: BoardDialogValue;
  isSaving: boolean;
  onChange: (dialog: BoardDialogValue) => void;
  onClose: () => void;
  onSave: (dialog: BoardDialogValue) => void;
}) {
  return (
    <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {dialog?.mode === "create" ? "New board" : "Rename board"}
          </DialogTitle>
          <DialogDescription>
            Use a focused board name that describes this stream of work.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={dialog?.name ?? ""}
          onChange={(event) =>
            dialog && onChange({ ...dialog, name: event.target.value })
          }
          placeholder={
            dialog?.mode === "create" ? "Board name (optional)" : "Board name"
          }
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              isSaving || (dialog?.mode === "rename" && !dialog.name.trim())
            }
            onClick={() =>
              dialog && onSave({ ...dialog, name: dialog.name.trim() })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
