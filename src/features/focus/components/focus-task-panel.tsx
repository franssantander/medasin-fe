"use client";

import {
  Check,
  KanbanSquare,
  Link2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useCreateFocusTaskMutation,
  useDeleteFocusTaskMutation,
  useLinkableFocusTasksQuery,
  useUpdateFocusTaskMutation,
} from "../queries/focus-query";
import { focusTaskSchema } from "../schemas/focus-schema";
import type { FocusTask } from "../type";

type Props = {
  tasks: FocusTask[];
  completedTasks: FocusTask[];
  completedLoading: boolean;
  selectedUuid?: string;
  onSelect: (task: FocusTask) => void;
};

export function FocusTaskPanel({
  tasks,
  completedTasks,
  completedLoading,
  selectedUuid,
  onSelect,
}: Props) {
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const [addOpen, setAddOpen] = useState(false);
  const updateTask = useUpdateFocusTaskMutation();
  const deleteTask = useDeleteFocusTaskMutation();
  const shown = filter === "active" ? tasks : completedTasks;

  return (
    <Card className="order-2 min-h-[34rem] gap-0 py-0 lg:order-1">
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div>
          <h2 className="font-semibold">Focus tasks</h2>
          <p className="text-xs text-muted-foreground">
            {tasks.length} active {tasks.length === 1 ? "task" : "tasks"}
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          Add task
        </Button>
      </div>
      <div className="border-b p-3">
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as "active" | "completed")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {completedLoading && filter === "completed" && (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        )}
        {!completedLoading && shown.length === 0 && (
          <div className="grid flex-1 place-items-center px-6 text-center text-sm text-muted-foreground">
            {filter === "active"
              ? "Add a task to begin a focused session."
              : "Completed tasks will stay here with their session history."}
          </div>
        )}
        {shown.map((task) => {
          const selected = task.uuid === selectedUuid;
          return (
            <article
              key={task.uuid}
              role="button"
              tabIndex={0}
              onClick={() => filter === "active" && onSelect(task)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (filter === "active") onSelect(task);
                }
              }}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected && "border-foreground/35 bg-muted/50",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={
                    task.completed_at
                      ? `Reopen ${task.title}`
                      : `Complete ${task.title}`
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    updateTask.mutate({
                      uuid: task.uuid,
                      input: { completed: !task.completed_at },
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.click();
                  }}
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                    task.completed_at && "bg-primary text-primary-foreground",
                  )}
                >
                  {task.completed_at && <Check className="size-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate font-medium",
                          task.completed_at &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </p>
                      {task.source && (
                        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <KanbanSquare className="size-3" />
                          {task.source.project} / {task.source.board}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(event) => event.stopPropagation()}
                        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                        aria-label={`Actions for ${task.title}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() =>
                            updateTask.mutate({
                              uuid: task.uuid,
                              input: { completed: !task.completed_at },
                            })
                          }
                        >
                          {task.completed_at ? <RotateCcw /> : <Check />}
                          {task.completed_at ? "Reopen" : "Complete"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onClick={() => deleteTask.mutate(task.uuid)}
                        >
                          <Trash2 />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[11px] text-muted-foreground",
                        !selected && "invisible",
                      )}
                    >
                      Selected
                    </span>
                    <SessionDots count={task.session_count} />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <AddFocusTaskDialog open={addOpen} onOpenChange={setAddOpen} />
    </Card>
  );
}

function SessionDots({ count }: { count: number }) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${count} completed focus sessions`}
    >
      {Array.from({ length: Math.min(count, 5) }).map((_, index) => (
        <span key={index} className="size-2 rounded-full bg-foreground/75" />
      ))}
      <span className="ml-1 text-[11px] tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function AddFocusTaskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<"standalone" | "linked">("standalone");
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLink, setSelectedLink] = useState<string>();
  const createTask = useCreateFocusTaskMutation();
  const linkable = useLinkableFocusTasksQuery(
    search,
    open && mode === "linked",
  );
  const close = () => {
    setTitle("");
    setSearch("");
    setSelectedLink(undefined);
    onOpenChange(false);
  };
  const submit = () => {
    if (mode === "standalone") {
      const parsed = focusTaskSchema.safeParse({ title });
      if (!parsed.success) return;
      createTask.mutate({ title: parsed.data.title }, { onSuccess: close });
    } else if (selectedLink)
      createTask.mutate(
        { board_task_uuid: selectedLink },
        { onSuccess: close },
      );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add focus task</DialogTitle>
          <DialogDescription>
            Create a lightweight task or bring in work from a Project Board.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as "standalone" | "linked")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standalone">
              <Plus />
              New task
            </TabsTrigger>
            <TabsTrigger value="linked">
              <Link2 />
              Project task
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "standalone" ? (
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What do you want to focus on?"
            maxLength={120}
            autoFocus
          />
        ) : (
          <div className="grid gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Project Board tasks…"
            />
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-1">
              {linkable.isLoading && <Skeleton className="h-16" />}
              {linkable.data?.data.map((task) => (
                <button
                  key={task.uuid}
                  type="button"
                  onClick={() => setSelectedLink(task.uuid)}
                  className={cn(
                    "w-full rounded-md p-2 text-left hover:bg-muted",
                    selectedLink === task.uuid && "bg-muted ring-1 ring-ring",
                  )}
                >
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.project} / {task.board} · {task.stage}
                  </p>
                </button>
              ))}
              {linkable.data?.data.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No available Project Board tasks.
                </p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={
              createTask.isPending ||
              (mode === "standalone" ? !title.trim() : !selectedLink)
            }
            onClick={submit}
          >
            {createTask.isPending ? "Adding…" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
