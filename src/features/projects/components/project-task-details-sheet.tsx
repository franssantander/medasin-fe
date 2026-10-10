"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { useQuery } from "@tanstack/react-query";
import {
  useResourceQuery,
  useResourcesQuery,
} from "@/features/resources/queries/resource-query";
import {
  AlignLeft,
  Archive,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  Clock3,
  Cloud,
  FileText,
  Link2,
  LoaderCircle,
  Plus,
  Trash2,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import { useNotesTreeQuery } from "@/features/notes/queries/note-query";
import { ResourceDetailDialog } from "@/features/resources/components/resource-detail-dialog";
import { cn } from "@/lib/utils";
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
  type FlatNote,
} from "./project-kanban-utils";

type TaskSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type NotePickerGroup = {
  key: string;
  label: string;
  area: { uuid: string; name: string } | null;
  notes: FlatNote[];
};

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
  const { resolvedTheme } = useTheme();
  const fieldId = useId();
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
  const deletedResourceUuidsRef = useRef(new Set<string>());
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
  const standaloneNotesQuery = useNotesTreeQuery(Boolean(task));
  const resourcesQuery = useResourcesQuery({}, Boolean(task) && !archived);
  const selectedResourceQuery = useResourceQuery(selectedResourceUuid);
  const availableResources = [
    ...new Map(
      resourcesQuery.data?.pages
        .flatMap((page) => page.data.data)
        .map((resource) => [resource.uuid, resource]),
    ).values(),
  ];
  const areaNotesQuery = useQuery({
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
  const noteGroups = useMemo<NotePickerGroup[]>(() => {
    const groups: NotePickerGroup[] = [];
    const standaloneNotes = standaloneNotesQuery.data?.data
      ? flattenNotes(standaloneNotesQuery.data.data)
      : [];

    if (standaloneNotes.length > 0) {
      groups.push({
        key: "standalone",
        label: "Standalone notes",
        area: null,
        notes: standaloneNotes,
      });
    }

    for (const group of areaNotesQuery.data ?? []) {
      if (group.notes.length === 0) continue;
      groups.push({
        key: group.area.uuid,
        label: group.area.name,
        area: { uuid: group.area.uuid, name: group.area.name },
        notes: group.notes,
      });
    }

    return groups;
  }, [areaNotesQuery.data, standaloneNotesQuery.data]);
  const notesLoading =
    Boolean(task) &&
    (areasQuery.isLoading ||
      areaNotesQuery.isLoading ||
      standaloneNotesQuery.isLoading);
  const notesError =
    Boolean(task) &&
    (areasQuery.isError ||
      areaNotesQuery.isError ||
      standaloneNotesQuery.isError);

  const withoutDeletedResources = (input: BoardTaskInput): BoardTaskInput => ({
    ...input,
    resource_uuids: input.resource_uuids.filter((uuid) => !deletedResourceUuidsRef.current.has(uuid)),
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

    const snapshot = withoutDeletedResources(normalizeTaskDraft(draftRef.current));
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
    let retryAfterResourceDeletion = false;
    const request = onSave(snapshot)
      .then(() => {
        succeeded = true;
        savedDraftRef.current = withoutDeletedResources(snapshot);
        if (mountedRef.current) {
          setSaveState(
            taskDraftsMatch(
              withoutDeletedResources(normalizeTaskDraft(draftRef.current)),
              savedDraftRef.current,
            )
              ? "saved"
              : "dirty",
          );
        }
      })
      .catch(() => {
        // Deletion can finish while an older task save is still in flight.
        // Retry that snapshot's ordinary edits with the current resource links.
        retryAfterResourceDeletion = snapshot.resource_uuids.some((uuid) => deletedResourceUuidsRef.current.has(uuid));
        if (retryAfterResourceDeletion) flushAgainRef.current = true;
        else if (mountedRef.current) setSaveState("error");
      })
      .finally(() => {
        saveInFlightRef.current = null;
        const shouldFlushAgain = flushAgainRef.current;
        flushAgainRef.current = false;
        if ((succeeded || retryAfterResourceDeletion) && shouldFlushAgain) {
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

  const handleToggleNote = (noteUuid: string) => {
    updateDraft({
      note_uuids: toggleSelection(draft.note_uuids, noteUuid),
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

  const handleResourceDeleted = (resourceUuid: string) => {
    deletedResourceUuidsRef.current.add(resourceUuid);
    const nextDraft = withoutDeletedResources(draftRef.current);
    draftRef.current = nextDraft;
    savedDraftRef.current = withoutDeletedResources(savedDraftRef.current);
    setDraft(nextDraft);
    if (saveInFlightRef.current) {
      flushAgainRef.current = true;
    } else if (taskDraftsMatch(normalizeTaskDraft(nextDraft), savedDraftRef.current)) {
      setSaveState("saved");
    } else {
      void flushDraftRef.current();
    }
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
      noteGroups.flatMap(({ notes }) =>
        notes.map((note) => ({
          uuid: note.uuid,
          title: note.title,
          depth: note.depth,
        })),
      ),
    [noteGroups],
  );

  const openEditorNote = (noteUuid: string) => {
    const group = noteGroups.find(({ notes }) =>
      notes.some((note) => note.uuid === noteUuid),
    );
    if (!group) return;

    router.push(
      group.area
        ? `/areas/${group.area.uuid}?tab=notes&note=${noteUuid}`
        : `/notes?note=${noteUuid}`,
    );
  };

  const updateLabel = (labelUuid?: string) => {
    updateDraft({ label_uuids: labelUuid ? [labelUuid] : [] });
  };

  const selectedLabel = draft.label_uuids[0]
    ? (labels.find((label) => label.uuid === draft.label_uuids[0]) ??
      task?.labels.find((label) => label.uuid === draft.label_uuids[0]))
    : undefined;
  const saving = saveState === "saving" || isSaving;
  const saveError = saveState === "error" && !saving;
  const SaveIcon = saving
    ? LoaderCircle
    : saveError
      ? CircleAlert
      : saveState === "dirty"
        ? CircleDashed
        : saveState === "saved"
          ? CheckCircle2
          : Cloud;
  const saveMessage = saving
    ? "Saving…"
    : saveError
      ? "Couldn’t save changes"
      : saveState === "dirty"
        ? "Unsaved changes"
        : saveState === "saved"
          ? "Saved"
          : "Changes save automatically";

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
      <DrawerContent className="w-full max-w-full md:w-[46rem]">
        {task && (
          <>
            <DrawerHeader className="gap-3 border-b p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Task details
                  </span>
                  {archived && (
                    <Badge variant="secondary">
                      <Archive aria-hidden="true" data-icon="inline-start" />
                      Read only
                    </Badge>
                  )}
                </div>
                <DrawerClose
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 sm:size-9"
                      aria-label="Close task details"
                    />
                  }
                >
                  <XIcon aria-hidden="true" />
                </DrawerClose>
              </div>
              {archived ? (
                <DrawerTitle className="project-task-title [overflow-wrap:anywhere]">
                  {task.title}
                </DrawerTitle>
              ) : (
                <>
                  <DrawerTitle className="sr-only">
                    {draft.title || task.title}
                  </DrawerTitle>
                  <Field className="gap-0">
                    <FieldLabel htmlFor={`${fieldId}-title`} className="sr-only">
                      Task title
                    </FieldLabel>
                    <Textarea
                      id={`${fieldId}-title`}
                      rows={1}
                      value={draft.title}
                      onChange={(event) =>
                        updateDraft({
                          title: event.target.value.replace(/[\r\n]+/g, " "),
                        })
                      }
                      onBlur={() => {
                        const nextTitle = draftRef.current.title.trim();
                        updateDraft({
                          title: nextTitle || savedDraftRef.current.title,
                        });
                        void flushDraftRef.current();
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      maxLength={120}
                      className="project-task-title -mx-2 min-h-0 w-[calc(100%+1rem)] resize-none border-transparent px-2 py-1 shadow-none"
                    />
                  </Field>
                </>
              )}
              <DrawerDescription className="sr-only">
                {archived
                  ? "View this archived task. Task details are read only."
                  : "Update task details. Changes save automatically."}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <FieldGroup className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
                <Field className="min-w-0 gap-2">
                  {archived ? (
                    <FieldTitle>Status</FieldTitle>
                  ) : (
                    <FieldLabel htmlFor={`${fieldId}-status`}>Status</FieldLabel>
                  )}
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
                      <SelectTrigger
                        id={`${fieldId}-status`}
                        className="min-h-11 w-full min-w-0 sm:min-h-9"
                      >
                        <StatusValue
                          color={stageDotColors[draft.stage]}
                          label={
                            stages.find((item) => item.key === draft.stage)
                              ?.name ?? draft.stage.replace("_", " ")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {stages.map((item) => (
                            <SelectItem key={item.key} value={item.key}>
                              <StatusValue
                                color={stageDotColors[item.key]}
                                label={item.name}
                              />
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </Field>

                <Field className="min-w-0 gap-2">
                  {archived ? (
                    <FieldTitle>Priority</FieldTitle>
                  ) : (
                    <FieldLabel htmlFor={`${fieldId}-priority`}>
                      Priority
                    </FieldLabel>
                  )}
                  {archived ? (
                    <Badge
                      className={cn(
                        "w-fit gap-1.5 capitalize",
                        priorityStyles[task.priority],
                      )}
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
                      <SelectTrigger
                        id={`${fieldId}-priority`}
                        className="min-h-11 w-full min-w-0 sm:min-h-9"
                      >
                        <StatusValue
                          color={priorityDotColors[draft.priority]}
                          label={
                            draft.priority.charAt(0).toUpperCase() +
                            draft.priority.slice(1)
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
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
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </Field>

                <Field className="col-span-2 min-w-0 gap-2 sm:col-span-1">
                  {archived ? (
                    <FieldTitle>Label</FieldTitle>
                  ) : (
                    <FieldLabel htmlFor={`${fieldId}-label`}>Label</FieldLabel>
                  )}
                  {archived ? (
                    task.labels[0] ? (
                      <span className="min-w-0 [&_[data-slot=badge]]:block [&_[data-slot=badge]]:max-w-full [&_[data-slot=badge]]:truncate">
                        <LabelBadge label={task.labels[0]} />
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No label
                      </span>
                    )
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            id={`${fieldId}-label`}
                            className="h-11 w-full min-w-0 justify-between sm:h-9"
                            disabled={labels.length === 0 && !selectedLabel}
                            aria-label={
                              selectedLabel ? "Update label" : "Add label"
                            }
                          />
                        }
                      >
                        {selectedLabel ? (
                          <span className="min-w-0 [&_[data-slot=badge]]:block [&_[data-slot=badge]]:max-w-full [&_[data-slot=badge]]:truncate">
                            <LabelBadge label={selectedLabel} />
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No label</span>
                        )}
                        <ChevronDown
                          aria-hidden="true"
                          data-icon="inline-end"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="start"
                        className="max-w-[calc(100vw-2rem)]"
                      >
                        <MenuPrimitive.Group>
                          {labels.map((label) => (
                            <DropdownMenuItem
                              key={label.uuid}
                              onClick={() => updateLabel(label.uuid)}
                            >
                              <span className="min-w-0 flex-1 [&_[data-slot=badge]]:block [&_[data-slot=badge]]:max-w-full [&_[data-slot=badge]]:truncate">
                                <LabelBadge label={label} />
                              </span>
                              {label.uuid === draft.label_uuids[0] && (
                                <Check aria-hidden="true" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </MenuPrimitive.Group>
                        {selectedLabel && (
                          <>
                            <DropdownMenuSeparator />
                            <MenuPrimitive.Group>
                              <DropdownMenuItem
                                destructive
                                onClick={() => updateLabel()}
                              >
                                <Trash2 aria-hidden="true" />
                                Remove label
                              </DropdownMenuItem>
                            </MenuPrimitive.Group>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {!archived && labels.length === 0 && !selectedLabel && (
                    <FieldDescription>
                      No labels available for this board.
                    </FieldDescription>
                  )}
                </Field>
              </FieldGroup>

              <TaskDetailSection title="Description" icon={<AlignLeft />}>
                <div className="task-description-editor rounded-xl">
                  <NoteRichTextEditor
                    mode="task"
                    theme={resolvedTheme === "dark" ? "dark" : "light"}
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

              <TaskDetailSection
                title="Resources"
                count={task.resources.length}
                icon={<Link2 />}
                action={
                  !archived ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-11 sm:h-8"
                      onClick={() => setLinkPicker("resources")}
                    >
                      <Plus aria-hidden="true" data-icon="inline-start" />
                      Link resources
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
                  <EmptyTaskDetail icon={<Link2 />}>
                    No resources linked yet.
                  </EmptyTaskDetail>
                )}
              </TaskDetailSection>

              <TaskDetailSection
                title="Notes"
                count={task.notes.length}
                icon={<FileText />}
                action={
                  !archived ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-11 sm:h-8"
                      onClick={() => setLinkPicker("notes")}
                    >
                      <Plus aria-hidden="true" data-icon="inline-start" />
                      Link notes
                    </Button>
                  ) : undefined
                }
              >
                {task.notes.length > 0 ? (
                  <TaskNoteList items={task.notes} />
                ) : (
                  <EmptyTaskDetail icon={<FileText />}>
                    No notes linked yet.
                  </EmptyTaskDetail>
                )}
              </TaskDetailSection>

              {(task.created_at || task.updated_at) && (
                <div className="flex flex-col gap-4">
                  <Separator />
                  <dl className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                    {task.created_at && (
                      <div className="flex flex-col gap-1.5">
                        <dt className="flex items-center gap-1.5">
                          <Clock3 aria-hidden="true" className="size-3.5" />
                          Created
                        </dt>
                        <dd>
                          <time dateTime={task.created_at}>
                            {formatTaskTimestamp(task.created_at)}
                          </time>
                        </dd>
                      </div>
                    )}
                    {task.updated_at && (
                      <div className="flex flex-col gap-1.5">
                        <dt className="flex items-center gap-1.5">
                          <Clock3 aria-hidden="true" className="size-3.5" />
                          Updated
                        </dt>
                        <dd>
                          <time dateTime={task.updated_at}>
                            {formatTaskTimestamp(task.updated_at)}
                          </time>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>

            {!archived && (
              <DrawerFooter className="flex-row items-center justify-between gap-3 border-t px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <p
                    role="status"
                    aria-live="polite"
                    className={cn(
                      "flex items-center gap-2 text-sm text-muted-foreground",
                      saveError && "text-destructive",
                    )}
                  >
                    <SaveIcon
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0",
                        saving && "animate-spin motion-reduce:animate-none",
                      )}
                    />
                    <span>{saveMessage}</span>
                  </p>
                  {saveError && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="-ml-2.5 h-11 sm:h-8"
                      onClick={() => void flushDraftRef.current()}
                    >
                      Retry save
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 sm:h-9"
                  disabled={isDeleting || isSaving}
                  onClick={() => setDeleteConfirmationOpen(true)}
                >
                  <Trash2 aria-hidden="true" data-icon="inline-start" />
                  {isDeleting ? "Deleting…" : "Delete task"}
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
                  {linkPicker === "notes" && notesError && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (areasQuery.isError) void areasQuery.refetch();
                        if (areaNotesQuery.isError)
                          void areaNotesQuery.refetch();
                        if (standaloneNotesQuery.isError)
                          void standaloneNotesQuery.refetch();
                      }}
                    >
                      Retry loading notes
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
                    ) : notesLoading ? (
                      <EmptyTaskDetail>Loading notes…</EmptyTaskDetail>
                    ) : noteGroups.length ? (
                      noteGroups.map(({ key, label, notes }) => (
                        <div key={key} className="grid gap-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            {label}
                          </p>
                          <NotePickerItems
                            notes={notes}
                            selectedUuids={draft.note_uuids}
                            onToggle={handleToggleNote}
                          />
                        </div>
                      ))
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
                onDeleted={handleResourceDeleted}
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
  count,
  icon,
  action,
  children,
}: {
  title: string;
  count?: number;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 shrink-0 flex-col gap-3"
    >
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h3 id={titleId} className="flex items-center gap-2 text-sm font-semibold">
          {icon && (
            <span
              aria-hidden="true"
              className="text-muted-foreground [&_svg]:size-4"
            >
              {icon}
            </span>
          )}
          {title}
          {count !== undefined && (
            <Badge
              variant="secondary"
              className="min-w-5 justify-center tabular-nums"
            >
              {count}
            </Badge>
          )}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyTaskDetail({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Empty className="flex-row justify-start gap-3 border p-4 text-left">
      {icon && (
        <EmptyMedia variant="icon" aria-hidden="true" className="mb-0">
          {icon}
        </EmptyMedia>
      )}
      <EmptyDescription>{children}</EmptyDescription>
    </Empty>
  );
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
          href={
            item.area
              ? `/areas/${item.area.uuid}?tab=notes&note=${item.uuid}`
              : `/notes?note=${item.uuid}`
          }
          icon={<FileText />}
          title={item.title}
          areas={item.area ? [item.area.name] : ["Standalone notes"]}
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
  const itemClassName =
    "flex w-full min-w-0 items-center gap-3 rounded-xl border bg-card p-3 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {areas.length > 0 ? areas.join(", ") : "No area"}
          </span>
          {date && (
            <span className="flex items-center gap-1">
              <CalendarDays aria-hidden="true" className="size-3" />
              <time dateTime={date}>{formatTaskDate(date)}</time>
            </span>
          )}
          {loading && <span>Loading…</span>}
          {error && (
            <span className="text-destructive">
              Couldn’t load resource. Retry
            </span>
          )}
        </span>
      </span>
      {loading ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
        />
      ) : href ? (
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      ) : (
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      )}
    </>
  );

  if (href) {
    return <Link href={href} className={itemClassName}>{content}</Link>;
  }
  if (onClick) {
    return (
      <button
        type="button"
        className={itemClassName}
        aria-busy={loading}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }
  return <div className={itemClassName}>{content}</div>;
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
      variant={selected ? "secondary" : "outline"}
      className="h-auto min-h-11 justify-start py-2 text-left"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <span aria-hidden="true" className="text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <Check
        aria-hidden="true"
        data-icon="inline-end"
        className={cn(!selected && "opacity-0")}
      />
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

function NotePickerItems({
  notes,
  selectedUuids,
  onToggle,
}: {
  notes: FlatNote[];
  selectedUuids: string[];
  onToggle: (uuid: string) => void;
}) {
  return notes.map((note) => (
    <LinkPickerItem
      key={note.uuid}
      title={note.title}
      icon={<FileText />}
      selected={selectedUuids.includes(note.uuid)}
      onClick={() => onToggle(note.uuid)}
    />
  ));
}
