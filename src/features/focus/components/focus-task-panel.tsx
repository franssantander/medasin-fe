"use client";

import { Check, Circle, CircleCheck, KanbanSquare, MoreHorizontal, Plus, RotateCcw, Timer, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { phaseMeta } from "../lib/focus-utils";
import { useDeleteFocusTaskMutation, useFocusTasksQuery, useUpdateFocusTaskMutation } from "../queries/focus-query";
import type { FocusTask } from "../type";

export function FocusTaskPanel({ tasks, selectedUuid, activeTaskUuid, sessionActive, onSelect, onAdd }: {
  tasks: FocusTask[];
  selectedUuid?: string;
  activeTaskUuid?: string;
  sessionActive: boolean;
  onSelect: (task: FocusTask) => void;
  onAdd: () => void;
}) {
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const completed = useFocusTasksQuery("completed", filter === "completed");
  const updateTask = useUpdateFocusTaskMutation();
  const deleteTask = useDeleteFocusTaskMutation();
  const pending = updateTask.isPending || deleteTask.isPending;
  const error = updateTask.error ?? deleteTask.error;
  const shown = filter === "active" ? tasks : completed.data?.data ?? [];

  return (
    <Card className="min-w-0 gap-4 [--card-spacing:--spacing(5)] lg:sticky lg:top-4 lg:max-h-[42rem]" aria-label="Focus tasks">
      <CardHeader>
        <CardTitle><h2>Focus tasks</h2></CardTitle>
        <CardDescription>{tasks.length} active {tasks.length === 1 ? "task" : "tasks"}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onAdd}><Plus data-icon="inline-start" />Add task</Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as "active" | "completed")} className="min-h-0 gap-3">
          <TabsList className="w-full">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}
          {(["active", "completed"] as const).map((status) => (
            <TabsContent key={status} value={status} className="workspace-list-scrollbar flex min-h-0 flex-col gap-2 overflow-y-auto px-1 pb-1 lg:max-h-[30rem]">
              {status === "completed" && completed.isLoading ? (
                <><Skeleton className="h-24" /><Skeleton className="h-24" /></>
              ) : (
                <>
                  {status === "completed" && completed.isError && (
                    <Alert variant="destructive">
                      <AlertDescription className="flex flex-col items-start gap-2">
                        Completed tasks could not be loaded.
                        <Button variant="outline" size="sm" onClick={() => completed.refetch()}>Try again</Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  {shown.length === 0 && !(status === "completed" && completed.isError) && (
                    <Empty className="rounded-lg border border-dashed px-4 py-8">
                      <EmptyHeader>
                        <EmptyTitle>{status === "active" ? "A clear starting point" : "No completed tasks yet"}</EmptyTitle>
                        <EmptyDescription>{status === "active" ? "Add a task, then give it your attention." : "Finished tasks and their session counts will appear here."}</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                  {shown.map((task) => {
                    const selected = task.uuid === selectedUuid && status === "active";
                    const current = task.uuid === activeTaskUuid;
                    const source = task.source && [task.source.project, task.source.board].filter(Boolean).join(" / ");
                    return (
                      <article
                        key={task.uuid}
                        className={cn(
                          "group/task relative flex min-w-0 items-start gap-1 rounded-lg border bg-card p-1.5 transition-colors hover:bg-muted/40 motion-reduce:transition-none",
                          selected && cn("border-transparent bg-muted/50 ring-1 ring-border before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full", phaseMeta.focus.accent),
                        )}
                      >
                        <Button
                          variant="ghost" size="icon-sm"
                          className={cn("mt-0.5 text-muted-foreground hover:text-foreground", task.completed_at && "text-foreground")}
                          aria-label={(task.completed_at ? "Reopen " : "Complete ") + task.title}
                          disabled={pending}
                          onClick={() => updateTask.mutate({ uuid: task.uuid, input: { completed: !task.completed_at } })}
                        >
                          {task.completed_at ? <CircleCheck /> : <Circle />}
                        </Button>
                        <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
                          {status === "active" ? (
                            <Button
                              variant="ghost"
                              className="h-auto w-full flex-col items-start gap-1 px-1.5 py-1.5 text-left whitespace-normal hover:bg-transparent"
                              aria-label={"Focus on " + task.title}
                              aria-pressed={selected}
                              disabled={sessionActive && !current}
                              onClick={() => onSelect(task)}
                            >
                              <span className="line-clamp-2 max-w-full leading-snug break-words" title={task.title}>{task.title}</span>
                              {source && <span className="flex max-w-full min-w-0 items-center gap-1 text-xs font-normal text-muted-foreground"><KanbanSquare aria-hidden="true" className="size-3.5" /><span className="truncate" title={source}>{source}</span></span>}
                            </Button>
                          ) : (
                            <p className="line-clamp-2 px-1.5 py-1.5 leading-snug text-muted-foreground line-through" title={task.title}>{task.title}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1.5 pb-1">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                              <Timer aria-hidden="true" className="size-3.5" />
                              {task.session_count} {task.session_count === 1 ? "session" : "sessions"}
                            </span>
                            {selected && <Badge variant={current ? "default" : "secondary"}>{current ? "Current" : "Selected"}</Badge>}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="mt-0.5 text-muted-foreground" />} aria-label={"Actions for " + task.title} disabled={pending}>
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => updateTask.mutate({ uuid: task.uuid, input: { completed: !task.completed_at } })}>
                                {task.completed_at ? <RotateCcw /> : <Check />}{task.completed_at ? "Reopen" : "Complete"}
                              </DropdownMenuItem>
                              <DropdownMenuItem destructive disabled={current} onClick={() => deleteTask.mutate(task.uuid)}><Trash2 />Remove</DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </article>
                    );
                  })}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      {sessionActive && <CardFooter><p className="text-xs leading-relaxed text-muted-foreground">Finish or reset the current session before switching tasks. Other tasks stay in your queue.</p></CardFooter>}
    </Card>
  );
}
