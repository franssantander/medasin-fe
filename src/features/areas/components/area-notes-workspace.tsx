"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pin, PinOff, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EMPTY_NOTE_DOCUMENT,
  getNoteDocumentPreview,
} from "@/components/ui/note-editor-document";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { areaService } from "../services/area-service";
import type { ApiResponse, Note, NoteInput, NoteTreeNode } from "../type";

const noteKeys = {
  tree: (areaUuid: string) =>
    ["areas", "detail", areaUuid, "notes", "tree"] as const,
  detail: (areaUuid: string, noteUuid: string) =>
    ["areas", "detail", areaUuid, "notes", noteUuid] as const,
};

type NoteSelection =
  | { kind: "note"; uuid: string; focusTitle?: boolean }
  | { kind: "draft"; key: number; uuid?: string };

export function AreaNotesWorkspace({
  areaUuid,
  archived,
}: {
  areaUuid: string;
  archived: boolean;
}) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<NoteSelection>();
  const [draftKey, setDraftKey] = useState(0);
  const treeQuery = useQuery({
    queryKey: noteKeys.tree(areaUuid),
    queryFn: () => areaService.noteTree(areaUuid),
  });
  const tree = useMemo(() => treeQuery.data?.data ?? [], [treeQuery.data]);
  const flatNotes = useMemo(() => flattenNotes(tree), [tree]);
  const derivedSelection: NoteSelection =
    selection ??
    (flatNotes[0]
      ? { kind: "note", uuid: flatNotes[0].uuid }
      : { kind: "draft", key: draftKey });
  const selectedUuid = derivedSelection.uuid;

  const refreshTree = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: noteKeys.tree(areaUuid) });
  }, [areaUuid, queryClient]);
  const pinMutation = useMutation({
    mutationFn: ({ uuid, pinned }: { uuid: string; pinned: boolean }) =>
      areaService.updateNote(areaUuid, uuid, { is_pinned: pinned }),
    onSuccess: async () => refreshTree(),
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ uuid }: { uuid: string; deletedUuids: string[] }) =>
      areaService.removeNote(areaUuid, uuid),
    onSuccess: async (response, variables) => {
      if (selectedUuid && variables.deletedUuids.includes(selectedUuid)) {
        setSelection(undefined);
      }
      await refreshTree();
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });

  if (treeQuery.isLoading) {
    return <Skeleton className="min-h-[48rem] flex-1 rounded-xl" />;
  }

  if (treeQuery.isError) {
    return (
      <Card className="items-center py-12 text-center">
        <CardTitle>Could not load notes</CardTitle>
        <CardDescription>{treeQuery.error.message}</CardDescription>
        <Button variant="outline" onClick={() => treeQuery.refetch()}>
          <RefreshCw />
          Try again
        </Button>
      </Card>
    );
  }

  const startDraft = () => {
    const nextKey = draftKey + 1;
    setDraftKey(nextKey);
    setSelection({ kind: "draft", key: nextKey });
  };

  return (
    <div className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-cols-[24rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b bg-muted/30 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-3">
          <div>
            <h2 className="font-semibold">Notes</h2>
            <p className="text-xs text-muted-foreground">
              {flatNotes.length} {flatNotes.length === 1 ? "page" : "pages"}
            </p>
          </div>
          {!archived && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New note"
              onClick={startDraft}
            >
              <Plus />
            </Button>
          )}
        </div>
        <div className="notes-list-scrollbar max-h-64 min-w-0 overflow-x-hidden overflow-y-auto p-2 md:max-h-none md:flex-1">
          {tree.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {archived
                ? "No notes in this area."
                : "Start writing your first note."}
            </p>
          ) : (
            <NoteTree
              nodes={tree}
              selectedUuid={selectedUuid}
              archived={archived}
              pinPending={pinMutation.isPending}
              deletePending={deleteMutation.isPending}
              onSelect={(uuid) => setSelection({ kind: "note", uuid })}
              onPin={(node) =>
                pinMutation.mutate({ uuid: node.uuid, pinned: !node.is_pinned })
              }
              onDelete={(node) => {
                const deletedUuids = flattenNotes([node]).map(
                  (item) => item.uuid,
                );
                if (
                  window.confirm(
                    node.children.length > 0
                      ? "Delete this note and all of its child pages?"
                      : "Delete this note?",
                  )
                ) {
                  deleteMutation.mutate({ uuid: node.uuid, deletedUuids });
                }
              }}
            />
          )}
        </div>
      </aside>
      <main className="min-h-0 min-w-0 overflow-hidden bg-white py-6">
        {derivedSelection.kind === "note" ? (
          <PersistedNotePanel
            key={derivedSelection.uuid}
            areaUuid={areaUuid}
            noteUuid={derivedSelection.uuid}
            archived={archived}
            focusTitle={derivedSelection.focusTitle}
            noteOptions={flatNotes}
            onOpenNote={(uuid, options) =>
              setSelection({ kind: "note", uuid, ...options })
            }
            onTreeChanged={refreshTree}
          />
        ) : (
          <NoteEditorPanel
            key={`draft-${derivedSelection.key}`}
            areaUuid={areaUuid}
            archived={archived}
            documentId={`draft-${derivedSelection.key}`}
            initialTitle=""
            initialContent={EMPTY_NOTE_DOCUMENT}
            initialPinned={false}
            persistedUuid={derivedSelection.uuid}
            noteOptions={flatNotes}
            onCreated={(note) => {
              setSelection((current) => {
                if (!current) {
                  return {
                    kind: "draft",
                    key: derivedSelection.key,
                    uuid: note.uuid,
                  };
                }
                return current.kind === "draft"
                  ? { ...current, uuid: note.uuid }
                  : current;
              });
            }}
            onOpenNote={(uuid, options) =>
              setSelection({ kind: "note", uuid, ...options })
            }
            onTreeChanged={refreshTree}
          />
        )}
      </main>
    </div>
  );
}

function PersistedNotePanel({
  areaUuid,
  noteUuid,
  archived,
  focusTitle,
  noteOptions,
  onOpenNote,
  onTreeChanged,
}: {
  areaUuid: string;
  noteUuid: string;
  archived: boolean;
  focusTitle?: boolean;
  noteOptions: FlatNote[];
  onOpenNote: (uuid: string, options?: { focusTitle?: boolean }) => void;
  onTreeChanged: () => Promise<void>;
}) {
  const noteQuery = useQuery({
    queryKey: noteKeys.detail(areaUuid, noteUuid),
    queryFn: () => areaService.note(areaUuid, noteUuid),
  });

  if (noteQuery.isLoading)
    return <Skeleton className="h-full min-h-80 rounded-xl" />;
  if (noteQuery.isError || !noteQuery.data) {
    return (
      <Card className="items-center py-12 text-center">
        <CardTitle>Could not open note</CardTitle>
        <Button variant="outline" onClick={() => noteQuery.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  const note = noteQuery.data.data;
  return (
    <NoteEditorPanel
      areaUuid={areaUuid}
      archived={archived}
      documentId={note.uuid}
      initialTitle={note.title}
      initialContent={note.content}
      initialPinned={note.is_pinned}
      focusTitle={focusTitle}
      persistedUuid={note.uuid}
      noteOptions={noteOptions}
      onCreated={() => undefined}
      onOpenNote={onOpenNote}
      onTreeChanged={onTreeChanged}
    />
  );
}

function NoteEditorPanel({
  areaUuid,
  archived,
  documentId,
  initialTitle,
  initialContent,
  initialPinned,
  focusTitle = false,
  persistedUuid,
  noteOptions,
  onCreated,
  onOpenNote,
  onTreeChanged,
}: {
  areaUuid: string;
  archived: boolean;
  documentId: string;
  initialTitle: string;
  initialContent: string;
  initialPinned: boolean;
  focusTitle?: boolean;
  persistedUuid?: string;
  noteOptions: FlatNote[];
  onCreated: (note: Note) => void;
  onOpenNote: (uuid: string, options?: { focusTitle?: boolean }) => void;
  onTreeChanged: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [activeUuid, setActiveUuid] = useState(persistedUuid);
  const uuidRef = useRef(persistedUuid);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef(initialTitle);
  const contentRef = useRef(initialContent);
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const createPromiseRef = useRef<Promise<string> | undefined>(undefined);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const flushRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!focusTitle) return;

    const frame = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus({ preventScroll: true });
      titleInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusTitle]);

  const currentInput = useCallback(
    (): NoteInput => ({
      title: titleRef.current.trim() || "Untitled",
      content: contentRef.current,
      is_pinned: initialPinned,
    }),
    [initialPinned],
  );
  const ensureNote = useCallback(
    (input: NoteInput): Promise<string> => {
      if (uuidRef.current) return Promise.resolve(uuidRef.current);
      if (createPromiseRef.current) return createPromiseRef.current;

      createPromiseRef.current = areaService
        .createNote(areaUuid, input)
        .then((response) => {
          uuidRef.current = response.data.uuid;
          queryClient.setQueryData(
            noteKeys.detail(areaUuid, response.data.uuid),
            response,
          );
          setActiveUuid(response.data.uuid);
          onCreated(response.data);
          void onTreeChanged().catch(() => undefined);
          return response.data.uuid;
        })
        .finally(() => {
          createPromiseRef.current = undefined;
        });
      return createPromiseRef.current;
    },
    [areaUuid, onCreated, onTreeChanged, queryClient],
  );
  const flush = useCallback(() => {
    if (archived || !dirtyRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const revision = revisionRef.current;
    const input = currentInput();
    const existingUuid = uuidRef.current;
    if (existingUuid) {
      queryClient.setQueryData<ApiResponse<Note>>(
        noteKeys.detail(areaUuid, existingUuid),
        (cachedNote) =>
          cachedNote
            ? {
                ...cachedNote,
                data: {
                  ...cachedNote.data,
                  title: input.title,
                  content: input.content,
                },
              }
            : cachedNote,
      );
    }
    setSaveStatus("saving");
    saveChainRef.current = saveChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const uuid = await ensureNote(input);
        const response = await areaService.updateNote(areaUuid, uuid, {
          title: input.title,
          content: input.content,
        });
        queryClient.setQueryData(noteKeys.detail(areaUuid, uuid), response);
        await onTreeChanged();
      })
      .then(() => {
        if (revisionRef.current === revision) {
          dirtyRef.current = false;
          setSaveStatus("saved");
        }
      })
      .catch(() => setSaveStatus("error"));
  }, [
    archived,
    areaUuid,
    currentInput,
    ensureNote,
    onTreeChanged,
    queryClient,
  ]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const scheduleSave = useCallback(() => {
    if (archived) return;
    revisionRef.current += 1;
    dirtyRef.current = true;
    setSaveStatus("dirty");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => flushRef.current(), 750);
  }, [archived]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (revisionRef.current > 0) flushRef.current();
    },
    [],
  );

  const editorOptions = noteOptions.filter(
    (option) => option.uuid !== activeUuid,
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4">
      <div className="relative w-full">
        <Input
          ref={titleInputRef}
          aria-label="Note title"
          className="h-auto w-full border-0 px-0 py-0 pl-13 text-2xl font-bold shadow-none focus-visible:ring-0 md:text-3xl"
          placeholder="Untitled"
          maxLength={120}
          value={title}
          readOnly={archived}
          onChange={(event) => {
            setTitle(event.target.value);
            titleRef.current = event.target.value;
            scheduleSave();
          }}
        />
        <div className="absolute top-1 right-13 text-xs text-muted-foreground">
          {archived ? (
            "Read only"
          ) : saveStatus === "saving" ? (
            "Saving…"
          ) : saveStatus === "dirty" ? (
            "Unsaved"
          ) : saveStatus === "saved" ? (
            "Saved"
          ) : saveStatus === "error" ? (
            <button
              type="button"
              className="text-destructive underline"
              onClick={flush}
            >
              Retry save
            </button>
          ) : null}
        </div>
      </div>
      <NoteRichTextEditor
        documentId={documentId}
        content={initialContent}
        editable={!archived}
        noteOptions={editorOptions}
        onChange={(content) => {
          contentRef.current = content;
          scheduleSave();
        }}
        onUploadFile={async (file) => {
          const uuid = await ensureNote(currentInput());
          const response = await areaService.uploadNoteMedia(
            areaUuid,
            uuid,
            file,
          );
          return response.data.url;
        }}
        onCreateChild={async () => {
          const parentUuid = await ensureNote(currentInput());
          const response = await areaService.createNote(areaUuid, {
            title: "Untitled",
            content: EMPTY_NOTE_DOCUMENT,
            is_pinned: false,
            parent_uuid: parentUuid,
          });
          queryClient.setQueryData(
            noteKeys.detail(areaUuid, response.data.uuid),
            response,
          );
          void onTreeChanged().catch(() => undefined);
          return { uuid: response.data.uuid, title: response.data.title };
        }}
        onOpenNote={onOpenNote}
      />
    </div>
  );
}

type FlatNote = Omit<NoteTreeNode, "children"> & { depth: number };

function flattenNotes(nodes: NoteTreeNode[], depth = 0): FlatNote[] {
  return nodes.flatMap((node) => {
    const { children, ...summary } = node;
    return [{ ...summary, depth }, ...flattenNotes(children, depth + 1)];
  });
}

function NoteTree({
  nodes,
  selectedUuid,
  archived,
  pinPending,
  deletePending,
  onSelect,
  onPin,
  onDelete,
}: {
  nodes: NoteTreeNode[];
  selectedUuid?: string;
  archived: boolean;
  pinPending: boolean;
  deletePending: boolean;
  onSelect: (uuid: string) => void;
  onPin: (node: NoteTreeNode) => void;
  onDelete: (node: NoteTreeNode) => void;
}) {
  const [expandedUuids, setExpandedUuids] = useState<Set<string>>(
    () => new Set(),
  );
  const visibleExpandedUuids = useMemo(
    () =>
      new Set([
        ...expandedUuids,
        ...findAncestorUuids(nodes, selectedUuid),
      ]),
    [expandedUuids, nodes, selectedUuid],
  );

  const updateExpandedLevel = useCallback(
    (levelNodes: NoteTreeNode[], openUuids: string[]) => {
      setExpandedUuids((current) => {
        const next = new Set(current);
        levelNodes.forEach((node) => next.delete(node.uuid));
        openUuids.forEach((uuid) => next.add(uuid));
        return next;
      });
    },
    [],
  );
  const ensureExpanded = useCallback((uuid: string) => {
    setExpandedUuids((current) => {
      if (current.has(uuid)) return current;

      const next = new Set(current);
      next.add(uuid);
      return next;
    });
  }, []);

  return (
    <NoteTreeLevel
      nodes={nodes}
      selectedUuid={selectedUuid}
      archived={archived}
      pinPending={pinPending}
      deletePending={deletePending}
      onSelect={onSelect}
      onPin={onPin}
      onDelete={onDelete}
      expandedUuids={visibleExpandedUuids}
      onExpandedChange={updateExpandedLevel}
      onEnsureExpanded={ensureExpanded}
      depth={0}
    />
  );
}

function NoteTreeLevel({
  nodes,
  selectedUuid,
  archived,
  pinPending,
  deletePending,
  onSelect,
  onPin,
  onDelete,
  expandedUuids,
  onExpandedChange,
  onEnsureExpanded,
  depth,
}: {
  nodes: NoteTreeNode[];
  selectedUuid?: string;
  archived: boolean;
  pinPending: boolean;
  deletePending: boolean;
  onSelect: (uuid: string) => void;
  onPin: (node: NoteTreeNode) => void;
  onDelete: (node: NoteTreeNode) => void;
  expandedUuids: Set<string>;
  onExpandedChange: (nodes: NoteTreeNode[], openUuids: string[]) => void;
  onEnsureExpanded: (uuid: string) => void;
  depth: number;
}) {
  const openUuids = nodes
    .filter((node) => expandedUuids.has(node.uuid))
    .map((node) => node.uuid);

  return (
    <Accordion
      multiple
      value={openUuids}
      onValueChange={(value) => onExpandedChange(nodes, value)}
      className="grid gap-3"
    >
      {nodes.map((node) => (
        <AccordionItem key={node.uuid} value={node.uuid}>
          {depth === 0 ? (
            <RootNoteCard
              node={node}
              selectedUuid={selectedUuid}
              archived={archived}
              pinPending={pinPending}
              deletePending={deletePending}
              onSelect={onSelect}
              onPin={onPin}
              onDelete={onDelete}
              expandedUuids={expandedUuids}
              onExpandedChange={onExpandedChange}
              onEnsureExpanded={onEnsureExpanded}
              depth={depth}
            />
          ) : (
            <ChildNoteRow
              node={node}
              selectedUuid={selectedUuid}
              archived={archived}
              pinPending={pinPending}
              deletePending={deletePending}
              onSelect={onSelect}
              onPin={onPin}
              onDelete={onDelete}
              expandedUuids={expandedUuids}
              onExpandedChange={onExpandedChange}
              onEnsureExpanded={onEnsureExpanded}
              depth={depth}
            />
          )}
        </AccordionItem>
      ))}
    </Accordion>
  );
}

type NoteTreeItemProps = {
  node: NoteTreeNode;
  selectedUuid?: string;
  archived: boolean;
  pinPending: boolean;
  deletePending: boolean;
  onSelect: (uuid: string) => void;
  onPin: (node: NoteTreeNode) => void;
  onDelete: (node: NoteTreeNode) => void;
  expandedUuids: Set<string>;
  onExpandedChange: (nodes: NoteTreeNode[], openUuids: string[]) => void;
  onEnsureExpanded: (uuid: string) => void;
  depth: number;
};

function RootNoteCard({
  node,
  selectedUuid,
  archived,
  pinPending,
  deletePending,
  onSelect,
  onPin,
  onDelete,
  expandedUuids,
  onExpandedChange,
  onEnsureExpanded,
  depth,
}: NoteTreeItemProps) {
  const hasChildren = node.children.length > 0;

  return (
    <Card
      size="sm"
      className={cn(
        "group/note relative min-w-0 gap-0 rounded-lg py-0 shadow-none ring-1 ring-border/90 transition-[background-color,box-shadow] duration-150 hover:bg-muted/25 hover:shadow-xs hover:ring-foreground/15 focus-within:ring-2 focus-within:ring-ring/35",
        selectedUuid === node.uuid &&
          "bg-accent/60 shadow-xs ring-foreground/20 hover:bg-accent/70 hover:ring-foreground/25",
      )}
    >
      <div className="relative min-w-0">
        <button
          type="button"
          aria-current={selectedUuid === node.uuid ? "page" : undefined}
          className="w-full min-w-0 px-3 py-3 text-left"
          onClick={() => {
            onSelect(node.uuid);
            if (hasChildren) onEnsureExpanded(node.uuid);
          }}
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-2",
              archived
                ? hasChildren
                  ? "pr-10"
                  : "pr-0"
                : hasChildren
                  ? "pr-28"
                  : "pr-20",
            )}
          >
            {node.is_pinned ? (
              <Pin className="size-3.5 shrink-0" />
            ) : (
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {node.title || "Untitled"}
            </span>
          </span>
          <span className="mt-1.5 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
            {getNoteDocumentPreview(node.content) || "No content yet"}
          </span>
          <time
            dateTime={node.updated_at}
            className="mt-2 block truncate text-[0.6875rem] font-medium text-muted-foreground/80"
          >
            {formatNoteTimestamp(node.updated_at)}
          </time>
        </button>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {!archived && (
            <NoteActions
              node={node}
              pinPending={pinPending}
              deletePending={deletePending}
              onPin={onPin}
              onDelete={onDelete}
              className="hidden group-hover/note:flex"
            />
          )}
          {hasChildren && (
            <AccordionHeader>
              <AccordionTrigger aria-label={`Toggle ${node.title || "Untitled"} child pages`} />
            </AccordionHeader>
          )}
        </div>
      </div>
      {hasChildren && (
        <AccordionContent>
          <div className="border-t border-border/60 bg-muted/15 p-2">
            <NoteTreeLevel
              nodes={node.children}
              selectedUuid={selectedUuid}
              archived={archived}
              pinPending={pinPending}
              deletePending={deletePending}
              onSelect={onSelect}
              onPin={onPin}
              onDelete={onDelete}
              expandedUuids={expandedUuids}
              onExpandedChange={onExpandedChange}
              onEnsureExpanded={onEnsureExpanded}
              depth={depth + 1}
            />
          </div>
        </AccordionContent>
      )}
    </Card>
  );
}

function ChildNoteRow({
  node,
  selectedUuid,
  archived,
  pinPending,
  deletePending,
  onSelect,
  onPin,
  onDelete,
  expandedUuids,
  onExpandedChange,
  onEnsureExpanded,
  depth,
}: NoteTreeItemProps) {
  const hasChildren = node.children.length > 0;

  return (
    <div className="min-w-0">
      <div
        className={cn(
          "group/child relative flex min-w-0 items-center rounded-md ring-1 ring-transparent transition-[background-color,box-shadow,color] duration-150 hover:bg-muted/50 hover:ring-border/80 active:bg-accent/70 focus-within:bg-muted/50 focus-within:ring-ring/30",
          selectedUuid === node.uuid &&
            "bg-accent/60 text-accent-foreground ring-foreground/15 hover:bg-accent/70 hover:ring-foreground/20",
        )}
      >
        <button
          type="button"
          aria-current={selectedUuid === node.uuid ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-2 text-left",
            hasChildren ? "pr-10" : "pr-2",
          )}
          onClick={() => {
            onSelect(node.uuid);
            if (hasChildren) onEnsureExpanded(node.uuid);
          }}
        >
          {node.is_pinned ? (
            <Pin className="size-3.5 shrink-0" />
          ) : (
            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {node.title || "Untitled"}
          </span>
          <time
            dateTime={node.updated_at}
            className="max-w-24 shrink-0 truncate text-[0.6875rem] font-medium text-muted-foreground/80"
          >
            {formatNoteTimestamp(node.updated_at)}
          </time>
        </button>
        {!archived && (
          <NoteActions
            node={node}
            pinPending={pinPending}
            deletePending={deletePending}
            onPin={onPin}
            onDelete={onDelete}
            className={cn(
              "absolute top-1/2 hidden -translate-y-1/2 bg-card/95 group-hover/child:flex",
              hasChildren ? "right-9" : "right-1",
            )}
          />
        )}
        {hasChildren && (
          <AccordionHeader className="absolute top-1/2 right-1 -translate-y-1/2">
            <AccordionTrigger aria-label={`Toggle ${node.title || "Untitled"} child pages`} />
          </AccordionHeader>
        )}
      </div>
      {hasChildren && (
        <AccordionContent>
          <div className="ml-3 border-l border-border/60 py-1 pl-2">
            <NoteTreeLevel
              nodes={node.children}
              selectedUuid={selectedUuid}
              archived={archived}
              pinPending={pinPending}
              deletePending={deletePending}
              onSelect={onSelect}
              onPin={onPin}
              onDelete={onDelete}
              expandedUuids={expandedUuids}
              onExpandedChange={onExpandedChange}
              onEnsureExpanded={onEnsureExpanded}
              depth={depth + 1}
            />
          </div>
        </AccordionContent>
      )}
    </div>
  );
}

function NoteActions({
  node,
  pinPending,
  deletePending,
  onPin,
  onDelete,
  className,
}: {
  node: NoteTreeNode;
  pinPending: boolean;
  deletePending: boolean;
  onPin: (node: NoteTreeNode) => void;
  onDelete: (node: NoteTreeNode) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 items-center rounded-md bg-card/95 p-0.5 shadow-none ring-1 ring-border/80",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={node.is_pinned ? "Unpin note" : "Pin note"}
        disabled={pinPending}
        onClick={() => onPin(node)}
      >
        {node.is_pinned ? <PinOff /> : <Pin />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete note"
        disabled={deletePending}
        onClick={() => onDelete(node)}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function findAncestorUuids(nodes: NoteTreeNode[], selectedUuid?: string) {
  if (!selectedUuid) return [];

  const ancestors: string[] = [];
  const containsSelection = (node: NoteTreeNode): boolean => {
    if (node.uuid === selectedUuid) return true;

    if (node.children.some(containsSelection)) {
      ancestors.push(node.uuid);
      return true;
    }

    return false;
  };

  nodes.some(containsSelection);
  return ancestors;
}

function formatNoteTimestamp(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dayDifference = calendarDayDifference(now, date);
  if (dayDifference === 0) {
    const time = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
    return `Today ${time}`;
  }

  if (dayDifference >= 1 && dayDifference <= 7) {
    return `${dayDifference} ${dayDifference === 1 ? "day" : "days"} ago`;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

function calendarDayDifference(later: Date, earlier: Date) {
  const laterDay = Date.UTC(
    later.getFullYear(),
    later.getMonth(),
    later.getDate(),
  );
  const earlierDay = Date.UTC(
    earlier.getFullYear(),
    earlier.getMonth(),
    earlier.getDate(),
  );

  return Math.round((laterDay - earlierDay) / 86_400_000);
}
