"use client";

import { Check, KanbanSquare, Link2, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/lib/axios/errors";
import { useCreateFocusTaskMutation, useLinkableFocusTasksQuery } from "../queries/focus-query";
import { focusTaskSchema } from "../schemas/focus-schema";
import type { FocusTask } from "../type";

export function AddFocusTaskDialog({ open, onOpenChange, onClosed, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
  onCreated: (task: FocusTask) => void;
}) {
  const [mode, setMode] = useState<"standalone" | "linked">("standalone");
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLink, setSelectedLink] = useState<string>();
  const [opener] = useState(() => typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const create = useCreateFocusTaskMutation();
  const linkable = useLinkableFocusTasksQuery(debouncedSearch, open && mode === "linked");
  const searching = search.trim() !== debouncedSearch;
  const selectedTitle = linkable.data?.data.find((task) => task.uuid === selectedLink)?.title;
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const submit = () => {
    if (create.isPending) return;
    const parsed = focusTaskSchema.safeParse({ title });
    if (mode === "standalone" && !parsed.success) {
      setTitleError(parsed.error.issues[0]?.message);
      requestAnimationFrame(() => document.getElementById("focus-task-title")?.focus());
      return;
    }
    if (mode === "linked" && !selectedLink) return;
    create.mutate(mode === "linked" ? { board_task_uuid: selectedLink } : { title: parsed.success ? parsed.data.title : title }, {
      onSuccess: (response) => { onCreated(response.data); onOpenChange(false); },
      onError: (error) => {
        const message = parseApiError(error).validationErrors?.title?.[0];
        if (message) { setTitleError(message); document.getElementById("focus-task-title")?.focus(); }
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !create.isPending && onOpenChange(next)}
      onOpenChangeComplete={(next) => !next && onClosed()}
    >
      <DialogContent showCloseButton={false} finalFocus={() => opener} className="max-h-[min(90dvh,40rem)] max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14 sm:px-6 sm:pr-14">
          <DialogTitle>Add focus task</DialogTitle>
          <DialogDescription>Write down one thing to work on, or choose a Project Board task.</DialogDescription>
        </DialogHeader>
        <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" className="absolute top-4 right-4" />} aria-label="Close" disabled={create.isPending}><X /></DialogClose>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); submit(); }} noValidate>
          <div className="workspace-list-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            <Tabs value={mode} onValueChange={(value) => { setMode(value as "standalone" | "linked"); create.reset(); }} className="gap-4">
              <TabsList className="w-full">
                <TabsTrigger value="standalone" disabled={create.isPending}><Plus data-icon="inline-start" />New task</TabsTrigger>
                <TabsTrigger value="linked" disabled={create.isPending}><Link2 data-icon="inline-start" />Project task</TabsTrigger>
              </TabsList>
              <TabsContent value="standalone">
                <FieldGroup>
                  <Field data-invalid={Boolean(titleError)} data-disabled={create.isPending} className="gap-2">
                    <FieldLabel htmlFor="focus-task-title">Task title</FieldLabel>
                    <Input id="focus-task-title" value={title} onChange={(event) => { setTitle(event.target.value); setTitleError(undefined); create.reset(); }} placeholder="What do you want to focus on?" maxLength={120} autoFocus aria-invalid={Boolean(titleError)} aria-describedby={titleError ? "focus-task-title-error" : "focus-task-title-help"} disabled={create.isPending} />
                    <div className="flex items-start justify-between gap-3">
                      <FieldDescription id="focus-task-title-help">Keep it specific and small enough to start.</FieldDescription>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums" aria-hidden="true">{title.length}/120</span>
                    </div>
                    {titleError && <FieldError id="focus-task-title-error">{titleError}</FieldError>}
                  </Field>
                </FieldGroup>
              </TabsContent>
              <TabsContent value="linked">
                <FieldGroup className="gap-3">
                  <Field data-disabled={create.isPending} className="gap-2">
                    <FieldLabel htmlFor="focus-task-search">Search Project Board tasks</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon><Search /></InputGroupAddon>
                      <InputGroupInput id="focus-task-search" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedLink(undefined); }} placeholder="Search by task title…" disabled={create.isPending} />
                    </InputGroup>
                  </Field>
                  <div className="workspace-list-scrollbar flex h-64 flex-col gap-1 overflow-y-auto overscroll-contain rounded-lg border p-1" aria-label="Available project tasks" aria-busy={linkable.isLoading || searching}>
                    {linkable.isLoading || searching ? (
                      <div className="flex flex-col gap-1">
                        {Array.from({ length: 3 }, (_, index) => (
                          <div key={index} className="flex flex-col gap-2 px-3 py-2.5">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        ))}
                        <span className="sr-only" role="status">Searching tasks…</span>
                      </div>
                    ) : linkable.isError ? (
                      <Alert variant="destructive" className="m-1"><AlertDescription className="flex flex-col items-start gap-2">Project tasks could not be loaded.<Button variant="outline" size="sm" onClick={() => linkable.refetch()} type="button">Try again</Button></AlertDescription></Alert>
                    ) : linkable.data?.data.length === 0 ? (
                      <Empty className="h-full p-5"><EmptyHeader><EmptyTitle>No available tasks</EmptyTitle><EmptyDescription>{search ? "Try another title." : "Active Project Board tasks that aren’t already in Focus will appear here."}</EmptyDescription></EmptyHeader></Empty>
                    ) : linkable.data?.data.map((task) => {
                      const selected = selectedLink === task.uuid;
                      const path = [task.project, task.board].filter(Boolean).join(" / ");
                      return (
                        <Button
                          type="button"
                          key={task.uuid}
                          variant="ghost"
                          aria-pressed={selected}
                          onClick={() => setSelectedLink(task.uuid)}
                          disabled={create.isPending}
                          className={cn("h-auto w-full shrink-0 items-start justify-between gap-3 px-3 py-2.5 text-left whitespace-normal", selected && "bg-muted ring-1 ring-border hover:bg-muted")}
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="line-clamp-2 max-w-full break-words">{task.title}</span>
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-normal text-muted-foreground">
                              {path && <span className="flex min-w-0 items-center gap-1"><KanbanSquare aria-hidden="true" className="size-3.5" /><span className="truncate" title={path}>{path}</span></span>}
                              {task.stage && <Badge variant="secondary" className="font-normal">{task.stage}</Badge>}
                            </span>
                          </span>
                          <Check aria-hidden="true" className={cn("mt-0.5 size-4", !selected && "invisible")} />
                        </Button>
                      );
                    })}
                  </div>
                </FieldGroup>
              </TabsContent>
            </Tabs>
            {create.isError && !titleError && <Alert variant="destructive"><AlertDescription>{create.error.message}</AlertDescription></Alert>}
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-4 sm:items-center sm:px-6">
            {mode === "linked" && (
              <p className="order-last min-w-0 truncate text-sm text-muted-foreground sm:order-first sm:mr-auto" aria-live="polite">
                {selectedTitle ? <>Selected: <span className="font-medium text-foreground">{selectedTitle}</span></> : "Choose a task to link"}
              </p>
            )}
            <DialogClose render={<Button type="button" variant="outline" />} disabled={create.isPending}>Cancel</DialogClose>
            <Button type="submit" disabled={create.isPending || (mode === "linked" && !selectedLink)}>
              {create.isPending && <Loader2 data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />}{create.isPending ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
