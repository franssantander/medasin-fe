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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
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
  ProjectApiResponse,
} from "../type";
import { ProjectLabelDialog } from "./project-label-dialog";
import { ProjectTaskDialog } from "./project-task-dialog";

const priorityStyles = {
  low: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "bg-red-500/10 text-red-700 dark:text-red-300",
};

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
  const [taskForm, setTaskForm] = useState<{
    task?: BoardTask;
    stage: BoardStageKey;
  }>();
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [boardDialog, setBoardDialog] = useState<{
    mode: "create" | "rename";
    name: string;
  }>();
  const [activeTask, setActiveTask] = useState<BoardTask>();
  const boardQuery = useProjectBoardQuery(projectUuid, selectedBoardUuid);
  const board = boardQuery.data?.data;
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
    mutationFn: (input: BoardTaskInput) =>
      taskForm?.task
        ? projectService.updateTask(
            projectUuid,
            selectedBoardUuid!,
            taskForm.task.uuid,
            input,
          )
        : projectService.createTask(projectUuid, selectedBoardUuid!, input),
    onSuccess: (response) => refresh(response.message),
    onError: mutationError,
  });
  const deleteTask = useMutation({
    mutationFn: (taskUuid: string) =>
      projectService.removeTask(projectUuid, selectedBoardUuid!, taskUuid),
    onSuccess: (response) => refresh(response.message),
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
    <div className="grid gap-4">
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
                onClick={() => setSelectedBoardUuid(item.uuid)}
                aria-current={item.uuid === selectedBoardUuid ? "true" : undefined}
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
              <DropdownMenuContent align="end">
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
        <div className="grid grid-cols-4 gap-4">
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
          <div className="grid w-full min-w-0 grid-flow-col auto-cols-[minmax(20rem,1fr)] gap-4 overflow-x-auto pb-4">
            {board.stages.map((stage) => (
              <KanbanColumn
                key={stage.uuid}
                stage={stage}
                archived={archived}
                onAdd={() => setTaskForm({ stage: stage.key })}
                onEdit={(task) => setTaskForm({ task, stage: task.stage })}
                onDelete={(task) => {
                  if (window.confirm(`Delete “${task.title}”?`))
                    deleteTask.mutate(task.uuid);
                }}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {taskForm && board && (
        <ProjectTaskDialog
          open
          initialStage={taskForm.stage}
          task={taskForm.task}
          labels={board.labels}
          isPending={taskMutation.isPending}
          onOpenChange={(open) => {
            if (!open) setTaskForm(undefined);
          }}
          onSubmit={(input) =>
            taskMutation.mutateAsync(input).then(() => undefined)
          }
        />
      )}
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
  onAdd,
  onEdit,
  onDelete,
}: {
  stage: BoardStage;
  archived: boolean;
  onAdd: () => void;
  onEdit: (task: BoardTask) => void;
  onDelete: (task: BoardTask) => void;
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
        <div>
          <h3 className="font-semibold">{stage.name}</h3>
          <p className="text-xs text-muted-foreground">
            {stage.tasks.length} {stage.tasks.length === 1 ? "task" : "tasks"}
          </p>
        </div>
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
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
            />
          ))}
          {stage.tasks.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {archived ? "No tasks" : "Drop a task here"}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableTask({
  task,
  disabled,
  onEdit,
  onDelete,
}: {
  task: BoardTask;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
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
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

function TaskCard({
  task,
  disabled,
  overlay,
  dragProps,
  onEdit,
  onDelete,
}: {
  task: BoardTask;
  disabled?: boolean;
  overlay?: boolean;
  dragProps?: React.HTMLAttributes<HTMLButtonElement>;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card
      size="sm"
      className={overlay ? "w-[19rem] rotate-2 shadow-xl" : "gap-3"}
    >
      <CardHeader className="gap-2">
        <div className="flex items-start gap-2">
          {!disabled && (
            <button
              type="button"
              className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
              aria-label={`Move ${task.title}`}
              {...dragProps}
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
          {!disabled && !overlay && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${task.title}`}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem destructive onClick={onDelete}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex flex-wrap gap-1">
          {" "}
          <Badge className={priorityStyles[task.priority]}>
            {task.priority}
          </Badge>
          {task.labels.map((label) => (
            <Badge key={label.uuid} variant="outline">
              <span
                className="mr-1 size-1.5 rounded-full"
                style={{ backgroundColor: label.hex }}
              />
              {label.name}
            </Badge>
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
