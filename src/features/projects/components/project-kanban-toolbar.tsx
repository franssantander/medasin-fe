import {
  Check,
  ChevronDown,
  Edit3,
  LayoutDashboard,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Tags,
  Trash2,
  X,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
  labelCount,
  search = "",
  onSearchChange,
  onSelectBoard,
  onOpenLabels,
  onOpenBoardDialog,
  onDeleteBoard,
}: {
  boards: BoardSummary[];
  selectedBoardUuid?: string;
  archived: boolean;
  boardName?: string;
  labelCount?: number;
  search?: string;
  onSearchChange?: (value: string) => void;
  onSelectBoard: (boardUuid: string) => void;
  onOpenLabels: () => void;
  onOpenBoardDialog: (dialog: BoardDialogValue) => void;
  onDeleteBoard: () => void;
}) {
  const selectedBoard = boards.find((item) => item.uuid === selectedBoardUuid);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="-ml-2 h-9 w-fit max-w-full justify-between gap-2 px-2 text-base font-semibold sm:max-w-96"
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
          <span className="flex shrink-0 items-center gap-1.5">
            {selectedBoard && (
              <span className="text-sm font-normal tabular-nums text-muted-foreground">
                {selectedBoard.task_count}
              </span>
            )}
            <ChevronDown className="size-4 text-muted-foreground" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={4}
          className="w-max min-w-56 max-w-[calc(100vw-2rem)] sm:max-w-96"
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
                <span className="text-xs tabular-nums text-muted-foreground">
                  {item.task_count}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
          {!archived && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onOpenBoardDialog({ mode: "create", name: "" })}
              >
                <Plus />
                New board
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div
        className={
          onSearchChange
            ? "ml-auto flex w-full items-center gap-2 sm:w-auto"
            : "ml-auto flex items-center gap-2"
        }
      >
        {onSearchChange && (
          <InputGroup className="h-8 flex-1 sm:w-56 sm:flex-none">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search tasks"
              placeholder="Search tasks…"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && search) {
                  event.preventDefault();
                  onSearchChange("");
                }
              }}
              className="[&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear task search"
                  onClick={() => onSearchChange("")}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        )}
        {!archived && (
          <>
            <Button
              variant="outline"
              size="sm"
              aria-label="Manage board labels"
              onClick={onOpenLabels}
            >
              <Tags />
              <span className="max-sm:hidden">Labels</span>
              {Boolean(labelCount) && (
                <Badge variant="secondary" className="max-sm:hidden">
                  {labelCount}
                </Badge>
              )}
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    onOpenBoardDialog({ mode: "create", name: "" })
                  }
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
                <DropdownMenuSeparator />
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
          </>
        )}
      </div>
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
  const creating = dialog?.mode === "create";
  const canSave = !isSaving && (creating || Boolean(dialog?.name.trim()));

  return (
    <Dialog
      open={Boolean(dialog)}
      onOpenChange={(open) => !open && !isSaving && onClose()}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{creating ? "New board" : "Rename board"}</DialogTitle>
          <DialogDescription>
            {creating
              ? "Boards split a project into separate streams of work, each with its own stages and tasks."
              : "Give this board a short name that describes its stream of work."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="project-board-form"
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (dialog && canSave)
              onSave({ ...dialog, name: dialog.name.trim() });
          }}
        >
          <Field className="gap-2">
            <FieldLabel htmlFor="project-board-name">Board name</FieldLabel>
            <Input
              id="project-board-name"
              autoFocus
              maxLength={120}
              value={dialog?.name ?? ""}
              disabled={isSaving}
              onChange={(event) =>
                dialog && onChange({ ...dialog, name: event.target.value })
              }
              placeholder={
                creating ? "e.g. Launch, Research, Content" : "Board name"
              }
            />
            {creating && (
              <FieldDescription className="text-xs">
                Optional — leave blank to use a numbered name.
              </FieldDescription>
            )}
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" disabled={isSaving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="project-board-form" disabled={!canSave}>
            {isSaving && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {isSaving ? "Saving…" : creating ? "Create board" : "Save name"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
