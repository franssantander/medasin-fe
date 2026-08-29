"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pin, PinOff, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EMPTY_NOTE_DOCUMENT } from "@/components/ui/note-editor-document";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { areaService } from "../services/area-service";
import type { Note, NoteInput, NoteTreeNode } from "../type";

const noteKeys = {
  tree: (areaUuid: string) =>
    ["areas", "detail", areaUuid, "notes", "tree"] as const,
  detail: (areaUuid: string, noteUuid: string) =>
    ["areas", "detail", areaUuid, "notes", noteUuid] as const,
};

type NoteSelection =
  | { kind: "note"; uuid: string }
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
    return <Skeleton className="min-h-[44rem] flex-1 rounded-xl" />;
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
    <div className="grid min-h-[44rem] min-w-0 flex-1 overflow-hidden rounded-xl border bg-card md:grid-cols-[17rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
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
        <div className="max-h-64 min-w-0 overflow-x-hidden overflow-y-auto p-2 md:max-h-none md:flex-1">
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
      <main className="min-h-0 min-w-0 overflow-hidden bg-white p-4 sm:p-6">
        {derivedSelection.kind === "note" ? (
          <PersistedNotePanel
            key={derivedSelection.uuid}
            areaUuid={areaUuid}
            noteUuid={derivedSelection.uuid}
            archived={archived}
            noteOptions={flatNotes}
            onOpenNote={(uuid) => setSelection({ kind: "note", uuid })}
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
            onOpenNote={(uuid) => setSelection({ kind: "note", uuid })}
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
  noteOptions,
  onOpenNote,
  onTreeChanged,
}: {
  areaUuid: string;
  noteUuid: string;
  archived: boolean;
  noteOptions: FlatNote[];
  onOpenNote: (uuid: string) => void;
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
  persistedUuid?: string;
  noteOptions: FlatNote[];
  onCreated: (note: Note) => void;
  onOpenNote: (uuid: string) => void;
  onTreeChanged: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [activeUuid, setActiveUuid] = useState(persistedUuid);
  const uuidRef = useRef(persistedUuid);
  const titleRef = useRef(initialTitle);
  const contentRef = useRef(initialContent);
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const createPromiseRef = useRef<Promise<string> | undefined>(undefined);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const flushRef = useRef<() => void>(() => undefined);

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
        .then(async (response) => {
          uuidRef.current = response.data.uuid;
          setActiveUuid(response.data.uuid);
          onCreated(response.data);
          await onTreeChanged();
          return response.data.uuid;
        })
        .finally(() => {
          createPromiseRef.current = undefined;
        });
      return createPromiseRef.current;
    },
    [areaUuid, onCreated, onTreeChanged],
  );
  const flush = useCallback(() => {
    if (archived || !dirtyRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const revision = revisionRef.current;
    const input = currentInput();
    setSaveStatus("saving");
    saveChainRef.current = saveChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const uuid = await ensureNote(input);
        await areaService.updateNote(areaUuid, uuid, {
          title: input.title,
          content: input.content,
        });
        await onTreeChanged();
      })
      .then(() => {
        if (revisionRef.current === revision) {
          dirtyRef.current = false;
          setSaveStatus("saved");
        }
      })
      .catch(() => setSaveStatus("error"));
  }, [archived, areaUuid, currentInput, ensureNote, onTreeChanged]);

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
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="relative w-full">
        <Input
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
          await onTreeChanged();
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
  depth = 0,
}: {
  nodes: NoteTreeNode[];
  selectedUuid?: string;
  archived: boolean;
  pinPending: boolean;
  deletePending: boolean;
  onSelect: (uuid: string) => void;
  onPin: (node: NoteTreeNode) => void;
  onDelete: (node: NoteTreeNode) => void;
  depth?: number;
}) {
  return (
    <div className="grid min-w-0 gap-0.5 overflow-hidden">
      {nodes.map((node) => (
        <div key={node.uuid} className="min-w-0 overflow-hidden">
          <div
            className={cn(
              "group flex min-w-0 max-w-full items-center overflow-hidden rounded-md pr-1",
              selectedUuid === node.uuid && "bg-accent text-accent-foreground",
            )}
            style={{ paddingLeft: `${depth * 0.75}rem` }}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm"
              onClick={() => onSelect(node.uuid)}
            >
              {node.is_pinned ? (
                <Pin className="size-3.5 shrink-0" />
              ) : (
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {node.title || "Untitled"}
              </span>
            </button>
            {!archived && (
              <div className="hidden shrink-0 items-center group-hover:flex group-focus-within:flex">
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
            )}
          </div>
          {node.children.length > 0 && (
            <NoteTree
              nodes={node.children}
              selectedUuid={selectedUuid}
              archived={archived}
              pinPending={pinPending}
              deletePending={deletePending}
              onSelect={onSelect}
              onPin={onPin}
              onDelete={onDelete}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}
