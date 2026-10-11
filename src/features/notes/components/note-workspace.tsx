"use client";

// Shared note workspace used by standalone Notes and Areas.

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  FileText,
  LoaderCircle,
  PanelLeft,
  PanelLeftOpen,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { EMPTY_NOTE_DOCUMENT } from "@/components/ui/note-editor-document";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import type {
  NoteEditorHistoryState,
  NoteRichTextEditorControls,
} from "@/components/ui/note-rich-text-editor-client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { parseApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";
import {
  buildNotePath,
  countChildNotes,
  findNoteNode,
  flattenNotes,
  formatNoteTimestamp,
  type FlatNote,
} from "../note-tree-utils";
import type {
  NoteApiResponse,
  Note,
  NoteInput,
  NoteMedia,
  NoteTreeNode,
  NoteWorkspaceCollection,
  NoteWorkspaceQueryKeys,
  NoteWorkspaceService,
} from "../type";
import { NoteListRail } from "./note-list-rail";
import { NotePageSidebar } from "./note-page-sidebar";
import {
  NotePageTopbar,
  type NotePageMenu,
  type NoteSaveStatus,
} from "./note-page-topbar";

const MAX_NOTE_MEDIA_REQUEST_BYTES = 8 * 1024 * 1024;

type NoteSelection =
  | {
      kind: "note";
      uuid: string;
      collectionKey: string;
      focusTitle?: boolean;
    }
  | {
      kind: "draft";
      key: number;
      collectionKey: string;
      uuid?: string;
    };

type NoteToDelete = {
  node: NoteTreeNode;
  collectionKey: string;
};

type NoteCollectionState = NoteWorkspaceCollection & {
  tree: NoteTreeNode[];
  flatNotes: FlatNote[];
};

type NoteWorkspacePresentation = "standard" | "journal";

type StandardChrome = {
  leading: ReactNode;
  rootLabel: string;
  menuFor: (uuid: string) => NotePageMenu | undefined;
};

const SIDEBAR_STORAGE_KEY = "medasin.notes.sidebar";
const NOTES_LIST_STORAGE_KEY = "medasin.notes.list";
const sidebarListeners = new Set<() => void>();

function readStoredOpen(key: string) {
  try {
    return window.localStorage.getItem(key) !== "closed";
  } catch {
    return true;
  }
}

const readPageSidebarOpen = () => readStoredOpen(SIDEBAR_STORAGE_KEY);
const readNotesListOpen = () => readStoredOpen(NOTES_LIST_STORAGE_KEY);

function subscribeToSidebar(listener: () => void) {
  sidebarListeners.add(listener);
  return () => {
    sidebarListeners.delete(listener);
  };
}

function storeSidebarOpen(key: string, open: boolean) {
  try {
    window.localStorage.setItem(key, open ? "open" : "closed");
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  sidebarListeners.forEach((listener) => listener());
}

export function NoteWorkspace({
  collections,
  initialNoteUuid,
  presentation = "standard",
}: {
  collections: NoteWorkspaceCollection[];
  initialNoteUuid?: string;
  presentation?: NoteWorkspacePresentation;
}) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<NoteSelection>();
  const [noteToDelete, setNoteToDelete] = useState<NoteToDelete>();
  const [pagesSheetOpen, setPagesSheetOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(0);
  const journal = presentation === "journal";
  const sidebarOpen = useSyncExternalStore(
    subscribeToSidebar,
    journal ? readNotesListOpen : readPageSidebarOpen,
    () => true,
  );
  const treeQueries = useQueries({
    queries: collections.map((collection) => ({
      queryKey: collection.queryKeys.tree,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        collection.service.tree(signal),
      refetchOnMount: "always" as const,
      refetchOnWindowFocus: true,
    })),
  });
  const collectionStates = useMemo<NoteCollectionState[]>(
    () =>
      collections.map((collection, index) => {
        const tree = treeQueries[index]?.data?.data ?? [];
        return {
          ...collection,
          tree,
          flatNotes: flattenNotes(tree),
        };
      }),
    [collections, treeQueries],
  );
  const collectionByKey = useMemo(
    () => new Map(collectionStates.map((collection) => [collection.key, collection])),
    [collectionStates],
  );
  const createCollection = collections.find((collection) => collection.canCreate);
  const initialCollection = initialNoteUuid
    ? collectionStates.find((collection) =>
        collection.flatNotes.some((note) => note.uuid === initialNoteUuid),
      )
    : undefined;
  const firstNoteCollection = collectionStates.find(
    (collection) => collection.flatNotes.length > 0,
  );
  const fallbackCollection = collections[0];
  const derivedSelection: NoteSelection =
    selection ??
    (initialCollection && initialNoteUuid
      ? {
          kind: "note",
          uuid: initialNoteUuid,
          collectionKey: initialCollection.key,
        }
      : firstNoteCollection
      ? {
          kind: "note",
          uuid: firstNoteCollection.flatNotes[0].uuid,
          collectionKey: firstNoteCollection.key,
        }
      : {
          kind: "draft",
          key: draftKey,
          collectionKey: createCollection?.key ?? fallbackCollection?.key ?? "",
        });
  const selectedUuid = derivedSelection.uuid;
  const selectedCollection = collectionByKey.get(
    derivedSelection.collectionKey,
  );
  const selectedNotes = selectedCollection?.flatNotes ?? [];

  const refreshTree = useCallback(
    async (collectionKey: string) => {
      const collection = collectionByKey.get(collectionKey);
      if (!collection) return;

      await queryClient.invalidateQueries({
        queryKey: collection.queryKeys.tree,
      });
    },
    [collectionByKey, queryClient],
  );
  const pinMutation = useMutation({
    mutationFn: ({
      collectionKey,
      uuid,
      pinned,
    }: {
      collectionKey: string;
      uuid: string;
      pinned: boolean;
    }) => {
      const collection = collectionByKey.get(collectionKey);
      if (!collection) throw new Error("Note collection is unavailable.");

      return collection.service.update(uuid, { is_pinned: pinned });
    },
    onSuccess: async (_, variables) => refreshTree(variables.collectionKey),
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });
  const deleteMutation = useMutation({
    mutationFn: ({
      collectionKey,
      uuid,
    }: {
      collectionKey: string;
      uuid: string;
      deletedUuids: string[];
    }) => {
      const collection = collectionByKey.get(collectionKey);
      if (!collection) throw new Error("Note collection is unavailable.");

      return collection.service.remove(uuid);
    },
    onSuccess: async (response, variables) => {
      if (
        selectedUuid &&
        derivedSelection.collectionKey === variables.collectionKey &&
        variables.deletedUuids.includes(selectedUuid)
      ) {
        setSelection(undefined);
      }
      await refreshTree(variables.collectionKey);
      setNoteToDelete(undefined);
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });
  const createChildMutation = useMutation({
    mutationFn: ({
      collectionKey,
      parentUuid,
    }: {
      collectionKey: string;
      parentUuid: string;
    }) => {
      const collection = collectionByKey.get(collectionKey);
      if (!collection) throw new Error("Note collection is unavailable.");

      return collection.service.create({
        title: "Untitled",
        content: EMPTY_NOTE_DOCUMENT,
        is_pinned: false,
        parent_uuid: parentUuid,
      });
    },
    onSuccess: async (response, variables) => {
      const collection = collectionByKey.get(variables.collectionKey);
      if (collection) {
        queryClient.setQueryData(
          collection.queryKeys.detail(response.data.uuid),
          response,
        );
      }
      await refreshTree(variables.collectionKey).catch(() => undefined);
      setPagesSheetOpen(false);
      setSelection({
        kind: "note",
        uuid: response.data.uuid,
        collectionKey: variables.collectionKey,
        focusTitle: true,
      });
    },
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });

  const isTreeLoading = treeQueries.some((query) => query.isLoading);
  const treeError = treeQueries.find((query) => query.isError);

  const startDraft = () => {
    if (!createCollection) return;

    const nextKey = draftKey + 1;
    setDraftKey(nextKey);
    setSelection({
      kind: "draft",
      key: nextKey,
      collectionKey: createCollection.key,
    });
  };

  if (isTreeLoading) {
    return journal ? <NoteListSkeleton /> : <NotePagesSkeleton />;
  }

  if (treeError || !selectedCollection) {
    return (
      <Empty className="h-full flex-1 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>
            {treeError ? "Couldn’t load notes" : "No notes available"}
          </EmptyTitle>
          <EmptyDescription>
            {treeError?.error instanceof Error
              ? treeError.error.message
              : "Check your connection and try again."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            onClick={() => {
              void Promise.all(treeQueries.map((query) => query.refetch()));
            }}
          >
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const deleteTitle = noteToDelete?.node.title || "Untitled";
  const deleteDialog = (
    <AlertDialog
      open={Boolean(noteToDelete)}
      onOpenChange={(open) => {
        if (!open && !deleteMutation.isPending) setNoteToDelete(undefined);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{deleteTitle}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {noteToDelete?.node.children.length
              ? "This page and all of its sub-pages will move to Trash for 30 days and can be restored together."
              : "This page will move to Trash for 30 days and can be restored from Settings."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteMutation.isPending || !noteToDelete}
            onClick={() => {
              if (!noteToDelete) return;

              deleteMutation.mutate({
                collectionKey: noteToDelete.collectionKey,
                uuid: noteToDelete.node.uuid,
                deletedUuids: flattenNotes([noteToDelete.node]).map(
                  (note) => note.uuid,
                ),
              });
            }}
          >
            {deleteMutation.isPending && (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            )}
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const collection = selectedCollection;
  const editable = !collection.archived;
  const requestDelete = (collectionKey: string, uuid: string) => {
    const tree = collectionByKey.get(collectionKey)?.tree ?? [];
    const node = findNoteNode(tree, uuid);
    if (node) setNoteToDelete({ node, collectionKey });
  };
  const addChild = (collectionKey: string, parentUuid: string) =>
    createChildMutation.mutate({ collectionKey, parentUuid });
  const pin = (collectionKey: string, uuid: string, pinned: boolean) =>
    pinMutation.mutate({ collectionKey, uuid, pinned });
  const openNote = (
    collectionKey: string,
    uuid: string,
    options?: { focusTitle?: boolean },
  ) => {
    setPagesSheetOpen(false);
    setSelection({ kind: "note", uuid, collectionKey, ...options });
  };
  const openInCollection = (
    uuid: string,
    options?: { focusTitle?: boolean },
  ) => openNote(collection.key, uuid, options);
  const newNote = () => {
    setPagesSheetOpen(false);
    startDraft();
  };
  const setSidebarOpen = (open: boolean) =>
    storeSidebarOpen(
      journal ? NOTES_LIST_STORAGE_KEY : SIDEBAR_STORAGE_KEY,
      open,
    );

  // Notes lists every collection by time; Areas browse one page tree.
  const sidebar = (inSheet: boolean) =>
    journal ? (
      <NoteListRail
        collections={collectionStates.map((item, index) => ({
          key: item.key,
          label: item.label,
          archived: item.archived,
          showLabel: index > 0,
          tree: item.tree,
          flatNotes: item.flatNotes,
        }))}
        selectedCollectionKey={collection.key}
        selectedUuid={selectedUuid}
        createPending={createChildMutation.isPending}
        onNew={createCollection ? newNote : undefined}
        onCollapse={inSheet ? undefined : () => setSidebarOpen(false)}
        onSelect={(collectionKey, uuid) => openNote(collectionKey, uuid)}
        onAddChild={addChild}
        onPin={pin}
        onDelete={requestDelete}
      />
    ) : (
      <NotePageSidebar
        tree={collection.tree}
        flatNotes={collection.flatNotes}
        selectedUuid={selectedUuid}
        archived={collection.archived}
        canCreate={collection.canCreate}
        createPending={createChildMutation.isPending}
        onNewPage={newNote}
        onSelect={(uuid) => openInCollection(uuid)}
        onAddChild={(uuid) => addChild(collection.key, uuid)}
        onPin={(uuid, pinned) => pin(collection.key, uuid, pinned)}
        onDelete={(uuid) => requestDelete(collection.key, uuid)}
        onCollapse={inSheet ? undefined : () => setSidebarOpen(false)}
      />
    );
  const chrome: StandardChrome = {
    rootLabel: collection.label,
    leading: (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label={journal ? "Show notes" : "Show pages"}
          onClick={() => setPagesSheetOpen(true)}
        >
          <PanelLeft />
        </Button>
        {!sidebarOpen && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden md:inline-flex"
            aria-label={journal ? "Open notes list" : "Expand sidebar"}
            title={journal ? "Open notes list" : "Expand sidebar"}
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeftOpen />
          </Button>
        )}
      </>
    ),
    menuFor: (uuid) => {
      if (!editable) return undefined;
      const note = collection.flatNotes.find((item) => item.uuid === uuid);
      if (!note) return undefined;
      return {
        pinned: note.is_pinned,
        createPending: createChildMutation.isPending,
        onAddChild: () => addChild(collection.key, uuid),
        onPin: () => pin(collection.key, uuid, !note.is_pinned),
        onDelete: () => requestDelete(collection.key, uuid),
      };
    },
  };

  return (
    <div
      className={cn(
        "grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card",
        sidebarOpen &&
          (journal
            ? "md:grid-cols-[20rem_minmax(0,1fr)]"
            : "md:grid-cols-[16rem_minmax(0,1fr)]"),
      )}
    >
      {sidebarOpen && (
        <aside
          aria-label={journal ? "Notes sidebar" : "Pages sidebar"}
          className="hidden min-h-0 min-w-0 border-r bg-muted/30 md:block"
        >
          {sidebar(false)}
        </aside>
      )}
      <Sheet open={pagesSheetOpen} onOpenChange={setPagesSheetOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className={cn("gap-0 p-0", journal ? "w-80" : "w-72")}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{journal ? "Notes" : "Pages"}</SheetTitle>
            <SheetDescription>
              {journal
                ? "Browse and organize your notes."
                : "Browse and organize this area’s pages."}
            </SheetDescription>
          </SheetHeader>
          {sidebar(true)}
        </SheetContent>
      </Sheet>
      <main aria-label="Note editor" className="flex min-h-0 min-w-0 flex-col">
        {derivedSelection.kind === "note" ? (
          <PersistedNotePanel
            key={`${collection.key}:${derivedSelection.uuid}`}
            service={collection.service}
            queryKeys={collection.queryKeys}
            noteUuid={derivedSelection.uuid}
            archived={collection.archived}
            focusTitle={derivedSelection.focusTitle}
            noteOptions={selectedNotes}
            chrome={chrome}
            onOpenNote={openInCollection}
            onTreeChanged={() => refreshTree(collection.key)}
          />
        ) : (
          <NoteEditorPanel
            key={`draft-${derivedSelection.collectionKey}-${derivedSelection.key}`}
            service={collection.service}
            queryKeys={collection.queryKeys}
            archived={collection.archived}
            documentId={`draft-${derivedSelection.collectionKey}-${derivedSelection.key}`}
            initialTitle=""
            initialContent={EMPTY_NOTE_DOCUMENT}
            initialPinned={false}
            focusTitle={derivedSelection.key > 0}
            persistedUuid={derivedSelection.uuid}
            noteOptions={selectedNotes}
            chrome={chrome}
            onCreated={(note) => {
              setSelection((current) =>
                current?.kind === "draft" &&
                current.collectionKey === collection.key
                  ? { ...current, uuid: note.uuid }
                  : {
                      kind: "draft",
                      key: derivedSelection.key,
                      collectionKey: collection.key,
                      uuid: note.uuid,
                    },
              );
            }}
            onOpenNote={openInCollection}
            onTreeChanged={() => refreshTree(collection.key)}
          />
        )}
      </main>
      {deleteDialog}
    </div>
  );
}

function PersistedNotePanel({
  service,
  queryKeys,
  noteUuid,
  archived,
  focusTitle,
  noteOptions,
  chrome,
  onOpenNote,
  onTreeChanged,
}: {
  service: NoteWorkspaceService;
  queryKeys: NoteWorkspaceQueryKeys;
  noteUuid: string;
  archived: boolean;
  focusTitle?: boolean;
  noteOptions: FlatNote[];
  chrome: StandardChrome;
  onOpenNote: (uuid: string, options?: { focusTitle?: boolean }) => void;
  onTreeChanged: () => Promise<void>;
}) {
  const noteQuery = useQuery({
    queryKey: queryKeys.detail(noteUuid),
    queryFn: ({ signal }) => service.show(noteUuid, signal),
  });

  if (noteQuery.isLoading) {
    return (
      <>
        <NotePageTopbarSkeleton leading={chrome.leading} />
        <NoteDocumentSkeleton />
      </>
    );
  }
  if (noteQuery.isError || !noteQuery.data) {
    return (
      <>
        <NotePageTopbarSkeleton leading={chrome.leading} />
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>Couldn&apos;t open this page</EmptyTitle>
            <EmptyDescription>
              It may have been deleted, or the connection dropped.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => void noteQuery.refetch()}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      </>
    );
  }
  const note = noteQuery.data.data;
  return (
    <NoteEditorPanel
      service={service}
      queryKeys={queryKeys}
      archived={archived}
      documentId={note.uuid}
      initialTitle={note.title}
      initialContent={note.content}
      initialPinned={note.is_pinned}
      focusTitle={focusTitle}
      persistedUuid={note.uuid}
      noteOptions={noteOptions}
      chrome={chrome}
      onCreated={() => undefined}
      onOpenNote={onOpenNote}
      onTreeChanged={onTreeChanged}
    />
  );
}

function NoteEditorPanel({
  service,
  queryKeys,
  archived,
  documentId,
  initialTitle,
  initialContent,
  initialPinned,
  focusTitle = false,
  persistedUuid,
  noteOptions,
  chrome,
  onCreated,
  onOpenNote,
  onTreeChanged,
}: {
  service: NoteWorkspaceService;
  queryKeys: NoteWorkspaceQueryKeys;
  archived: boolean;
  documentId: string;
  initialTitle: string;
  initialContent: string;
  initialPinned: boolean;
  focusTitle?: boolean;
  persistedUuid?: string;
  noteOptions: FlatNote[];
  chrome: StandardChrome;
  onCreated: (note: Note) => void;
  onOpenNote: (uuid: string, options?: { focusTitle?: boolean }) => void;
  onTreeChanged: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>("idle");
  const [activeUuid, setActiveUuid] = useState(persistedUuid);
  const [historyState, setHistoryState] = useState<NoteEditorHistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const uuidRef = useRef(persistedUuid);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorControlsRef = useRef<NoteRichTextEditorControls | null>(null);
  const pendingEditorFocusRef = useRef(false);
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

      createPromiseRef.current = service
        .create(input)
        .then((response) => {
          uuidRef.current = response.data.uuid;
          queryClient.setQueryData(
            queryKeys.detail(response.data.uuid),
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
    [onCreated, onTreeChanged, queryClient, queryKeys, service],
  );
  const flush = useCallback(() => {
    if (archived || !dirtyRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const revision = revisionRef.current;
    const input = currentInput();
    const existingUuid = uuidRef.current;
    if (existingUuid) {
      queryClient.setQueryData<NoteApiResponse<Note>>(
        queryKeys.detail(existingUuid),
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
        const response = await service.update(uuid, {
          title: input.title,
          content: input.content,
        });
        queryClient.setQueryData(queryKeys.detail(uuid), response);
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
    currentInput,
    ensureNote,
    onTreeChanged,
    queryClient,
    queryKeys,
    service,
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
  const notePath = useMemo(
    () => buildNotePath(noteOptions, activeUuid),
    [activeUuid, noteOptions],
  );
  const handleEditorReady = useCallback(
    (controls: NoteRichTextEditorControls | null) => {
      editorControlsRef.current = controls;
      if (!controls || !pendingEditorFocusRef.current) return;

      pendingEditorFocusRef.current = false;
      controls.focusFirstBlock();
    },
    [],
  );

  const editor = (
    <NoteRichTextEditor
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      formattingToolbarMode="floating"
      documentId={documentId}
      content={initialContent}
      editable={!archived}
      noteOptions={editorOptions}
      onEditorReady={handleEditorReady}
      onHistoryStateChange={setHistoryState}
      onChange={(content) => {
        contentRef.current = content;
        scheduleSave();
      }}
      onUploadFile={async (file) => {
        try {
          if (file.size >= MAX_NOTE_MEDIA_REQUEST_BYTES) {
            const mediaType = file.type.startsWith("image/")
              ? "Images"
              : "Files";
            throw new Error(`${mediaType} must be smaller than 8 MB.`);
          }

          const uuid = await ensureNote(currentInput());
          const response = await service.uploadMedia(uuid, file);
          const uploadResponse = response as
            | NoteApiResponse<NoteMedia>
            | NoteMedia
            | undefined;
          const media =
            uploadResponse && "data" in uploadResponse
              ? uploadResponse.data
              : uploadResponse;

          if (!media?.url) {
            throw new Error("The upload response did not include a media URL.");
          }

          return media.url;
        } catch (error) {
          const uploadError = parseApiError(error);
          const description = uploadError.message.includes(
            "POST Content-Length",
          )
            ? `${file.type.startsWith("image/") ? "Images" : "Files"} must be smaller than 8 MB.`
            : uploadError.message;
          toast.add({ type: "error", description });
          throw uploadError;
        }
      }}
      onCreateChild={async () => {
        const parentUuid = await ensureNote(currentInput());
        const response = await service.create({
          title: "Untitled",
          content: EMPTY_NOTE_DOCUMENT,
          is_pinned: false,
          parent_uuid: parentUuid,
        });
        queryClient.setQueryData(
          queryKeys.detail(response.data.uuid),
          response,
        );
        void onTreeChanged().catch(() => undefined);
        return { uuid: response.data.uuid, title: response.data.title };
      }}
      onOpenNote={onOpenNote}
    />
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    titleRef.current = value;
    scheduleSave();
  };
  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (archived || event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    const controls = editorControlsRef.current;
    if (controls) {
      controls.focusFirstBlock();
    } else {
      pendingEditorFocusRef.current = true;
    }
  };

  const activeNote = noteOptions.find((note) => note.uuid === activeUuid);
  const childCount = countChildNotes(noteOptions, activeUuid);
  const meta = [
    activeNote
      ? `Edited ${formatNoteTimestamp(activeNote.updated_at)}`
      : "New page",
    childCount > 0 &&
      `${childCount} ${childCount === 1 ? "sub-page" : "sub-pages"}`,
    !archived && "Type / for blocks",
  ].filter(Boolean);

  return (
    <>
      <NotePageTopbar
        leading={chrome.leading}
        rootLabel={chrome.rootLabel}
        ancestors={notePath.slice(0, -1)}
        currentTitle={title}
        onOpenNote={(uuid) => onOpenNote(uuid)}
        archived={archived}
        saveStatus={saveStatus}
        onRetrySave={flush}
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        onUndo={() => editorControlsRef.current?.undo()}
        onRedo={() => editorControlsRef.current?.redo()}
        menu={activeUuid ? chrome.menuFor(activeUuid) : undefined}
      />
      <div className="workspace-list-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="notes-page-header">
          <Input
            ref={titleInputRef}
            aria-label="Note title"
            className="h-auto rounded-none border-0 bg-transparent px-0 py-1 text-3xl font-bold tracking-tight shadow-none focus-visible:ring-0 md:text-4xl dark:bg-transparent"
            placeholder="Untitled"
            maxLength={120}
            value={title}
            readOnly={archived}
            onChange={(event) => handleTitleChange(event.target.value)}
            onKeyDown={handleTitleKeyDown}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {meta.join(" · ")}
          </p>
        </div>
        <div className="notes-writing-canvas notes-page-canvas">{editor}</div>
      </div>
    </>
  );
}

function NotePageTopbarSkeleton({ leading }: { leading?: ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
      {leading}
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

function NoteDocumentSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="notes-page-header grid gap-3"
    >
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-3 w-40" />
      <div className="mt-6 grid gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function NotePagesSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading notes"
      className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-cols-[16rem_minmax(0,1fr)]"
    >
      <div className="hidden gap-2 border-r bg-muted/30 p-3 md:grid md:content-start">
        <Skeleton className="mb-2 h-5 w-20" />
        <Skeleton className="mb-2 h-8 w-full" />
        {[85, 70, 90, 60, 75, 65].map((width) => (
          <Skeleton key={width} className="h-6" style={{ width: `${width}%` }} />
        ))}
      </div>
      <div className="flex min-h-0 flex-col">
        <NotePageTopbarSkeleton />
        <NoteDocumentSkeleton />
      </div>
    </div>
  );
}

function NoteListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading notes"
      className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-cols-[20rem_minmax(0,1fr)]"
    >
      <div className="hidden content-start gap-3 border-r bg-muted/30 px-3 pt-4 md:grid">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="size-7 rounded-md" />
        </div>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="mt-2 ml-2 h-3 w-14" />
        {["w-32", "w-44", "w-28", "w-40", "w-36"].map((width) => (
          <div key={width} className="grid gap-2 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className={cn("h-3.5", width)} />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-col">
        <NotePageTopbarSkeleton />
        <NoteDocumentSkeleton />
      </div>
    </div>
  );
}
