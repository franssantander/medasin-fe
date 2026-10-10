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
  ChevronRight,
  Ellipsis,
  FileText,
  Folder,
  LoaderCircle,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  Plus,
  Redo2,
  RefreshCw,
  Trash2,
  Undo2,
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
import PageHeader from "@/components/shared/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  EMPTY_NOTE_DOCUMENT,
  getNoteDocumentPreview,
} from "@/components/ui/note-editor-document";
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
  findAncestorUuids,
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
const sidebarListeners = new Set<() => void>();

function readSidebarOpen() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "closed";
  } catch {
    return true;
  }
}

function subscribeToSidebar(listener: () => void) {
  sidebarListeners.add(listener);
  return () => {
    sidebarListeners.delete(listener);
  };
}

function storeSidebarOpen(open: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? "open" : "closed");
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  sidebarListeners.forEach((listener) => listener());
}

function NoteWorkspaceFrame({
  presentation,
  onNew,
  children,
}: {
  presentation: NoteWorkspacePresentation;
  onNew?: () => void;
  children: ReactNode;
}) {
  if (presentation === "standard") return <>{children}</>;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-5">
      <PageHeader
        title="Notes"
        description="Capture ideas, write freely, and keep related pages together."
        action={
          onNew ? (
            <Button type="button" onClick={onNew}>
              <Plus data-icon="inline-start" />
              New note
            </Button>
          ) : undefined
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
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
  const [notesListOpen, setNotesListOpen] = useState(true);
  const [pagesSheetOpen, setPagesSheetOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(0);
  const pageSidebarOpen = useSyncExternalStore(
    subscribeToSidebar,
    readSidebarOpen,
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
  const totalNotes = collectionStates.reduce(
    (total, collection) => total + collection.flatNotes.length,
    0,
  );
  const visibleCollections = collectionStates.filter(
    (collection) => collection.tree.length > 0,
  );
  const showCollectionLabels = collections.length > 1;

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
    if (presentation === "standard") return <NotePagesSkeleton />;

    return (
      <NoteWorkspaceFrame presentation={presentation}>
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
      </NoteWorkspaceFrame>
    );
  }

  if (treeError && presentation === "standard") {
    return (
      <Empty className="flex-1 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>Couldn&apos;t load notes</EmptyTitle>
          <EmptyDescription>
            {treeError.error instanceof Error
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

  if (treeError) {
    return (
      <NoteWorkspaceFrame presentation={presentation}>
        <Card className={cn("items-center py-12 text-center", presentation === "journal" && "flex-1")}>
          <CardTitle>Could not load notes</CardTitle>
          <CardDescription>
            {treeError.error instanceof Error
              ? treeError.error.message
              : "Check your connection and try again."}
          </CardDescription>
          <Button
            variant="outline"
            onClick={() => {
              void Promise.all(treeQueries.map((query) => query.refetch()));
            }}
          >
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
        </Card>
      </NoteWorkspaceFrame>
    );
  }

  if (!selectedCollection) {
    return (
      <NoteWorkspaceFrame presentation={presentation}>
        <Card className={cn("items-center py-12 text-center", presentation === "journal" && "flex-1")}>
          <CardTitle>No note collection available</CardTitle>
          <CardDescription>Try refreshing the page.</CardDescription>
        </Card>
      </NoteWorkspaceFrame>
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

  if (presentation === "standard") {
    const collection = selectedCollection;
    const editable = !collection.archived;
    const requestDelete = (uuid: string) => {
      const node = findNoteNode(collection.tree, uuid);
      if (node) setNoteToDelete({ node, collectionKey: collection.key });
    };
    const addChild = (parentUuid: string) =>
      createChildMutation.mutate({
        collectionKey: collection.key,
        parentUuid,
      });
    const pin = (uuid: string, pinned: boolean) =>
      pinMutation.mutate({ collectionKey: collection.key, uuid, pinned });
    const openNote = (uuid: string, options?: { focusTitle?: boolean }) => {
      setPagesSheetOpen(false);
      setSelection({
        kind: "note",
        uuid,
        collectionKey: collection.key,
        ...options,
      });
    };
    const sidebarProps = {
      tree: collection.tree,
      flatNotes: collection.flatNotes,
      selectedUuid,
      archived: collection.archived,
      canCreate: collection.canCreate,
      createPending: createChildMutation.isPending,
      onNewPage: () => {
        setPagesSheetOpen(false);
        startDraft();
      },
      onSelect: (uuid: string) => openNote(uuid),
      onAddChild: addChild,
      onPin: pin,
      onDelete: requestDelete,
    };
    const chrome: StandardChrome = {
      rootLabel: collection.label,
      leading: (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Show pages"
            onClick={() => setPagesSheetOpen(true)}
          >
            <PanelLeft />
          </Button>
          {!pageSidebarOpen && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden md:inline-flex"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              onClick={() => storeSidebarOpen(true)}
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
          onAddChild: () => addChild(uuid),
          onPin: () => pin(uuid, !note.is_pinned),
          onDelete: () => requestDelete(uuid),
        };
      },
    };

    return (
      <div
        className={cn(
          "grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card",
          pageSidebarOpen
            ? "md:grid-cols-[16rem_minmax(0,1fr)]"
            : "md:grid-cols-[minmax(0,1fr)]",
        )}
      >
        {pageSidebarOpen && (
          <aside
            aria-label="Pages sidebar"
            className="hidden min-h-0 min-w-0 border-r bg-muted/30 md:block"
          >
            <NotePageSidebar
              {...sidebarProps}
              onCollapse={() => storeSidebarOpen(false)}
            />
          </aside>
        )}
        <Sheet open={pagesSheetOpen} onOpenChange={setPagesSheetOpen}>
          <SheetContent side="left" showCloseButton={false} className="w-72 gap-0 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Pages</SheetTitle>
              <SheetDescription>Browse and organize this area&apos;s pages.</SheetDescription>
            </SheetHeader>
            <NotePageSidebar {...sidebarProps} />
          </SheetContent>
        </Sheet>
        <main aria-label="Note editor" className="flex min-h-0 min-w-0 flex-col">
          {derivedSelection.kind === "note" ? (
            <PersistedNotePanel
              presentation={presentation}
              key={`${collection.key}:${derivedSelection.uuid}`}
              service={collection.service}
              queryKeys={collection.queryKeys}
              noteUuid={derivedSelection.uuid}
              archived={collection.archived}
              focusTitle={derivedSelection.focusTitle}
              noteOptions={selectedNotes}
              chrome={chrome}
              onOpenNote={openNote}
              onTreeChanged={() => refreshTree(collection.key)}
            />
          ) : (
            <NoteEditorPanel
              presentation={presentation}
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
              onOpenNote={openNote}
              onTreeChanged={() => refreshTree(collection.key)}
            />
          )}
        </main>
        {deleteDialog}
      </div>
    );
  }

  const workspace = (
    <div
      className={cn(
        "grid h-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border bg-card md:grid-rows-[minmax(0,1fr)]",
        notesListOpen
          ? "grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[23rem_minmax(0,1fr)]"
          : "grid-rows-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)]",
      )}
    >
      {notesListOpen && (
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b bg-muted/30 md:border-r md:border-b-0">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-3">
            <div>
              <h2 className="font-semibold">Notes</h2>
              <p className="text-xs text-muted-foreground">
                {totalNotes} {totalNotes === 1 ? "page" : "pages"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {createCollection && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="New note"
                  title="New note"
                  onClick={startDraft}
                >
                  <Plus />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close notes list"
                title="Close notes list"
                onClick={() => setNotesListOpen(false)}
              >
                <PanelLeftClose />
              </Button>
            </div>
          </div>
          <div className="workspace-list-scrollbar max-h-64 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-2 md:max-h-none md:flex-1">
            {visibleCollections.length === 0 ? null : (
              <div className="grid gap-5">
                {visibleCollections.map((collection) => (
                  <section key={collection.key} className="grid gap-2">
                    {showCollectionLabels && (
                      <div className="flex items-center justify-between gap-2 px-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                          <h3 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {collection.label}
                          </h3>
                          {collection.archived && (
                            <Badge variant="secondary" className="text-[0.625rem]">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
                          {collection.flatNotes.length}
                        </span>
                      </div>
                    )}
                    {collection.tree.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-muted-foreground">
                        Start writing your first note.
                      </p>
                    ) : (
                      <NoteTree
                        presentation={presentation}
                        nodes={collection.tree}
                        selectedUuid={
                          derivedSelection.collectionKey === collection.key
                            ? selectedUuid
                            : undefined
                        }
                        archived={collection.archived}
                        pinPending={pinMutation.isPending}
                        deletePending={deleteMutation.isPending}
                        onSelect={(uuid) =>
                          setSelection({
                            kind: "note",
                            uuid,
                            collectionKey: collection.key,
                          })
                        }
                        onPin={(node) =>
                          pinMutation.mutate({
                            collectionKey: collection.key,
                            uuid: node.uuid,
                            pinned: !node.is_pinned,
                          })
                        }
                        onDelete={(node) =>
                          setNoteToDelete({
                            node,
                            collectionKey: collection.key,
                          })
                        }
                      />
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
      <main
        aria-label="Note editor"
        className={cn(
          "relative flex min-h-0 min-w-0 justify-center overflow-hidden bg-card p-4 sm:p-6",
          !notesListOpen && "pt-14 sm:pt-16",
        )}
      >
        {!notesListOpen && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6"
            aria-label="Open notes list"
            title="Open notes list"
            onClick={() => setNotesListOpen(true)}
          >
            <PanelLeftOpen />
          </Button>
        )}
        <div className="h-full min-h-0 min-w-0 flex-1">
          {derivedSelection.kind === "note" ? (
            <PersistedNotePanel
              presentation={presentation}
              key={`${selectedCollection.key}:${derivedSelection.uuid}`}
              service={selectedCollection.service}
              queryKeys={selectedCollection.queryKeys}
              noteUuid={derivedSelection.uuid}
              archived={selectedCollection.archived}
              focusTitle={derivedSelection.focusTitle}
              noteOptions={selectedNotes}
              onOpenNote={(uuid, options) =>
                setSelection({
                  kind: "note",
                  uuid,
                  collectionKey: selectedCollection.key,
                  ...options,
                })
              }
              onTreeChanged={() => refreshTree(selectedCollection.key)}
            />
          ) : (
            <NoteEditorPanel
              presentation={presentation}
              key={`draft-${derivedSelection.collectionKey}-${derivedSelection.key}`}
              service={selectedCollection.service}
              queryKeys={selectedCollection.queryKeys}
              archived={selectedCollection.archived}
              documentId={`draft-${derivedSelection.collectionKey}-${derivedSelection.key}`}
              initialTitle=""
              initialContent={EMPTY_NOTE_DOCUMENT}
              initialPinned={false}
              focusTitle={derivedSelection.key > 0}
              persistedUuid={derivedSelection.uuid}
              noteOptions={selectedNotes}
              onCreated={(note) => {
                setSelection((current) => {
                  if (
                    !current ||
                    current.kind !== "draft" ||
                    current.collectionKey !== selectedCollection.key
                  ) {
                    return {
                      kind: "draft",
                      key: derivedSelection.key,
                      collectionKey: selectedCollection.key,
                      uuid: note.uuid,
                    };
                  }
                  return current.kind === "draft"
                    ? { ...current, uuid: note.uuid }
                    : current;
                });
              }}
              onOpenNote={(uuid, options) =>
                setSelection({
                  kind: "note",
                  uuid,
                  collectionKey: selectedCollection.key,
                  ...options,
                })
              }
              onTreeChanged={() => refreshTree(selectedCollection.key)}
            />
          )}
        </div>
      </main>
      {deleteDialog}
    </div>
  );

  return (
    <NoteWorkspaceFrame
      presentation={presentation}
      onNew={createCollection ? startDraft : undefined}
    >
      {workspace}
    </NoteWorkspaceFrame>
  );
}

function PersistedNotePanel({
  presentation,
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
  presentation: NoteWorkspacePresentation;
  service: NoteWorkspaceService;
  queryKeys: NoteWorkspaceQueryKeys;
  noteUuid: string;
  archived: boolean;
  focusTitle?: boolean;
  noteOptions: FlatNote[];
  chrome?: StandardChrome;
  onOpenNote: (uuid: string, options?: { focusTitle?: boolean }) => void;
  onTreeChanged: () => Promise<void>;
}) {
  const noteQuery = useQuery({
    queryKey: queryKeys.detail(noteUuid),
    queryFn: ({ signal }) => service.show(noteUuid, signal),
  });

  if (chrome && noteQuery.isLoading) {
    return (
      <>
        <NotePageTopbarSkeleton leading={chrome.leading} />
        <NoteDocumentSkeleton />
      </>
    );
  }
  if (chrome && (noteQuery.isError || !noteQuery.data)) {
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
      presentation={presentation}
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
  presentation,
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
  presentation: NoteWorkspacePresentation;
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
  chrome?: StandardChrome;
  onCreated: (note: Note) => void;
  onOpenNote: (uuid: string, options?: { focusTitle?: boolean }) => void;
  onTreeChanged: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const journalStyle = presentation === "journal";
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>("idle");
  const [activeUuid, setActiveUuid] = useState(persistedUuid);
  const [historyState, setHistoryState] = useState<NoteEditorHistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [formattingToolbarContainer, setFormattingToolbarContainer] =
    useState<HTMLDivElement | null>(null);
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
      formattingToolbarMode={journalStyle ? "persistent" : "floating"}
      formattingToolbarContainer={
        journalStyle ? formattingToolbarContainer : undefined
      }
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

  if (chrome) {
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

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4">
      <div className={cn("w-full", journalStyle ? "grid shrink-0 gap-3" : "relative")}>
        {notePath.length > 1 && (
          <NoteBreadcrumbs
            path={notePath}
            currentTitle={title}
            onOpenNote={onOpenNote}
            presentation={presentation}
          />
        )}
        <div className={cn(journalStyle ? "grid gap-2" : "relative")}>
          <Input
            ref={titleInputRef}
            aria-label="Note title"
              className={cn(
                "h-auto w-full border-0 px-0 py-0 text-2xl font-bold shadow-none focus-visible:ring-0 md:text-3xl",
                journalStyle && "notes-editor-title",
                !journalStyle && "pr-48 pl-13",
              )}
            placeholder="Untitled"
            maxLength={120}
            value={title}
            readOnly={archived}
            onChange={(event) => handleTitleChange(event.target.value)}
            onKeyDown={handleTitleKeyDown}
          />
          <div
            className={cn(
              "flex items-center gap-2",
              journalStyle
                ? "flex-wrap"
                : "absolute top-1/2 right-13 -translate-y-1/2 gap-1.5",
            )}
          >
            <span
              aria-live="polite"
              className={cn(
                "text-xs text-muted-foreground",
                journalStyle ? "mr-auto" : "whitespace-nowrap",
              )}
            >
              {archived ? (
                "Read only"
              ) : saveStatus === "saving" ? (
                "Saving…"
              ) : saveStatus === "dirty" ? (
                journalStyle ? "Unsaved changes" : "Unsaved"
              ) : saveStatus === "saved" ? (
                "Saved"
              ) : saveStatus === "error" ? (
                <button
                  type="button"
                  className="text-destructive underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={flush}
                >
                  Retry save
                </button>
              ) : null}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Undo editor change"
                title="Undo"
                disabled={archived || !historyState.canUndo}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => editorControlsRef.current?.undo()}
              >
                <Undo2 />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Redo editor change"
                title="Redo"
                disabled={archived || !historyState.canRedo}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => editorControlsRef.current?.redo()}
              >
                <Redo2 />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {journalStyle ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground">
          {!archived && (
            <div className="shrink-0 border-b bg-card px-3 py-1.5 sm:px-5">
              <div
                ref={setFormattingToolbarContainer}
                role="toolbar"
                aria-label="Note formatting"
                className="notes-formatting-toolbar min-h-10 min-w-0 overflow-x-auto"
              />
            </div>
          )}
          <div className="notes-writing-canvas flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {editor}
          </div>
        </div>
      ) : (
        editor
      )}
    </div>
  );
}

function NoteBreadcrumbs({
  path,
  currentTitle,
  onOpenNote,
  presentation,
}: {
  path: FlatNote[];
  currentTitle: string;
  onOpenNote: (uuid: string) => void;
  presentation: NoteWorkspacePresentation;
}) {
  const displayTitle = currentTitle.trim() || "Untitled";
  const isCollapsed = path.length > 3;
  const visibleAncestors = isCollapsed ? path.slice(0, 1) : path.slice(0, -1);
  const hiddenAncestors = isCollapsed ? path.slice(1, -1) : [];

  return (
    <nav
      aria-label="Note breadcrumb"
      className={cn(
        "min-w-0 text-muted-foreground",
        presentation === "journal" ? "px-0" : "mb-2 px-13",
      )}
    >
      <ol className="flex min-w-0 items-center gap-1 text-xs">
        {visibleAncestors.map((note, index) => (
          <li key={note.uuid} className="contents">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbNoteButton note={note} onOpenNote={onOpenNote} />
          </li>
        ))}
        {hiddenAncestors.length > 0 && (
          <li className="contents">
            <BreadcrumbSeparator />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Show hidden ancestor pages"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <Ellipsis className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="start"
                className="max-w-72 min-w-52"
              >
                {hiddenAncestors.map((note) => (
                  <DropdownMenuItem
                    key={note.uuid}
                    title={note.title || "Untitled"}
                    onClick={() => onOpenNote(note.uuid)}
                  >
                    <FileText />
                    <span className="min-w-0 truncate">
                      {note.title || "Untitled"}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )}
        <li className="contents">
          <BreadcrumbSeparator />
          <span
            aria-current="page"
            title={displayTitle}
            className="min-w-0 max-w-48 flex-1 truncate px-1 py-0.5 font-medium text-foreground"
          >
            {displayTitle}
          </span>
        </li>
      </ol>
    </nav>
  );
}

function BreadcrumbNoteButton({
  note,
  onOpenNote,
}: {
  note: FlatNote;
  onOpenNote: (uuid: string) => void;
}) {
  const title = note.title || "Untitled";

  return (
    <button
      type="button"
      title={title}
      className="max-w-36 truncate rounded px-1 py-0.5 text-left outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 sm:max-w-48"
      onClick={() => onOpenNote(note.uuid)}
    >
      {title}
    </button>
  );
}

function BreadcrumbSeparator() {
  return (
    <ChevronRight
      aria-hidden="true"
      className="size-3 shrink-0 text-muted-foreground/60"
    />
  );
}

function NoteTree({
  presentation,
  nodes,
  selectedUuid,
  archived,
  pinPending,
  deletePending,
  onSelect,
  onPin,
  onDelete,
}: {
  presentation: NoteWorkspacePresentation;
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
      new Set([...expandedUuids, ...findAncestorUuids(nodes, selectedUuid)]),
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
      presentation={presentation}
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
  presentation,
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
  presentation: NoteWorkspacePresentation;
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
      className={cn("grid", presentation === "journal" ? "gap-2" : "gap-3")}
    >
      {nodes.map((node) => (
        <AccordionItem key={node.uuid} value={node.uuid}>
          {depth === 0 ? (
            <RootNoteCard
              presentation={presentation}
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
              presentation={presentation}
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
  presentation: NoteWorkspacePresentation;
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
  presentation,
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
        "group/note relative min-w-0 gap-0 rounded-lg py-0 transition-colors duration-150",
        presentation === "journal"
          ? "border border-border shadow-none ring-0 hover:bg-background/80 focus-within:ring-2 focus-within:ring-ring/35"
          : "shadow-none ring-1 ring-border/90 hover:bg-muted/25 hover:shadow-xs hover:ring-foreground/15 focus-within:ring-2 focus-within:ring-ring/35",
        selectedUuid === node.uuid &&
          (presentation === "journal"
            ? "border-primary/40 bg-background shadow-xs"
            : "bg-accent/60 shadow-xs ring-foreground/20 hover:bg-accent/70 hover:ring-foreground/25"),
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
            <span className={cn("min-w-0 flex-1 truncate text-sm", presentation === "journal" ? "font-semibold" : "font-medium")}>
              {node.title || "Untitled"}
            </span>
          </span>
          <span className={cn("mt-1.5 line-clamp-2 min-h-8 text-muted-foreground", presentation === "journal" ? "text-sm leading-5" : "text-xs leading-4")}>
            {getNoteDocumentPreview(node.content) || "No content yet"}
          </span>
          <time
            dateTime={node.updated_at}
            className={cn("mt-2 block truncate font-medium text-muted-foreground/80", presentation === "journal" ? "text-xs" : "text-[0.6875rem]")}
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
              className={presentation === "journal" ? "flex" : "hidden group-hover/note:flex"}
            />
          )}
          {hasChildren && (
            <AccordionHeader>
              <AccordionTrigger
                aria-label={`Toggle ${node.title || "Untitled"} child pages`}
              />
            </AccordionHeader>
          )}
        </div>
      </div>
      {hasChildren && (
        <AccordionContent>
          <div className="border-t border-border/60 bg-muted/15 p-2">
            <NoteTreeLevel
              presentation={presentation}
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
  presentation,
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
            (presentation === "journal"
              ? "bg-background text-foreground ring-primary/40"
              : "bg-accent/60 text-accent-foreground ring-foreground/15 hover:bg-accent/70 hover:ring-foreground/20"),
        )}
      >
        <button
          type="button"
          aria-current={selectedUuid === node.uuid ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-2 text-left",
            presentation === "journal"
              ? hasChildren ? "pr-28" : "pr-20"
              : hasChildren ? "pr-10" : "pr-2",
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
              "absolute top-1/2 -translate-y-1/2 bg-card/95",
              presentation === "journal" ? "flex" : "hidden group-hover/child:flex",
              hasChildren ? "right-9" : "right-1",
            )}
          />
        )}
        {hasChildren && (
          <AccordionHeader className="absolute top-1/2 right-1 -translate-y-1/2">
            <AccordionTrigger
              aria-label={`Toggle ${node.title || "Untitled"} child pages`}
            />
          </AccordionHeader>
        )}
      </div>
      {hasChildren && (
        <AccordionContent>
          <div className="ml-3 border-l border-border/60 py-1 pl-2">
            <NoteTreeLevel
              presentation={presentation}
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
