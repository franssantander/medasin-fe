import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { FileText, Link2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getNoteDocumentPreview } from "@/components/ui/note-editor-document";
import type { BoardStage, BoardStageKey, BoardTask } from "../type";
import { LabelBadge } from "./project-kanban-shared";
import { priorityStyles, stageCountStyles } from "./project-kanban-utils";

export type TaskDraftValue = {
  stage: BoardStageKey;
  title: string;
};

export function KanbanColumn({
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
  draft?: TaskDraftValue;
  isCreating: boolean;
  onAdd: () => void;
  onDraftChange: (title: string) => void;
  onDraftCancel: () => void;
  onDraftSubmit: () => void;
  onOpen: (task: BoardTask) => void;
}) {
  const stageDroppableId = `stage:${stage.key}`;
  const { active, over } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: stageDroppableId,
    disabled: archived,
  });
  const overId = over ? String(over.id) : undefined;
  const isDragOverStage = Boolean(
    active &&
    (isOver ||
      overId === stageDroppableId ||
      stage.tasks.some((task) => task.uuid === overId)),
  );

  return (
    <section
      ref={setNodeRef}
      className={`flex h-[34rem] min-w-0 flex-col rounded-xl border bg-muted/25 transition-[border-color,background-color,box-shadow] ${isDragOverStage ? "border-primary/70 bg-primary/5 ring-2 ring-primary/15" : ""}`}
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
        isDragging={isDragging}
        dragProps={disabled ? undefined : { ...attributes, ...listeners }}
        onOpen={onOpen}
      />
    </div>
  );
}

export function TaskCard({
  task,
  disabled,
  overlay,
  isDragging,
  dragProps,
  onOpen,
}: {
  task: BoardTask;
  disabled?: boolean;
  overlay?: boolean;
  isDragging?: boolean;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  onOpen?: () => void;
}) {
  const { onKeyDown: onDragKeyDown, ...cardDragProps } = dragProps ?? {};

  return (
    <Card
      {...cardDragProps}
      size="sm"
      className={
        overlay
          ? "w-[19rem] rotate-2 shadow-xl"
          : `gap-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`
      }
      role={overlay ? undefined : "button"}
      tabIndex={overlay ? undefined : 0}
      onClick={overlay ? undefined : onOpen}
      onKeyDown={
        overlay
          ? undefined
          : (event) => {
              if (!disabled && event.key === " ") {
                onDragKeyDown?.(event);
                return;
              }

              if (!isDragging && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onOpen?.();
              }
            }
      }
    >
      <CardHeader className="gap-2">
        <div className="min-w-0">
          <CardTitle className="text-sm leading-snug">{task.title}</CardTitle>
          {task.description && (
            <CardDescription className="mt-1 line-clamp-2 text-xs">
              {getNoteDocumentPreview(task.description)}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex flex-wrap gap-1">
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
