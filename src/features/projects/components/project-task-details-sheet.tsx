"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Clock3,
  FileText,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
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
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import type {
  BoardLabel,
  BoardStage,
  BoardStageKey,
  BoardTask,
  BoardTaskInput,
  BoardTaskNoteLink,
  BoardTaskResourceLink,
} from "../type";
import { LabelBadge, StatusDot, StatusValue } from "./project-kanban-shared";
import {
  flattenNotes,
  formatTaskDate,
  formatTaskTimestamp,
  priorityDotColors,
  priorityStyles,
  stageDotColors,
  toggleSelection,
} from "./project-kanban-utils";

export function TaskDetailsSheet({
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
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [descriptionSaveState, setDescriptionSaveState] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
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
  const descriptionRef = useRef(task?.description ?? "");
  const savedDescriptionRef = useRef(task?.description ?? "");
  const descriptionTimerRef = useRef<number | undefined>(undefined);
  const flushDescriptionRef = useRef<() => void>(() => undefined);
  const areasQuery = useQuery({
    queryKey: areaKeys.list("active"),
    queryFn: () => areaService.list("active"),
    enabled: Boolean(task),
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
    enabled: Boolean(task) && Boolean(areasQuery.data),
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
      description:
        (values.description ?? descriptionRef.current).trim() || null,
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

  const flushDescription = () => {
    if (!task || archived) return;
    if (descriptionTimerRef.current) {
      window.clearTimeout(descriptionTimerRef.current);
      descriptionTimerRef.current = undefined;
    }
    const nextDescription = descriptionRef.current;
    if (nextDescription === savedDescriptionRef.current) return;

    setDescriptionSaveState("saving");
    void save({ description: nextDescription })
      .then(() => {
        savedDescriptionRef.current = nextDescription;
        setDescriptionSaveState("saved");
      })
      .catch(() => setDescriptionSaveState("error"));
  };

  useEffect(() => {
    flushDescriptionRef.current = flushDescription;
  });

  useEffect(
    () => () => {
      if (descriptionTimerRef.current) {
        window.clearTimeout(descriptionTimerRef.current);
      }
      flushDescriptionRef.current();
    },
    [],
  );

  const scheduleDescriptionSave = (content: string) => {
    setDescription(content);
    descriptionRef.current = content;
    setDescriptionSaveState("dirty");
    if (descriptionTimerRef.current) {
      window.clearTimeout(descriptionTimerRef.current);
    }
    descriptionTimerRef.current = window.setTimeout(
      () => flushDescriptionRef.current(),
      750,
    );
  };

  const editorNoteOptions = useMemo(
    () =>
      (notesQuery.data ?? []).flatMap(({ notes }) =>
        notes.map((note) => ({
          uuid: note.uuid,
          title: note.title,
          depth: 0,
        })),
      ),
    [notesQuery.data],
  );

  const openEditorNote = (noteUuid: string) => {
    const group = notesQuery.data?.find(({ notes }) =>
      notes.some((note) => note.uuid === noteUuid),
    );
    if (group) {
      router.push(`/areas/${group.area.uuid}?tab=notes&note=${noteUuid}`);
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
      <SheetContent className="top-0 right-0 bottom-0 m-0 h-dvh w-full max-w-none gap-0 overflow-hidden rounded-none border-l sm:h-auto sm:max-w-[72rem] sm:border">
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
              <SheetDescription className="sr-only">
                View and update the task details.
              </SheetDescription>
              <div className="grid w-full grid-cols-2 gap-4">
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
            </SheetHeader>

            <div className="grid min-h-0 flex-1 content-start gap-6 overflow-y-auto p-4">
              <TaskDetailSection title="Description">
                <div className="h-80 min-h-64 overflow-hidden rounded-lg">
                  <NoteRichTextEditor
                    mode="task"
                    documentId={`task-description-${task.uuid}`}
                    content={description}
                    editable={!archived}
                    noteOptions={editorNoteOptions}
                    onChange={scheduleDescriptionSave}
                    onBlur={() => flushDescriptionRef.current()}
                    onOpenNote={openEditorNote}
                    onUploadFile={() =>
                      Promise.reject(
                        new Error("Media uploads are unavailable for tasks."),
                      )
                    }
                    onCreateChild={() =>
                      Promise.reject(
                        new Error("Page creation is unavailable for tasks."),
                      )
                    }
                    onEditorReady={() => undefined}
                    onHistoryStateChange={() => undefined}
                  />
                </div>
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
                {descriptionSaveState === "error" ? (
                  <button
                    type="button"
                    className="mr-auto self-center text-sm text-destructive underline underline-offset-4"
                    onClick={() => flushDescriptionRef.current()}
                  >
                    Retry description save
                  </button>
                ) : isSaving ||
                  descriptionSaveState === "dirty" ||
                  descriptionSaveState === "saving" ? (
                  <span className="mr-auto self-center text-sm text-muted-foreground">
                    {descriptionSaveState === "dirty"
                      ? "Unsaved changes"
                      : "Saving…"}
                  </span>
                ) : null}
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
                          const selected = resourceUuids.includes(
                            resource.uuid,
                          );
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
                        <EmptyTaskDetail>
                          No resources available.
                        </EmptyTaskDetail>
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

