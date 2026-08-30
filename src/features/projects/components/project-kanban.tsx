"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CalendarDays,
  ChevronDown,
  Circle,
  Clock3,
  Edit3,
  FileText,
  GripVertical,
  LayoutDashboard,
  Link2,
  MoreHorizontal,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import type { NoteTreeNode } from "@/features/areas/type";
import { projectKeys, useProjectBoardQuery } from "../queries/project-query";
import { projectService } from "../services/project-service";
import type {
  Board,
  BoardLabel,
  BoardStage,
  BoardStageKey,
  BoardSummary,
  BoardTask,
  BoardTaskInput,
  BoardTaskNoteLink,
  BoardTaskResourceLink,
  ProjectApiResponse,
} from "../type";
import { ProjectLabelDialog } from "./project-label-dialog";

const priorityStyles = {
  low: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const stageCountStyles: Record<BoardStageKey, string> = {
  backlog: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  todos: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const stageDotColors: Record<BoardStageKey, string> = {
  backlog: "#64748b",
  todos: "#3b82f6",
  in_progress: "#f59e0b",
  done: "#10b981",
};

const priorityDotColors: Record<BoardTask["priority"], string> = {
  low: "#64748b",
  medium: "#f59e0b",
  high: "#ef4444",
};

const kanbanGridStyles =
  "grid w-full min-w-0 grid-flow-col auto-cols-[minmax(18rem,1fr)] gap-4 overflow-x-auto pb-4 @[64rem]:grid-flow-row @[64rem]:grid-cols-4 @[64rem]:auto-cols-auto @[64rem]:overflow-x-visible @[64rem]:pb-0";

function StatusDot({ color }: { color: string }) {
  return (
    <Circle
      aria-hidden="true"
      className="size-2.5 shrink-0 self-center fill-current"
      style={{ color }}
    />
  );
}

function StatusValue({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
      <StatusDot color={color} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function LabelBadge({ label }: { label: BoardLabel }) {
  return (
    <Badge
      className="border-transparent"
      style={{
        backgroundColor: label.hex,
        color: getLabelTextColor(label.hex),
      }}
    >
      {label.name}
    </Badge>
  );
}

export function ProjectKanban({
  projectUuid,
  boards,
  archived,
}: {
  projectUuid: string;
  boards: BoardSummary[];
  archived: boolean;
}) {
  const queryClient = useQueryClient();
  const [selectedBoardUuid, setSelectedBoardUuid] = useState<
    string | undefined
  >(boards[0]?.uuid);
  const [taskDraft, setTaskDraft] = useState<{
    stage: BoardStageKey;
    title: string;
  }>();
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [boardDialog, setBoardDialog] = useState<{
    mode: "create" | "rename";
    name: string;
  }>();
  const [activeTask, setActiveTask] = useState<BoardTask>();
  const [selectedTaskUuid, setSelectedTaskUuid] = useState<string>();
  const boardQuery = useProjectBoardQuery(projectUuid, selectedBoardUuid);
  const board = boardQuery.data?.data;
  const selectedTask = board?.stages
    .flatMap((stage) => stage.tasks)
    .find((task) => task.uuid === selectedTaskUuid);
  const selectedBoard = boards.find((item) => item.uuid === selectedBoardUuid);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const refresh = async (message?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectUuid),
      }),
      selectedBoardUuid
        ? queryClient.invalidateQueries({
            queryKey: projectKeys.board(projectUuid, selectedBoardUuid),
          })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    ]);
    if (message) toast.add({ type: "success", description: message });
  };
  const mutationError = (error: Error) =>
    toast.add({ type: "error", description: error.message });

  const taskMutation = useMutation({
    scope: { id: `task:${selectedBoardUuid}:${selectedTaskUuid}` },
    mutationFn: ({
      taskUuid,
      input,
    }: {
      taskUuid: string;
      input: BoardTaskInput;
    }) =>
      projectService.updateTask(
        projectUuid,
        selectedBoardUuid!,
        taskUuid,
        input,
      ),
    onSuccess: (response) => refresh(response.message),
    onError: mutationError,
  });
  const createTask = useMutation({
    mutationFn: (input: BoardTaskInput) =>
      projectService.createTask(projectUuid, selectedBoardUuid!, input),
    onSuccess: async (response, input) => {
      setTaskDraft((draft) =>
        draft?.stage === input.stage && draft.title.trim() === input.title
          ? undefined
          : draft,
      );
      await refresh(response.message);
    },
    onError: mutationError,
  });
  const deleteTask = useMutation({
    mutationFn: (taskUuid: string) =>
      projectService.removeTask(projectUuid, selectedBoardUuid!, taskUuid),
    onSuccess: async (response, taskUuid) => {
      if (selectedTaskUuid === taskUuid) setSelectedTaskUuid(undefined);
      await refresh(response.message);
    },
    onError: mutationError,
  });
  const saveBoard = useMutation({
    mutationFn: ({
      mode,
      name,
    }: {
      mode: "create" | "rename";
      name: string;
    }) =>
      mode === "create"
        ? projectService.createBoard(projectUuid, name || undefined)
        : projectService.updateBoard(projectUuid, selectedBoardUuid!, name),
    onSuccess: async (response, values) => {
      setBoardDialog(undefined);
      await refresh(response.message);
      if (values.mode === "create") setSelectedBoardUuid(response.data.uuid);
    },
    onError: mutationError,
  });
  const deleteBoard = useMutation({
    mutationFn: () =>
      projectService.removeBoard(projectUuid, selectedBoardUuid!),
    onSuccess: async (response) => {
      const next = boards.find((item) => item.uuid !== selectedBoardUuid);
      setSelectedBoardUuid(next?.uuid);
      await refresh(response.message);
    },
    onError: mutationError,
  });
  const saveLabel = useMutation({
    mutationFn: ({
      input,
      label,
    }: {
      input: Parameters<typeof projectService.createLabel>[2];
      label?: BoardLabel;
    }) =>
      label
        ? projectService.updateLabel(
            projectUuid,
            selectedBoardUuid!,
            label.uuid,
            input,
          )
        : projectService.createLabel(projectUuid, selectedBoardUuid!, input),
    onSuccess: (response) => refresh(response.message),
    onError: mutationError,
  });
  const deleteLabel = useMutation({
    mutationFn: (labelUuid: string) =>
      projectService.removeLabel(projectUuid, selectedBoardUuid!, labelUuid),
    onSuccess: (response) => refresh(response.message),
    onError: mutationError,
  });
  const moveTask = useMutation({
    mutationFn: ({
      taskUuid,
      stage,
      position,
    }: {
      taskUuid: string;
      stage: BoardStageKey;
      position: number;
    }) =>
      projectService.moveTask(
        projectUuid,
        selectedBoardUuid!,
        taskUuid,
        stage,
        position,
      ),
    onMutate: ({ taskUuid, stage, position }) => {
      const key = projectKeys.board(projectUuid, selectedBoardUuid!);
      const previous = queryClient.getQueryData<ProjectApiResponse<Board>>(key);
      queryClient.setQueryData<ProjectApiResponse<Board>>(key, (current) =>
        current
          ? {
              ...current,
              data: moveLocally(current.data, taskUuid, stage, position),
            }
          : current,
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous)
        queryClient.setQueryData(
          projectKeys.board(projectUuid, selectedBoardUuid!),
          context.previous,
        );
      mutationError(error);
    },
    onSuccess: (response) => refresh(response.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(undefined);
    if (!board || !event.over || event.active.id === event.over.id) return;
    const task = board.stages
      .flatMap((stage) => stage.tasks)
      .find((item) => item.uuid === event.active.id);
    if (!task) return;
    const overId = String(event.over.id);
    const targetStage = overId.startsWith("stage:")
      ? board.stages.find((stage) => stage.key === overId.slice(6))
      : board.stages.find((stage) =>
          stage.tasks.some((item) => item.uuid === overId),
        );
    if (!targetStage) return;
    const position = overId.startsWith("stage:")
      ? targetStage.tasks.length
      : Math.max(
          0,
          targetStage.tasks.findIndex((item) => item.uuid === overId),
        );
    moveTask.mutate({ taskUuid: task.uuid, stage: targetStage.key, position });
  };

  return (
    <div className="@container grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between sm:w-72"
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
            className="w-72"
          >
            {boards.map((item) => (
              <DropdownMenuItem
                key={item.uuid}
                onClick={() => {
                  setTaskDraft(undefined);
                  setSelectedTaskUuid(undefined);
                  setSelectedBoardUuid(item.uuid);
                }}
                aria-current={
                  item.uuid === selectedBoardUuid ? "true" : undefined
                }
              >
                <Check
                  className={
                    item.uuid === selectedBoardUuid
                      ? "opacity-100"
                      : "opacity-0"
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLabelsOpen(true)}
            >
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
                  onClick={() => setBoardDialog({ mode: "create", name: "" })}
                >
                  <Plus />
                  New board
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setBoardDialog({ mode: "rename", name: board?.name ?? "" })
                  }
                >
                  <Edit3 />
                  Rename board
                </DropdownMenuItem>
                <DropdownMenuItem
                  destructive
                  disabled={boards.length <= 1}
                  onClick={() => {
                    if (
                      window.confirm("Delete this board and all of its tasks?")
                    )
                      deleteBoard.mutate();
                  }}
                >
                  <Trash2 />
                  Delete board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {boardQuery.isLoading ? (
        <div className={kanbanGridStyles}>
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-[32rem] rounded-xl" />
          ))}
        </div>
      ) : boardQuery.isError || !board ? (
        <Card className="items-center py-12">
          <CardTitle>Board could not be loaded</CardTitle>
          <Button variant="outline" onClick={() => boardQuery.refetch()}>
            Try again
          </Button>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event: DragStartEvent) =>
            setActiveTask(
              board.stages
                .flatMap((stage) => stage.tasks)
                .find((task) => task.uuid === event.active.id),
            )
          }
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(undefined)}
        >
          <div className={kanbanGridStyles}>
            {board.stages.map((stage) => (
              <KanbanColumn
                key={stage.uuid}
                stage={stage}
                archived={archived}
                draft={taskDraft?.stage === stage.key ? taskDraft : undefined}
                isCreating={createTask.isPending}
                onAdd={() => {
                  setTaskDraft({ stage: stage.key, title: "" });
                }}
                onDraftChange={(title) =>
                  setTaskDraft((draft) =>
                    draft && draft.stage === stage.key
                      ? { ...draft, title }
                      : draft,
                  )
                }
                onDraftCancel={() => setTaskDraft(undefined)}
                onDraftSubmit={() => {
                  const title = taskDraft?.title.trim();
                  if (!title) return;
                  createTask.mutate({
                    title,
                    description: null,
                    priority: "medium",
                    stage: stage.key,
                    label_uuids: [],
                    resource_uuids: [],
                    note_uuids: [],
                  });
                }}
                onOpen={(task) => setSelectedTaskUuid(task.uuid)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskDetailsSheet
        key={`${selectedTask?.uuid ?? "closed"}:${selectedTask?.updated_at ?? ""}`}
        task={selectedTask}
        stages={board?.stages ?? []}
        labels={board?.labels ?? []}
        archived={archived}
        isSaving={taskMutation.isPending}
        isDeleting={deleteTask.isPending}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskUuid(undefined);
        }}
        onSave={(input) => {
          if (!selectedTask) return Promise.resolve();
          return taskMutation
            .mutateAsync({ taskUuid: selectedTask.uuid, input })
            .then(() => undefined);
        }}
        onDelete={() => {
          if (selectedTask && window.confirm(`Delete “${selectedTask.title}”?`))
            deleteTask.mutate(selectedTask.uuid);
        }}
      />
      {board && (
        <ProjectLabelDialog
          open={labelsOpen}
          onOpenChange={setLabelsOpen}
          labels={board.labels}
          isPending={saveLabel.isPending || deleteLabel.isPending}
          onSave={(input, label) =>
            saveLabel.mutateAsync({ input, label }).then(() => undefined)
          }
          onDelete={(label) =>
            deleteLabel.mutateAsync(label.uuid).then(() => undefined)
          }
        />
      )}
      <Dialog
        open={Boolean(boardDialog)}
        onOpenChange={(open) => {
          if (!open) setBoardDialog(undefined);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {boardDialog?.mode === "create" ? "New board" : "Rename board"}
            </DialogTitle>
            <DialogDescription>
              Use a focused board name that describes this stream of work.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={boardDialog?.name ?? ""}
            onChange={(event) =>
              setBoardDialog((value) =>
                value ? { ...value, name: event.target.value } : value,
              )
            }
            placeholder={
              boardDialog?.mode === "create"
                ? "Board name (optional)"
                : "Board name"
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoardDialog(undefined)}>
              Cancel
            </Button>
            <Button
              disabled={
                saveBoard.isPending ||
                (boardDialog?.mode === "rename" && !boardDialog.name.trim())
              }
              onClick={() =>
                boardDialog &&
                saveBoard.mutate({
                  ...boardDialog,
                  name: boardDialog.name.trim(),
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KanbanColumn({
  stage,
  archived,
  draft,
  isCreating,
  onAdd,
  onDraftChange,
  onDraftCancel,
  onDraftSubmit,
  onOpen,
}: {
  stage: BoardStage;
  archived: boolean;
  draft?: { stage: BoardStageKey; title: string };
  isCreating: boolean;
  onAdd: () => void;
  onDraftChange: (title: string) => void;
  onDraftCancel: () => void;
  onDraftSubmit: () => void;
  onOpen: (task: BoardTask) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${stage.key}`,
    disabled: archived,
  });
  return (
    <section
      ref={setNodeRef}
      className={`flex h-[34rem] min-w-0 flex-col rounded-xl border bg-muted/25 transition-colors ${isOver ? "border-primary/60 bg-primary/5" : ""}`}
    >
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="flex items-center gap-1.5 font-semibold">
          <span>{stage.name}</span>
          <Badge
            variant="secondary"
            className={`h-5 min-w-5 justify-center rounded-full px-1.5 text-xs tabular-nums font-bold ${stageCountStyles[stage.key]}`}
            aria-label={`${stage.tasks.length} ${stage.tasks.length === 1 ? "task" : "tasks"}`}
          >
            {stage.tasks.length}
          </Badge>
        </h3>
        {!archived && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Add task to ${stage.name}`}
            onClick={onAdd}
          >
            <Plus />
          </Button>
        )}
      </div>
      <SortableContext
        items={stage.tasks.map((task) => task.uuid)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3">
          {stage.tasks.map((task) => (
            <SortableTask
              key={task.uuid}
              task={task}
              disabled={archived}
              onOpen={() => onOpen(task)}
            />
          ))}
          {draft && (
            <TaskDraft
              title={draft.title}
              isPending={isCreating}
              onChange={onDraftChange}
              onCancel={onDraftCancel}
              onSubmit={onDraftSubmit}
            />
          )}
          {stage.tasks.length === 0 && !draft && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {archived ? "No tasks" : "Drop a task here"}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function TaskDraft({
  title,
  isPending,
  onChange,
  onCancel,
  onSubmit,
}: {
  title: string;
  isPending: boolean;
  onChange: (title: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <Card size="sm" className="border-primary/40 shadow-sm">
      <form
        className="p-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        onBlur={(event) => {
          if (
            isPending ||
            event.currentTarget.contains(event.relatedTarget as Node | null)
          )
            return;

          if (title.trim()) onSubmit();
          else onCancel();
        }}
      >
        <Input
          autoFocus
          value={title}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          placeholder="Task title"
          aria-label="Task title"
          maxLength={120}
          disabled={isPending}
        />
      </form>
    </Card>
  );
}

function SortableTask({
  task,
  disabled,
  onOpen,
}: {
  task: BoardTask;
  disabled: boolean;
  onOpen: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.uuid, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-30" : ""}
    >
      <TaskCard
        task={task}
        disabled={disabled}
        dragProps={{ ...attributes, ...listeners }}
        onOpen={onOpen}
      />
    </div>
  );
}

function TaskCard({
  task,
  disabled,
  overlay,
  dragProps,
  onOpen,
}: {
  task: BoardTask;
  disabled?: boolean;
  overlay?: boolean;
  dragProps?: React.HTMLAttributes<HTMLButtonElement>;
  onOpen?: () => void;
}) {
  return (
    <Card
      size="sm"
      className={
        overlay
          ? "w-[19rem] rotate-2 shadow-xl"
          : "gap-3 cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      }
      role={overlay ? undefined : "button"}
      tabIndex={overlay ? undefined : 0}
      onClick={overlay ? undefined : onOpen}
      onKeyDown={
        overlay
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen?.();
              }
            }
      }
    >
      <CardHeader className="gap-2">
        <div className="flex items-start gap-2">
          {!disabled && (
            <button
              type="button"
              className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
              aria-label={`Move ${task.title}`}
              {...dragProps}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <GripVertical className="size-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm leading-snug">{task.title}</CardTitle>
            {task.description && (
              <CardDescription className="mt-1 line-clamp-2 text-xs">
                {task.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex flex-wrap gap-1">
          {" "}
          <Badge className={priorityStyles[task.priority]}>
            {task.priority}
          </Badge>
          {task.labels.slice(0, 1).map((label) => (
            <LabelBadge key={label.uuid} label={label} />
          ))}
        </div>
        {(task.resources.length > 0 || task.notes.length > 0) && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {task.resources.length > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="size-3" />
                {task.resources.length}
              </span>
            )}
            {task.notes.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="size-3" />
                {task.notes.length}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskDetailsSheet({
  task,
  stages,
  labels,
  archived,
  isSaving,
  isDeleting,
  onOpenChange,
  onSave,
  onDelete,
}: {
  task?: BoardTask;
  stages: BoardStage[];
  labels: BoardLabel[];
  archived: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: BoardTaskInput) => Promise<void>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<BoardTask["priority"]>(
    task?.priority ?? "medium",
  );
  const [stage, setStage] = useState<BoardStageKey>(task?.stage ?? "backlog");
  const [labelUuids, setLabelUuids] = useState<string[]>(
    task?.labels.slice(0, 1).map((label) => label.uuid) ?? [],
  );
  const [resourceUuids, setResourceUuids] = useState<string[]>(
    task?.resources.map((resource) => resource.uuid) ?? [],
  );
  const [noteUuids, setNoteUuids] = useState<string[]>(
    task?.notes.map((note) => note.uuid) ?? [],
  );
  const [linkPicker, setLinkPicker] = useState<"resources" | "notes">();
  const areasQuery = useQuery({
    queryKey: areaKeys.list("active"),
    queryFn: () => areaService.list("active"),
    enabled: Boolean(task) && !archived,
  });
  const resourcesQuery = useQuery({
    queryKey: ["resources", "all"],
    queryFn: () => areaService.allResources(),
    enabled: Boolean(task) && !archived,
  });
  const notesQuery = useQuery({
    queryKey: [
      "areas",
      "all-notes",
      ...(areasQuery.data?.data.map((area) => area.uuid) ?? []),
    ],
    queryFn: async () =>
      Promise.all(
        (areasQuery.data?.data ?? []).map(async (area) => ({
          area,
          notes: flattenNotes((await areaService.noteTree(area.uuid)).data),
        })),
      ),
    enabled: Boolean(task) && !archived && Boolean(areasQuery.data),
  });

  const save = async (
    values: Partial<{
      title: string;
      description: string;
      priority: BoardTask["priority"];
      stage: BoardStageKey;
      labelUuids: string[];
      resourceUuids: string[];
      noteUuids: string[];
    }>,
  ) => {
    if (!task) return;
    await onSave({
      title: values.title ?? title,
      description: (values.description ?? description).trim() || null,
      priority: values.priority ?? priority,
      stage: values.stage ?? stage,
      label_uuids: values.labelUuids ?? labelUuids,
      resource_uuids: values.resourceUuids ?? resourceUuids,
      note_uuids: values.noteUuids ?? noteUuids,
    });
  };

  const saveTitle = async () => {
    const nextTitle = title.trim();
    if (!task || nextTitle === task.title) {
      if (task) setTitle(task.title);
      return;
    }
    if (!nextTitle) {
      setTitle(task.title);
      return;
    }
    setTitle(nextTitle);
    try {
      await save({ title: nextTitle });
    } catch {
      setTitle(task.title);
    }
  };

  const saveDescription = async () => {
    if (!task || description.trim() === (task.description ?? "")) return;
    try {
      await save({ description });
    } catch {
      setDescription(task.description ?? "");
    }
  };

  const updateLabel = (labelUuid?: string) => {
    const next = labelUuid ? [labelUuid] : [];
    setLabelUuids(next);
    void save({ labelUuids: next }).catch(() =>
      setLabelUuids(task?.labels.slice(0, 1).map((label) => label.uuid) ?? []),
    );
  };

  const selectedLabel = labelUuids[0]
    ? (labels.find((label) => label.uuid === labelUuids[0]) ??
      task?.labels.find((label) => label.uuid === labelUuids[0]))
    : undefined;

  return (
    <Sheet open={Boolean(task)} onOpenChange={onOpenChange}>
      <SheetContent className="top-0 right-0 bottom-0 m-0 h-dvh w-full max-w-none gap-0 overflow-hidden rounded-none border-l sm:h-auto sm:max-w-[60rem] sm:border">
        {task && (
          <>
            <SheetHeader className="shrink-0 border-b pr-14">
              <SheetTitle>
                {archived ? (
                  <span className="text-lg leading-snug">{task.title}</span>
                ) : (
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onBlur={() => void saveTitle()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    disabled={isSaving}
                    maxLength={120}
                    aria-label="Task title"
                    className="h-auto border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                  />
                )}
              </SheetTitle>
              <SheetDescription>
                <div className="w-full grid grid-cols-2 gap-4">
                  {archived ? (
                    <Badge
                      variant="secondary"
                      className="w-fit gap-1.5 capitalize"
                    >
                      <StatusDot color={stageDotColors[task.stage]} />
                      {stages.find((item) => item.key === task.stage)?.name ??
                        task.stage.replace("_", " ")}
                    </Badge>
                  ) : (
                    <Select
                      value={stage}
                      disabled={isSaving}
                      onValueChange={(value) => {
                        const nextStage = value as BoardStageKey;
                        setStage(nextStage);
                        void save({ stage: nextStage }).catch(() =>
                          setStage(task.stage),
                        );
                      }}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <StatusValue
                          color={stageDotColors[stage]}
                          label={
                            stages.find((item) => item.key === stage)?.name ??
                            stage.replace("_", " ")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((item) => (
                          <SelectItem key={item.key} value={item.key}>
                            <StatusValue
                              color={stageDotColors[item.key]}
                              label={item.name}
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {archived ? (
                    <Badge
                      className={`w-fit gap-1.5 capitalize ${priorityStyles[task.priority]}`}
                    >
                      <StatusDot color={priorityDotColors[task.priority]} />
                      {task.priority}
                    </Badge>
                  ) : (
                    <Select
                      value={priority}
                      disabled={isSaving}
                      onValueChange={(value) => {
                        const nextPriority = value as BoardTask["priority"];
                        setPriority(nextPriority);
                        void save({ priority: nextPriority }).catch(() =>
                          setPriority(task.priority),
                        );
                      }}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <StatusValue
                          color={priorityDotColors[priority]}
                          label={
                            priority.charAt(0).toUpperCase() + priority.slice(1)
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <StatusValue
                            color={priorityDotColors.low}
                            label="Low"
                          />
                        </SelectItem>
                        <SelectItem value="medium">
                          <StatusValue
                            color={priorityDotColors.medium}
                            label="Medium"
                          />
                        </SelectItem>
                        <SelectItem value="high">
                          <StatusValue
                            color={priorityDotColors.high}
                            label="High"
                          />
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="grid min-h-0 flex-1 content-start gap-6 overflow-y-auto p-4">
              <TaskDetailSection title="Description">
                {archived ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {task.description || "No description provided."}
                  </p>
                ) : (
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    onBlur={() => void saveDescription()}
                    disabled={isSaving}
                    placeholder="Add a description…"
                    className="min-h-28"
                  />
                )}
              </TaskDetailSection>

              <TaskDetailSection title="Labels">
                {archived ? (
                  task.labels[0] ? (
                    <LabelBadge label={task.labels[0]} />
                  ) : (
                    <EmptyTaskDetail>No labels assigned.</EmptyTaskDetail>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    {selectedLabel ? (
                      <LabelBadge label={selectedLabel} />
                    ) : (
                      <EmptyTaskDetail>No label assigned.</EmptyTaskDetail>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            disabled={isSaving || labels.length === 0}
                            aria-label={
                              selectedLabel ? "Update label" : "Add label"
                            }
                          />
                        }
                      >
                        <Plus />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="bottom" align="start">
                        {labels.map((label) => (
                          <DropdownMenuItem
                            key={label.uuid}
                            onClick={() => updateLabel(label.uuid)}
                          >
                            <span className="flex-1">
                              <LabelBadge label={label} />
                            </span>
                            {label.uuid === labelUuids[0] && <Check />}
                          </DropdownMenuItem>
                        ))}
                        {selectedLabel && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              destructive
                              onClick={() => updateLabel()}
                            >
                              <Trash2 />
                              Remove label
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </TaskDetailSection>

              <TaskDetailSection
                title="Resources"
                icon={<Link2 />}
                action={
                  !archived ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      aria-label="Link resources"
                      onClick={() => setLinkPicker("resources")}
                    >
                      <Plus />
                    </Button>
                  ) : undefined
                }
              >
                {task.resources.length > 0 ? (
                  <TaskResourceList items={task.resources} />
                ) : (
                  <EmptyTaskDetail>No resources linked.</EmptyTaskDetail>
                )}
              </TaskDetailSection>

              <TaskDetailSection
                title="Notes"
                icon={<FileText />}
                action={
                  !archived ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      aria-label="Link notes"
                      onClick={() => setLinkPicker("notes")}
                    >
                      <Plus />
                    </Button>
                  ) : undefined
                }
              >
                {task.notes.length > 0 ? (
                  <TaskNoteList items={task.notes} />
                ) : (
                  <EmptyTaskDetail>No notes linked.</EmptyTaskDetail>
                )}
              </TaskDetailSection>

              {(task.created_at || task.updated_at) && (
                <TaskDetailSection title="Activity" icon={<Clock3 />}>
                  <div className="grid gap-1 text-sm text-muted-foreground">
                    {task.created_at && (
                      <p>Created {formatTaskTimestamp(task.created_at)}</p>
                    )}
                    {task.updated_at && (
                      <p>Updated {formatTaskTimestamp(task.updated_at)}</p>
                    )}
                  </div>
                </TaskDetailSection>
              )}
            </div>

            {!archived && (
              <SheetFooter className="shrink-0 border-t sm:flex-row sm:justify-end">
                {isSaving && (
                  <span className="mr-auto self-center text-sm text-muted-foreground">
                    Saving…
                  </span>
                )}
                <Button
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={onDelete}
                >
                  <Trash2 />
                  {isDeleting ? "Deleting…" : "Delete"}
                </Button>
              </SheetFooter>
            )}

            {!archived && (
              <Dialog
                open={Boolean(linkPicker)}
                onOpenChange={(open) => {
                  if (!open) setLinkPicker(undefined);
                }}
              >
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      Link {linkPicker === "notes" ? "notes" : "resources"}
                    </DialogTitle>
                    <DialogDescription>
                      Select one or more items to link to this task.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1">
                    {linkPicker === "resources" ? (
                      resourcesQuery.isLoading ? (
                        <EmptyTaskDetail>Loading resources…</EmptyTaskDetail>
                      ) : resourcesQuery.data?.data.length ? (
                        resourcesQuery.data.data.map((resource) => {
                          const selected = resourceUuids.includes(resource.uuid);
                          return (
                            <LinkPickerItem
                              key={resource.uuid}
                              title={resource.title}
                              icon={<Link2 />}
                              selected={selected}
                              disabled={isSaving}
                              onClick={() => {
                                const next = toggleSelection(
                                  resourceUuids,
                                  resource.uuid,
                                );
                                setResourceUuids(next);
                                void save({ resourceUuids: next }).catch(() =>
                                  setResourceUuids(
                                    task.resources.map((item) => item.uuid),
                                  ),
                                );
                              }}
                            />
                          );
                        })
                      ) : (
                        <EmptyTaskDetail>No resources available.</EmptyTaskDetail>
                      )
                    ) : notesQuery.isLoading ? (
                      <EmptyTaskDetail>Loading notes…</EmptyTaskDetail>
                    ) : notesQuery.data?.length ? (
                      notesQuery.data.map(
                        ({ area, notes }) =>
                          notes.length > 0 && (
                            <div key={area.uuid} className="grid gap-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                {area.name}
                              </p>
                              {notes.map((note) => {
                                const selected = noteUuids.includes(note.uuid);
                                return (
                                  <LinkPickerItem
                                    key={note.uuid}
                                    title={note.title}
                                    icon={<FileText />}
                                    selected={selected}
                                    disabled={isSaving}
                                    onClick={() => {
                                      const next = toggleSelection(
                                        noteUuids,
                                        note.uuid,
                                      );
                                      setNoteUuids(next);
                                      void save({ noteUuids: next }).catch(() =>
                                        setNoteUuids(
                                          task.notes.map((item) => item.uuid),
                                        ),
                                      );
                                    }}
                                  />
                                );
                              })}
                            </div>
                          ),
                      )
                    ) : (
                      <EmptyTaskDetail>No notes available.</EmptyTaskDetail>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLinkPicker(undefined)}
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskDetailSection({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon && <span className="[&_svg]:size-4">{icon}</span>}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyTaskDetail({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function TaskResourceList({ items }: { items: BoardTaskResourceLink[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <LinkedItemCard
          key={item.uuid}
          icon={<Link2 />}
          title={item.title}
          areas={item.areas.map((area) => area.name)}
          date={item.updated_at ?? item.created_at}
        />
      ))}
    </div>
  );
}

function TaskNoteList({ items }: { items: BoardTaskNoteLink[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <LinkedItemCard
          key={item.uuid}
          href={`/areas/${item.area.uuid}?tab=notes&note=${item.uuid}`}
          icon={<FileText />}
          title={item.title}
          areas={[item.area.name]}
          date={item.updated_at ?? item.created_at}
        />
      ))}
    </div>
  );
}

function LinkedItemCard({
  href,
  icon,
  title,
  areas,
  date,
}: {
  href?: string;
  icon: React.ReactNode;
  title: string;
  areas: string[];
  date: string | null;
}) {
  const content = (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted/40">
      <span className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{areas.length > 0 ? areas.join(", ") : "No Area"}</span>
          {date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {formatTaskDate(date)}
            </span>
          )}
        </span>
      </span>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function LinkPickerItem({
  icon,
  title,
  selected,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto min-h-10 justify-start py-2 text-left"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <Check className={selected ? "opacity-100" : "opacity-0"} />
    </Button>
  );
}

function flattenNotes(nodes: NoteTreeNode[]): NoteTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenNotes(node.children)]);
}

function toggleSelection(items: string[], uuid: string) {
  return items.includes(uuid)
    ? items.filter((item) => item !== uuid)
    : [...items, uuid];
}

function getLabelTextColor(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character.repeat(2))
          .join("")
      : normalized;
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#ffffff";

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160
    ? "#111827"
    : "#ffffff";
}

function formatTaskTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatTaskDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

function moveLocally(
  board: Board,
  taskUuid: string,
  targetKey: BoardStageKey,
  targetPosition: number,
): Board {
  const task = board.stages
    .flatMap((stage) => stage.tasks)
    .find((item) => item.uuid === taskUuid);
  if (!task) return board;
  const stages = board.stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.filter((item) => item.uuid !== taskUuid),
  }));
  const target = stages.find((stage) => stage.key === targetKey);
  if (!target) return board;
  const tasks = [...target.tasks];
  tasks.splice(Math.min(targetPosition, tasks.length), 0, {
    ...task,
    stage: targetKey,
  });
  target.tasks = tasks.map((item, position) => ({ ...item, position }));
  return {
    ...board,
    stages: stages.map((stage) => ({
      ...stage,
      task_count: stage.tasks.length,
    })),
  };
}
