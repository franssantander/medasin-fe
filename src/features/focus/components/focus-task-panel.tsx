"use client";

import { Check, Circle, CircleCheck, KanbanSquare, MoreHorizontal, Plus, RotateCcw, Trash2 } from "lucide-react";
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
    <Card className="min-w-0 gap-4 lg:max-h-[42rem]" aria-label="Focus tasks">
      <CardHeader>
        <CardTitle><h2>Focus tasks</h2></CardTitle>
        <CardDescription>{tasks.length} active {tasks.length === 1 ? "task" : "tasks"}</CardDescription>
        <CardAction>
          <Button variant="outline" className="min-h-11" onClick={onAdd}><Plus data-icon="inline-start" />Add task</Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as "active" | "completed")} className="min-h-0 gap-3">
          <TabsList className="min-h-12 w-full">
            <TabsTrigger value="active" className="min-h-11">Active</TabsTrigger>
            <TabsTrigger value="completed" className="min-h-11">Completed</TabsTrigger>
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
                        <Button variant="outline" className="min-h-11" onClick={() => completed.refetch()}>Try again</Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  {shown.length === 0 && !(status === "completed" && completed.isError) && (
                    <Empty className="px-2 py-8">
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
                      <article key={task.uuid} className={cn("flex min-w-0 gap-1 rounded-lg border p-1", selected && "border-primary/30 bg-muted/50")}>
                        <Button
                          variant="ghost" size="icon" className="mt-1 size-11 shrink-0"
                          aria-label={(task.completed_at ? "Reopen " : "Complete ") + task.title}
                          disabled={pending}
                          onClick={() => updateTask.mutate({ uuid: task.uuid, input: { completed: !task.completed_at } })}
                        >
                          {task.completed_at ? <CircleCheck /> : <Circle />}
                        </Button>
                        <div className="min-w-0 flex-1 py-1">
                          {status === "active" ? (
                            <Button
                              variant="ghost"
                              className="h-auto min-h-11 w-full flex-col items-start gap-1 px-1 py-2 text-left whitespace-normal"
                              aria-label={"Focus on " + task.title}
                              aria-pressed={selected}
                              disabled={sessionActive && !current}
                              onClick={() => onSelect(task)}
                            >
                              <span className="line-clamp-2 leading-snug" title={task.title}>{task.title}</span>
                              {source && <span className="flex min-w-0 max-w-full items-center gap-1 text-xs font-normal text-muted-foreground"><KanbanSquare className="size-3.5 shrink-0" /><span className="truncate" title={source}>{source}</span></span>}
                            </Button>
                          ) : (
                            <p className="line-clamp-2 px-1 py-2 leading-snug text-muted-foreground line-through" title={task.title}>{task.title}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 pb-1">
                            {selected && <Badge variant="secondary">{current ? "Current" : "Selected"}</Badge>}
                            <span className="text-xs tabular-nums text-muted-foreground">{task.session_count} {task.session_count === 1 ? "session" : "sessions"}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="mt-1 size-11 shrink-0" />} aria-label={"Actions for " + task.title} disabled={pending}>
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuGroup>
                              <DropdownMenuItem className="min-h-11" onClick={() => updateTask.mutate({ uuid: task.uuid, input: { completed: !task.completed_at } })}>
                                {task.completed_at ? <RotateCcw /> : <Check />}{task.completed_at ? "Reopen" : "Complete"}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="min-h-11" destructive disabled={current} onClick={() => deleteTask.mutate(task.uuid)}><Trash2 />Remove</DropdownMenuItem>
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
