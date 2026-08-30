"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, FileText, Link2 } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAreasQuery } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import type { NoteTreeNode } from "@/features/areas/type";
import type {
  BoardLabel,
  BoardStageKey,
  BoardTask,
  BoardTaskInput,
  BoardTaskPriority,
} from "../type";

const stages: { value: BoardStageKey; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todos", label: "Todos" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

function flattenNotes(nodes: NoteTreeNode[]): NoteTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenNotes(node.children)]);
}

function toggle(items: string[], uuid: string) {
  return items.includes(uuid)
    ? items.filter((item) => item !== uuid)
    : [...items, uuid];
}

export function ProjectTaskDialog({
  open,
  onOpenChange,
  task,
  initialStage,
  labels,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: BoardTask;
  initialStage: BoardStageKey;
  labels: BoardLabel[];
  isPending: boolean;
  onSubmit: (input: BoardTaskInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<BoardTaskPriority>(task?.priority ?? "medium");
  const [stage, setStage] = useState<BoardStageKey>(task?.stage ?? initialStage);
  const [labelUuids, setLabelUuids] = useState<string[]>(task?.labels.map((label) => label.uuid) ?? []);
  const [resourceUuids, setResourceUuids] = useState<string[]>(task?.resources.map((resource) => resource.uuid) ?? []);
  const [noteUuids, setNoteUuids] = useState<string[]>(task?.notes.map((note) => note.uuid) ?? []);
  const areasQuery = useAreasQuery("active");
  const resourcesQuery = useQuery({
    queryKey: ["resources", "all"],
    queryFn: () => areaService.allResources(),
    enabled: open,
  });
  const notesQuery = useQuery({
    queryKey: ["areas", "all-notes", ...(areasQuery.data?.data.map((area) => area.uuid) ?? [])],
    queryFn: async () =>
      Promise.all(
        (areasQuery.data?.data ?? []).map(async (area) => ({
          area,
          notes: flattenNotes((await areaService.noteTree(area.uuid)).data),
        })),
      ),
    enabled: open && Boolean(areasQuery.data),
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      stage,
      label_uuids: labelUuids,
      resource_uuids: resourceUuids,
      note_uuids: noteUuids,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            Add the work, context, and links needed to move this project forward.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-5">
          <label className="grid gap-1.5 text-sm font-medium">
            Title
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Description
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Priority
              <Select value={priority} onValueChange={(value) => setPriority(value as BoardTaskPriority)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Stage
              <Select value={stage} onValueChange={(value) => setStage(value as BoardStageKey)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
          </div>

          <Picker title="Labels" empty="No labels on this board yet.">
            {labels.map((label) => (
              <Button key={label.uuid} type="button" size="sm" variant={labelUuids.includes(label.uuid) ? "default" : "outline"} onClick={() => setLabelUuids(toggle(labelUuids, label.uuid))}>
                {labelUuids.includes(label.uuid) && <Check />}
                <span className="size-2 rounded-full" style={{ backgroundColor: label.hex }} />
                {label.name}
              </Button>
            ))}
          </Picker>

          <Picker title="Resources" empty={resourcesQuery.isLoading ? "Loading resources…" : "No resources available."} icon={<Link2 className="size-4" />}>
            {resourcesQuery.data?.data.map((resource) => (
              <Button key={resource.uuid} type="button" size="sm" variant={resourceUuids.includes(resource.uuid) ? "default" : "outline"} onClick={() => setResourceUuids(toggle(resourceUuids, resource.uuid))}>
                {resourceUuids.includes(resource.uuid) && <Check />}{resource.title}
              </Button>
            ))}
          </Picker>

          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-medium"><FileText className="size-4" /> Notes</div>
            {notesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading notes…</p> : notesQuery.data?.length ? (
              <div className="grid max-h-44 gap-3 overflow-y-auto rounded-lg border p-3">
                {notesQuery.data.map(({ area, notes }) => notes.length > 0 && (
                  <div key={area.uuid} className="grid gap-2">
                    <Badge variant="secondary" className="w-fit">{area.name}</Badge>
                    <div className="flex flex-wrap gap-2">
                      {notes.map((note) => <Button key={note.uuid} type="button" size="sm" variant={noteUuids.includes(note.uuid) ? "default" : "outline"} onClick={() => setNoteUuids(toggle(noteUuids, note.uuid))}>{noteUuids.includes(note.uuid) && <Check />}{note.title}</Button>)}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No notes available.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()}>{task ? "Save task" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Picker({ title, empty, icon, children }: { title: string; empty: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasItems = Array.isArray(items) ? items.length > 0 : Boolean(items);
  return <div className="grid gap-2"><div className="flex items-center gap-2 text-sm font-medium">{icon}{title}</div>{hasItems ? <div className="flex flex-wrap gap-2">{children}</div> : <p className="text-sm text-muted-foreground">{empty}</p>}</div>;
}
