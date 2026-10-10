import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CircleCheck, FileText, Flag, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getNoteDocumentPreview } from "@/components/ui/note-editor-document";
import { cn } from "@/lib/utils";
import type { BoardStage, BoardStageKey, BoardTask } from "../type";
import {
  priorityDotColors,
  priorityLabels,
  stageColumnStyles,
  stageCountStyles,
  stageDotColors,
} from "./project-kanban-utils";

export type TaskDraftValue = {
  stage: BoardStageKey;
  title: string;
};

export function KanbanColumn({
  stage,
  tasks = stage.tasks,
  archived,
  searching = false,
  draft,
  isCreating,
  onAdd,
  onDraftChange,
  onDraftCancel,
  onDraftSubmit,
  onOpen,
}: {
  stage: BoardStage;
  /** Tasks to display; differs from `stage.tasks` while a search is active. */
  tasks?: BoardTask[];
  archived: boolean;
  searching?: boolean;
  draft?: TaskDraftValue;
  isCreating: boolean;
  onAdd: () => void;
  onDraftChange: (title: string) => void;
  onDraftCancel: () => void;
  onDraftSubmit: () => void;
  onOpen: (task: BoardTask) => void;
}) {
  const stageDroppableId = `stage:${stage.key}`;
  const dragDisabled = archived || searching;
  const { active, over } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: stageDroppableId,
    disabled: dragDisabled,
  });
  const overId = over ? String(over.id) : undefined;
  const isDragOverStage = Boolean(
    active &&
    (isOver ||
      overId === stageDroppableId ||
      stage.tasks.some((task) => task.uuid === overId)),
  );
  const countLabel = searching
    ? `${tasks.length} of ${stage.tasks.length}`
    : String(stage.tasks.length);

  return (
    <section
      ref={setNodeRef}
      aria-label={stage.name}
      className={cn(
        "flex max-h-[40rem] min-h-64 min-w-0 flex-col overflow-hidden rounded-xl border transition-[background-color,box-shadow] motion-reduce:transition-none",
        stageColumnStyles[stage.key].column,
        isDragOverStage && "bg-primary/5 ring-2 ring-primary/30",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-t-2 px-3 py-2",
          stageColumnStyles[stage.key].header,
        )}
      >
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: stageDotColors[stage.key] }}
            aria-hidden="true"
          />
          <span className="truncate">{stage.name}</span>
          <span
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
              stageCountStyles[stage.key],
            )}
            aria-label={`${stage.tasks.length} ${stage.tasks.length === 1 ? "task" : "tasks"}`}
          >
            {countLabel}
          </span>
        </h3>
        {!archived && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Add task to ${stage.name}`}
            onClick={onAdd}
          >
            <Plus />
          </Button>
        )}
      </div>
      <SortableContext
        items={tasks.map((task) => task.uuid)}
        strategy={verticalListSortingStrategy}
      >
        <div className="workspace-list-scrollbar grid min-h-0 flex-1 content-start gap-2 overflow-y-auto p-2">
          {tasks.map((task) => (
            <SortableTask
              key={task.uuid}
              task={task}
              disabled={dragDisabled}
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
          {tasks.length === 0 && !draft && (
            <div
              className={cn(
                "flex min-h-20 items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/40 px-3 text-center text-xs text-muted-foreground transition-colors",
                isDragOverStage && "border-primary/50 bg-primary/5 text-primary",
              )}
            >
              {searching
                ? "No tasks match"
                : isDragOverStage
                  ? "Drop here"
                  : "No tasks"}
            </div>
          )}
        </div>
      </SortableContext>
      {!archived && !draft && (
        <div className={cn("shrink-0 border-t p-1.5", stageColumnStyles[stage.key].footer)}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={onAdd}
          >
            <Plus data-icon="inline-start" />
            Add task
          </Button>
        </div>
      )}
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
    <form
      className="grid gap-1.5 rounded-lg border border-primary/40 bg-card p-2 shadow-sm"
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
        placeholder="What needs to be done?"
        aria-label="Task title"
        maxLength={120}
        disabled={isPending}
        className="border-transparent px-1.5 shadow-none focus-visible:ring-0"
      />
      <p className="px-1.5 text-[11px] text-muted-foreground">
        {isPending ? "Adding…" : "Enter to add · Esc to cancel"}
      </p>
    </form>
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
  const done = task.stage === "done";
  const extraLabels = task.labels.length - 2;

  return (
    <div
      {...cardDragProps}
      data-slot="task-card"
      className={cn(
        "relative grid gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-xs outline-none",
        overlay
          ? "w-[18rem] rotate-2 shadow-xl"
          : "transition-[border-color,box-shadow] hover:border-foreground/15 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        !overlay && (disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"),
      )}
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
      <div className="grid min-w-0 gap-1">
        <p
          className={cn(
            "flex items-start gap-1.5 text-sm font-medium leading-snug [overflow-wrap:anywhere]",
            done && "text-muted-foreground",
          )}
        >
          {done && (
            <CircleCheck
              className="mt-0.5 size-3.5 shrink-0 text-emerald-500"
              aria-label="Done"
            />
          )}
          {task.title}
        </p>
        {task.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {getNoteDocumentPreview(task.description)}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span
          className="inline-flex items-center gap-1"
          aria-label={`${priorityLabels[task.priority]} priority`}
        >
          <Flag
            className="size-3"
            style={{ color: priorityDotColors[task.priority] }}
            fill="currentColor"
            fillOpacity={0.2}
            aria-hidden="true"
          />
          <span aria-hidden="true">{priorityLabels[task.priority]}</span>
        </span>
        {task.labels.slice(0, 2).map((label) => (
          <span
            key={label.uuid}
            className="inline-flex min-w-0 max-w-32 items-center gap-1"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: label.hex }}
              aria-hidden="true"
            />
            <span className="truncate">{label.name}</span>
          </span>
        ))}
        {extraLabels > 0 && <span>+{extraLabels}</span>}
        {(task.resources.length > 0 || task.notes.length > 0) && (
          <span className="ml-auto flex items-center gap-2.5">
            {task.resources.length > 0 && (
              <span
                className="flex items-center gap-1"
                aria-label={`${task.resources.length} linked resources`}
              >
                <Link2 className="size-3" aria-hidden="true" />
                {task.resources.length}
              </span>
            )}
            {task.notes.length > 0 && (
              <span
                className="flex items-center gap-1"
                aria-label={`${task.notes.length} linked notes`}
              >
                <FileText className="size-3" aria-hidden="true" />
                {task.notes.length}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
