"use client";

import { Link2, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export function AddFocusTaskDialog({ onOpenChange, onCreated }: {
  onOpenChange: (open: boolean) => void;
  onCreated: (task: FocusTask) => void;
}) {
  const [mode, setMode] = useState<"standalone" | "linked">("standalone");
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLink, setSelectedLink] = useState<string>();
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  const create = useCreateFocusTaskMutation();
  const linkable = useLinkableFocusTasksQuery(debouncedSearch, mode === "linked");
  const searching = search.trim() !== debouncedSearch;
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
    <Dialog open onOpenChange={(open) => !create.isPending && onOpenChange(open)}>
      <DialogContent showCloseButton={false} finalFocus={() => opener} className="max-h-[92dvh] motion-reduce:transition-none">
        <DialogHeader>
          <DialogTitle>Add focus task</DialogTitle>
          <DialogDescription>Write down one thing to work on, or choose a Project Board task.</DialogDescription>
        </DialogHeader>
        <Button variant="ghost" size="icon" className="absolute top-3 right-3 size-11" aria-label="Close" onClick={() => onOpenChange(false)} disabled={create.isPending}><X /></Button>
        <form className="flex min-h-0 flex-col gap-5" onSubmit={(event) => { event.preventDefault(); submit(); }} noValidate>
          <Tabs value={mode} onValueChange={(value) => { setMode(value as "standalone" | "linked"); create.reset(); }}>
            <TabsList className="min-h-12 w-full">
              <TabsTrigger value="standalone" className="min-h-11" disabled={create.isPending}><Plus data-icon="inline-start" />New task</TabsTrigger>
              <TabsTrigger value="linked" className="min-h-11" disabled={create.isPending}><Link2 data-icon="inline-start" />Project task</TabsTrigger>
            </TabsList>
            <TabsContent value="standalone">
              <FieldGroup>
                <Field data-invalid={Boolean(titleError)} className="gap-2">
                  <FieldLabel htmlFor="focus-task-title">Task title</FieldLabel>
                  <Input id="focus-task-title" className="min-h-11" value={title} onChange={(event) => { setTitle(event.target.value); setTitleError(undefined); create.reset(); }} placeholder="What do you want to focus on?" maxLength={120} autoFocus aria-invalid={Boolean(titleError)} aria-describedby={titleError ? "focus-task-title-error" : "focus-task-title-help"} disabled={create.isPending} />
                  <FieldDescription id="focus-task-title-help">Keep it specific and small enough to start.</FieldDescription>
                  {titleError && <FieldError id="focus-task-title-error">{titleError}</FieldError>}
                </Field>
              </FieldGroup>
            </TabsContent>
            <TabsContent value="linked">
              <FieldGroup className="gap-3">
                <Field className="gap-2">
                  <FieldLabel htmlFor="focus-task-search">Search Project Board tasks</FieldLabel>
                  <InputGroup className="min-h-11">
                    <InputGroupAddon><Search /></InputGroupAddon>
                    <InputGroupInput id="focus-task-search" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedLink(undefined); }} placeholder="Search by task title…" disabled={create.isPending} />
                  </InputGroup>
                </Field>
                <div className="workspace-list-scrollbar flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border p-1" aria-label="Available project tasks" aria-busy={linkable.isLoading || searching}>
                  {linkable.isLoading || searching ? <div className="grid gap-2 p-2"><Skeleton className="h-16" /><span className="text-sm text-muted-foreground" role="status">Searching tasks…</span></div>
                    : linkable.isError ? <Alert variant="destructive"><AlertDescription className="flex flex-col items-start gap-2">Project tasks could not be loaded.<Button variant="outline" className="min-h-11" onClick={() => linkable.refetch()} type="button">Try again</Button></AlertDescription></Alert>
                    : linkable.data?.data.length === 0 ? <Empty className="p-5"><EmptyHeader><EmptyTitle>No available tasks</EmptyTitle><EmptyDescription>{search ? "Try another title." : "Active Project Board tasks that aren’t already in Focus will appear here."}</EmptyDescription></EmptyHeader></Empty>
                    : linkable.data?.data.map((task) => (
                      <Button type="button" key={task.uuid} variant="ghost" aria-pressed={selectedLink === task.uuid} onClick={() => setSelectedLink(task.uuid)} disabled={create.isPending} className={cn("h-auto min-h-16 w-full flex-col items-start gap-1 px-3 py-3 text-left whitespace-normal", selectedLink === task.uuid && "bg-muted")}>
                        <span className="line-clamp-2">{task.title}</span>
                        <span className="text-xs font-normal text-muted-foreground">{[task.project, task.board, task.stage].filter(Boolean).join(" / ")}</span>
                      </Button>
                    ))}
                </div>
              </FieldGroup>
            </TabsContent>
          </Tabs>
          {create.isError && !titleError && <Alert variant="destructive"><AlertDescription>{create.error.message}</AlertDescription></Alert>}
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
            <Button type="submit" className="min-h-11" disabled={create.isPending || (mode === "linked" && !selectedLink)}>
              {create.isPending && <Loader2 data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />}{create.isPending ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
