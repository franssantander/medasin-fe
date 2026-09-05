"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useResourceQuery,
  useResourcesQuery,
} from "@/features/resources/queries/resource-query";
import {
  CalendarDays,
  Check,
  Clock3,
  FileText,
  Link2,
  LoaderCircle,
  Plus,
  Trash2,
  XIcon,
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import { ResourceDetailDialog } from "@/features/resources/components/resource-detail-dialog";
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

type TaskSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function createTaskDraft(task?: BoardTask): BoardTaskInput {
  return {
    title: task?.title ?? "",
    description: task?.description ?? null,
    priority: task?.priority ?? "medium",
    stage: task?.stage ?? "backlog",
    label_uuids: task?.labels.slice(0, 1).map((label) => label.uuid) ?? [],
    resource_uuids: task?.resources.map((resource) => resource.uuid) ?? [],
    note_uuids: task?.notes.map((note) => note.uuid) ?? [],
  };
}

function normalizeTaskDraft(draft: BoardTaskInput): BoardTaskInput {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
  };
}

function taskDraftsMatch(left: BoardTaskInput, right: BoardTaskInput) {
  return JSON.stringify(left) === JSON.stringify(right);
}

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
  const taskUuid = task?.uuid;
  const initialDraft = createTaskDraft(task);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [saveState, setSaveState] = useState<TaskSaveState>("idle");
  const [linkPicker, setLinkPicker] = useState<"resources" | "notes">();
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [selectedResourceUuid, setSelectedResourceUuid] = useState<string>();
  const draftRef = useRef(initialDraft);
  const savedDraftRef = useRef(normalizeTaskDraft(initialDraft));
  const saveTimerRef = useRef<number | undefined>(undefined);
  const saveInFlightRef = useRef<Promise<void> | null>(null);
  const flushAgainRef = useRef(false);
  const autosaveCancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const flushDraftRef = useRef<() => Promise<void>>(async () => undefined);
  const areasQuery = useQuery({
    queryKey: areaKeys.list("active"),
    queryFn: () => areaService.list("active"),
    enabled: Boolean(task),
  });
  const resourcesQuery = useResourcesQuery({}, Boolean(task) && !archived);
  const selectedResourceQuery = useResourceQuery(selectedResourceUuid);
  const availableResources = [
    ...new Map(
      resourcesQuery.data?.pages
        .flatMap((page) => page.data.data)
        .map((resource) => [resource.uuid, resource]),
    ).values(),
  ];
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

  const flushDraft = () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }
    if (!task || archived || autosaveCancelledRef.current) {
      return Promise.resolve();
    }
    if (saveInFlightRef.current) {
      flushAgainRef.current = true;
      return saveInFlightRef.current;
    }

    const snapshot = normalizeTaskDraft(draftRef.current);
    if (!snapshot.title) {
      if (mountedRef.current) setSaveState("dirty");
      return Promise.resolve();
    }
    if (taskDraftsMatch(snapshot, savedDraftRef.current)) {
      if (mountedRef.current) setSaveState("saved");
      return Promise.resolve();
    }

    if (mountedRef.current) setSaveState("saving");
    let succeeded = false;
    const request = onSave(snapshot)
      .then(() => {
        succeeded = true;
        savedDraftRef.current = snapshot;
        if (mountedRef.current) {
          setSaveState(
            taskDraftsMatch(
              normalizeTaskDraft(draftRef.current),
              savedDraftRef.current,
            )
              ? "saved"
              : "dirty",
          );
        }
      })
      .catch(() => {
        if (mountedRef.current) setSaveState("error");
      })
      .finally(() => {
        saveInFlightRef.current = null;
        const shouldFlushAgain = flushAgainRef.current;
        flushAgainRef.current = false;
        if (succeeded && shouldFlushAgain) {
          void flushDraftRef.current();
        }
      });
    saveInFlightRef.current = request;
    return request;
  };

  useEffect(() => {
    flushDraftRef.current = flushDraft;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void flushDraftRef.current();
    };
  }, []);

  useEffect(() => {
    if (!taskUuid) return;

    const animationFrame = window.requestAnimationFrame(() => {
      setDrawerOpen(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [taskUuid]);

  const updateDraft = (values: Partial<BoardTaskInput>) => {
    if (archived) return;
    autosaveCancelledRef.current = false;
    const nextDraft = { ...draftRef.current, ...values };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSaveState("dirty");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(
      () => void flushDraftRef.current(),
      750,
    );
  };

  const handleToggleResource = (resourceUuid: string) => {
    updateDraft({
      resource_uuids: toggleSelection(
        draftRef.current.resource_uuids,
        resourceUuid,
      ),
    });
  };

  const handleOpenResource = (resourceUuid: string) => {
    if (
      resourceUuid === selectedResourceUuid &&
      selectedResourceQuery.isError
    ) {
      void selectedResourceQuery.refetch();
      return;
    }
    setSelectedResourceUuid(resourceUuid);
  };

  const cancelPendingAutosave = () => {
    autosaveCancelledRef.current = true;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }
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
    updateDraft({ label_uuids: labelUuid ? [labelUuid] : [] });
  };

  const selectedLabel = draft.label_uuids[0]
    ? (labels.find((label) => label.uuid === draft.label_uuids[0]) ??
      task?.labels.find((label) => label.uuid === draft.label_uuids[0]))
    : undefined;

  return (
    <Drawer
      open={drawerOpen}
      showSwipeHandle
      swipeDirection="right"
      onOpenChange={(open) => {
        if (!open) void flushDraftRef.current();
        setDrawerOpen(open);
      }}
      onOpenChangeComplete={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DrawerContent className="w-full md:w-[46rem] ">
        {task && (
          <>
            <DrawerHeader className="shrink-0 gap-1.5 border-b p-4">
              <DrawerTitle className="leading-tight">
                {archived ? (
                  <span className="text-2xl font-semibold leading-tight sm:text-3xl">
                    {task.title}
                  </span>
                ) : (
                  <Input
                    value={draft.title}
                    onChange={(event) =>
                      updateDraft({ title: event.target.value })
                    }
                    onBlur={() => {
                      const nextTitle = draftRef.current.title.trim();
                      updateDraft({
                        title: nextTitle || savedDraftRef.current.title,
                      });
                      void flushDraftRef.current();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    maxLength={120}
                    aria-label="Task title"
                    className="h-auto border-0 px-0 text-2xl font-semibold leading-tight shadow-none focus-visible:ring-0 sm:text-3xl md:text-3xl"
                  />
                )}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                View and update the task details.
              </DrawerDescription>
              <DrawerClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-4 right-4"
                    aria-label="Close task details"
                  />
                }
              >
                <XIcon />
              </DrawerClose>
              <div className="flex items-center gap-4">
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
                    value={draft.stage}
                    onValueChange={(value) => {
                      const nextStage = value as BoardStageKey;
                      updateDraft({ stage: nextStage });
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <StatusValue
                        color={stageDotColors[draft.stage]}
                        label={
                          stages.find((item) => item.key === draft.stage)
                            ?.name ?? draft.stage.replace("_", " ")
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
                    value={draft.priority}
                    onValueChange={(value) => {
                      const nextPriority = value as BoardTask["priority"];
                      updateDraft({ priority: nextPriority });
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <StatusValue
                        color={priorityDotColors[draft.priority]}
                        label={
                          draft.priority.charAt(0).toUpperCase() +
                          draft.priority.slice(1)
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
            </DrawerHeader>

            <div className="grid min-h-0 flex-1 content-start gap-6 overflow-y-auto p-4">
              <TaskDetailSection title="Description">
                <div className="h-[26rem] min-h-64 overflow-hidden rounded-lg">
                  <NoteRichTextEditor
                    mode="task"
                    documentId={`task-description-${task.uuid}`}
                    content={draft.description ?? ""}
                    editable={!archived}
                    noteOptions={editorNoteOptions}
                    onChange={(content) =>
                      updateDraft({ description: content })
                    }
                    onBlur={() => void flushDraftRef.current()}
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
                            disabled={labels.length === 0}
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
                            {label.uuid === draft.label_uuids[0] && <Check />}
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
                  <TaskResourceList
                    items={task.resources}
                    selectedUuid={selectedResourceUuid}
                    isLoading={selectedResourceQuery.isLoading}
                    isError={selectedResourceQuery.isError}
                    onSelect={handleOpenResource}
                  />
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
              <DrawerFooter className="shrink-0 border-t p-4 sm:flex-row sm:justify-end">
                {saveState === "error" ? (
                  <button
                    type="button"
                    className="mr-auto self-center text-sm text-destructive underline underline-offset-4"
                    onClick={() => void flushDraftRef.current()}
                  >
                    Retry save
                  </button>
                ) : saveState !== "idle" ? (
                  <span className="mr-auto self-center text-sm text-muted-foreground">
                    {saveState === "dirty"
                      ? "Unsaved changes"
                      : saveState === "saving" || isSaving
                        ? "Saving…"
                        : "Saved"}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeleting || isSaving}
                  onClick={() => setDeleteConfirmationOpen(true)}
                >
                  <Trash2 />
                  {isDeleting ? "Deleting…" : "Delete"}
                </Button>
              </DrawerFooter>
            )}

            {!archived && (
              <Dialog
                open={Boolean(linkPicker)}
                onOpenChange={(open) => {
                  if (!open) {
                    setLinkPicker(undefined);
                    void flushDraftRef.current();
                  }
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
                  {linkPicker === "resources" && resourcesQuery.isError && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        resourcesQuery.isFetchNextPageError
                          ? resourcesQuery.fetchNextPage()
                          : resourcesQuery.refetch()
                      }
                    >
                      Retry loading resources
                    </Button>
                  )}
                  {linkPicker === "resources" && resourcesQuery.hasNextPage && (
                    <Button
                      variant="outline"
                      disabled={resourcesQuery.isFetchingNextPage}
                      onClick={() => resourcesQuery.fetchNextPage()}
                    >
                      {resourcesQuery.isFetchingNextPage
                        ? "Loading…"
                        : "Load more resources"}
                    </Button>
                  )}
                  <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1">
                    {linkPicker === "resources" ? (
                      resourcesQuery.isLoading ? (
                        <EmptyTaskDetail>Loading resources…</EmptyTaskDetail>
                      ) : availableResources.length ? (
                        <ResourcePickerItems
                          resources={availableResources}
                          selectedUuids={draft.resource_uuids}
                          onToggle={handleToggleResource}
                        />
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
                                const selected = draft.note_uuids.includes(
                                  note.uuid,
                                );
                                return (
                                  <LinkPickerItem
                                    key={note.uuid}
                                    title={note.title}
                                    icon={<FileText />}
                                    selected={selected}
                                    onClick={() => {
                                      const next = toggleSelection(
                                        draftRef.current.note_uuids,
                                        note.uuid,
                                      );
                                      updateDraft({ note_uuids: next });
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
                      onClick={() => {
                        setLinkPicker(undefined);
                        void flushDraftRef.current();
                      }}
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {!archived && (
              <Dialog
                open={deleteConfirmationOpen}
                onOpenChange={(open) => {
                  if (!isDeleting) setDeleteConfirmationOpen(open);
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete task?</DialogTitle>
                    <DialogDescription>
                      “{task.title}” will move to Trash for 30 days. You can
                      restore it from Settings before it is permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isDeleting}
                      onClick={() => setDeleteConfirmationOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={() => {
                        cancelPendingAutosave();
                        onDelete();
                      }}
                    >
                      <Trash2 />
                      {isDeleting ? "Deleting…" : "Delete task"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {selectedResourceQuery.data?.data && (
              <ResourceDetailDialog
                resource={selectedResourceQuery.data.data}
                onClose={() => setSelectedResourceUuid(undefined)}
              />
            )}
          </>
        )}
      </DrawerContent>
    </Drawer>
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

function TaskResourceList({
  items,
  selectedUuid,
  isLoading,
  isError,
  onSelect,
}: {
  items: BoardTaskResourceLink[];
  selectedUuid?: string;
  isLoading: boolean;
  isError: boolean;
  onSelect: (uuid: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <LinkedItemCard
          key={item.uuid}
          icon={<Link2 />}
          title={item.title}
          areas={item.areas.map((area) => area.name)}
          date={item.updated_at ?? item.created_at}
          loading={selectedUuid === item.uuid && isLoading}
          error={selectedUuid === item.uuid && isError}
          onClick={() => onSelect(item.uuid)}
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
  loading,
  error,
  onClick,
}: {
  href?: string;
  icon: React.ReactNode;
  title: string;
  areas: string[];
  date: string | null;
  loading?: boolean;
  error?: boolean;
  onClick?: () => void;
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
          {loading && (
            <span className="flex items-center gap-1">
              <LoaderCircle className="size-3 animate-spin" />
              Loading…
            </span>
          )}
          {error && <span className="text-destructive">Retry</span>}
        </span>
      </span>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  if (onClick) {
    return (
      <button
        type="button"
        className="w-full text-left"
        aria-busy={loading}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }
  return content;
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
  disabled?: boolean;
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

function ResourcePickerItems({
  resources,
  selectedUuids,
  onToggle,
}: {
  resources: { uuid: string; title: string }[];
  selectedUuids: string[];
  onToggle: (uuid: string) => void;
}) {
  return resources.map((resource) => (
    <LinkPickerItem
      key={resource.uuid}
      title={resource.title}
      icon={<Link2 />}
      selected={selectedUuids.includes(resource.uuid)}
      onClick={() => onToggle(resource.uuid)}
    />
  ));
}
