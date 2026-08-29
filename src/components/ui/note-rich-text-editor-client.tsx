"use client";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import {
  createReactBlockSpec,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
  type ReactCustomBlockRenderProps,
  type SuggestionMenuProps,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import {
  BellRing,
  Bookmark,
  FilePlus2,
  Link2,
  LoaderCircle,
  NotebookTabs,
} from "lucide-react";
import {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
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
  parseNoteDocument,
  serializeNoteDocument,
} from "@/components/ui/note-editor-document";

type NoteLinkTarget = { uuid: string; title: string; depth: number };

type NoteEditorContextValue = {
  noteTitles: Map<string, string>;
  onOpenNote: (uuid: string) => void;
};

const NoteEditorContext = createContext<NoteEditorContextValue>({
  noteTitles: new Map(),
  onOpenNote: () => undefined,
});

const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {},
    content: "inline",
  },
  {
    render: ({ contentRef }) => (
      <div className="flex w-full gap-3 rounded-lg border bg-muted/60 px-4 py-3">
        <BellRing className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div ref={contentRef} className="min-w-0 flex-1" />
      </div>
    ),
  },
);

const BookmarkBlock = createReactBlockSpec(
  {
    type: "bookmark",
    propSchema: {
      url: { default: "" },
      label: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block }) => {
      const hostname = safeHostname(block.props.url);
      return (
        <a
          href={block.props.url}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
        >
          <Bookmark className="size-5 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block truncate font-medium">
              {block.props.label || hostname || "Web bookmark"}
            </span>
            <span className="block truncate text-sm text-muted-foreground">
              {block.props.url}
            </span>
          </span>
        </a>
      );
    },
  },
);

const noteLinkConfig = {
  type: "noteLink",
  propSchema: {
    noteUuid: { default: "" },
    label: { default: "Untitled" },
  },
  content: "none",
} as const;

function NoteLinkRenderer({
  block,
}: ReactCustomBlockRenderProps<typeof noteLinkConfig>) {
  const context = useContext(NoteEditorContext);
  const title =
    context.noteTitles.get(block.props.noteUuid) || block.props.label;
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium underline-offset-4 hover:bg-muted hover:underline"
      onClick={() => context.onOpenNote(block.props.noteUuid)}
    >
      <NotebookTabs className="size-4 shrink-0" />
      <span className="truncate">{title || "Untitled"}</span>
    </button>
  );
}

const NoteLinkBlock = createReactBlockSpec(noteLinkConfig, {
  render: NoteLinkRenderer,
});

const noteEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: CalloutBlock(),
    bookmark: BookmarkBlock(),
    noteLink: NoteLinkBlock(),
  },
});

function NoteSlashMenu({
  items,
  loadingState,
  selectedIndex,
  onItemClick,
}: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  return (
    <div
      id="bn-suggestion-menu"
      role="listbox"
      aria-label="Insert block"
      className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
    >
      <div className="max-h-80 overflow-x-hidden overflow-y-auto p-1.5">
        {items.map((item, index) => {
          const showGroup =
            index === 0 || items[index - 1]?.group !== item.group;

          return (
            <div key={`${item.group ?? "commands"}-${item.title}`}>
              {showGroup && item.group && (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {item.group}
                </div>
              )}
              <button
                id={`bn-suggestion-menu-item-${index}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onItemClick?.(item)}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs [&_svg]:size-4">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.title}
                  </span>
                  {item.subtext && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.subtext}
                    </span>
                  )}
                </span>
                {item.badge && (
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}
        {(loadingState === "loading-initial" || loadingState === "loading") && (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading commands…
          </div>
        )}
        {loadingState === "loaded" && items.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No matching commands.
          </div>
        )}
      </div>
    </div>
  );
}

type PendingDialog =
  | { kind: "link" | "bookmark" | "note"; blockId: string }
  | undefined;

export type NoteRichTextEditorClientProps = {
  documentId: string;
  content: string;
  editable: boolean;
  noteOptions: NoteLinkTarget[];
  onChange: (content: string) => void;
  onUploadFile: (file: File) => Promise<string>;
  onCreateChild: () => Promise<{ uuid: string; title: string }>;
  onOpenNote: (uuid: string, options?: { focusTitle?: boolean }) => void;
};

export function NoteRichTextEditorClient({
  documentId,
  content,
  editable,
  noteOptions,
  onChange,
  onUploadFile,
  onCreateChild,
  onOpenNote,
}: NoteRichTextEditorClientProps) {
  const onChangeRef = useRef(onChange);
  const onUploadFileRef = useRef(onUploadFile);
  const onCreateChildRef = useRef(onCreateChild);
  const onOpenNoteRef = useRef(onOpenNote);
  const [pendingDialog, setPendingDialog] = useState<PendingDialog>();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [selectedNoteUuid, setSelectedNoteUuid] = useState("");
  useEffect(() => {
    onChangeRef.current = onChange;
    onUploadFileRef.current = onUploadFile;
    onCreateChildRef.current = onCreateChild;
    onOpenNoteRef.current = onOpenNote;
  }, [onChange, onCreateChild, onOpenNote, onUploadFile]);

  const initialContent = useMemo(
    () =>
      parseNoteDocument(content).blocks as PartialBlock<
        typeof noteEditorSchema.blockSchema,
        typeof noteEditorSchema.inlineContentSchema,
        typeof noteEditorSchema.styleSchema
      >[],
    [content],
  );
  const editor = useCreateBlockNote(
    {
      schema: noteEditorSchema,
      initialContent,
      uploadFile: (file) => onUploadFileRef.current(file),
    },
    [documentId],
  );
  const noteTitles = useMemo(
    () => new Map(noteOptions.map((note) => [note.uuid, note.title])),
    [noteOptions],
  );
  const openNote = useCallback(
    (uuid: string) => onOpenNoteRef.current(uuid),
    [],
  );
  const noteEditorContext = useMemo(
    () => ({ noteTitles, onOpenNote: openNote }),
    [noteTitles, openNote],
  );
  const handleEditorChange = useCallback(() => {
    const serializedDocument = serializeNoteDocument(editor.document);

    // BlockNote emits changes while ProseMirror is still reconciling node-view
    // positions. Defer parent state updates so undo/redo can finish that cycle
    // before React rerenders the editor tree.
    queueMicrotask(() => onChangeRef.current(serializedDocument));
  }, [editor]);

  const prepareDialog = (kind: "link" | "bookmark" | "note") => {
    const block = editor.getTextCursorPosition().block;
    editor.updateBlock(block, { type: "paragraph", content: "" });
    setUrl("");
    setLabel("");
    setSelectedNoteUuid("");
    setPendingDialog({ kind, blockId: block.id });
  };

  const customItems: DefaultReactSuggestionItem[] = [
    {
      title: "Callout",
      subtext: "Highlight an important note",
      aliases: ["alert", "info"],
      group: "Basic blocks",
      icon: <BellRing className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "callout",
          content: "",
        }),
    },
    {
      title: "Page",
      subtext: "Create a child page",
      aliases: ["subpage", "child"],
      group: "Pages and links",
      icon: <FilePlus2 className="size-4" />,
      onItemClick: () => {
        const block = editor.getTextCursorPosition().block;
        editor.updateBlock(block, {
          type: "paragraph",
          content: "Creating child page…",
        });
        void onCreateChildRef
          .current()
          .then((note) => {
            editor.updateBlock(block.id, {
              type: "noteLink",
              props: { noteUuid: note.uuid, label: note.title },
            });

            // Let BlockNote emit the parent document change before navigating
            // away, so the new child link is included in the parent's save.
            window.setTimeout(
              () =>
                onOpenNoteRef.current(note.uuid, { focusTitle: true }),
              0,
            );
          })
          .catch(() => {
            editor.updateBlock(block.id, {
              type: "paragraph",
              content: "Could not create child page.",
            });
          });
      },
    },
    {
      title: "Link",
      subtext: "Add a link with custom text",
      aliases: ["url", "website"],
      group: "Pages and links",
      icon: <Link2 className="size-4" />,
      onItemClick: () => prepareDialog("link"),
    },
    {
      title: "Link to note",
      subtext: "Reference another note or page",
      aliases: ["mention", "page"],
      group: "Pages and links",
      icon: <NotebookTabs className="size-4" />,
      onItemClick: () => prepareDialog("note"),
    },
    {
      title: "Web bookmark",
      subtext: "Show a safe URL card",
      aliases: ["bookmark", "website"],
      group: "Pages and links",
      icon: <Bookmark className="size-4" />,
      onItemClick: () => prepareDialog("bookmark"),
    },
  ];
  const allowedDefaults = new Set([
    "Heading 1",
    "Heading 2",
    "Heading 3",
    "Quote",
    "Toggle List",
    "Numbered List",
    "Bullet List",
    "Check List",
    "Code Block",
    "Image",
    "Video",
    "Divider",
  ]);
  const slashItems = [
    ...getDefaultReactSlashMenuItems(editor).filter((item) =>
      allowedDefaults.has(item.title),
    ),
    ...customItems,
  ];

  const submitDialog = () => {
    if (!pendingDialog) return;
    if (pendingDialog.kind === "note") {
      const note = noteOptions.find((item) => item.uuid === selectedNoteUuid);
      if (!note) return;
      editor.updateBlock(pendingDialog.blockId, {
        type: "noteLink",
        props: { noteUuid: note.uuid, label: note.title },
      });
    } else {
      const normalizedUrl = normalizeHttpUrl(url);
      if (!normalizedUrl) return;
      if (pendingDialog.kind === "bookmark") {
        editor.updateBlock(pendingDialog.blockId, {
          type: "bookmark",
          props: { url: normalizedUrl, label },
        });
      } else {
        editor.updateBlock(pendingDialog.blockId, {
          type: "paragraph",
          content: [
            {
              type: "link",
              href: normalizedUrl,
              content: label || normalizedUrl,
            },
          ],
        });
      }
    }
    setPendingDialog(undefined);
  };

  return (
    <NoteEditorContext.Provider value={noteEditorContext}>
      <div className="flex min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-white">
        <BlockNoteView
          className="h-full min-h-0 w-full"
          editor={editor}
          editable={editable}
          slashMenu={false}
          theme="light"
          onChange={handleEditorChange}
        >
          {editable && (
            <SuggestionMenuController
              triggerCharacter="/"
              suggestionMenuComponent={NoteSlashMenu}
              getItems={async (query) =>
                filterSuggestionItems(slashItems, query)
              }
            />
          )}
        </BlockNoteView>
      </div>
      <Dialog
        open={Boolean(pendingDialog)}
        onOpenChange={(open) => {
          if (!open) setPendingDialog(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDialog?.kind === "note"
                ? "Link to a note"
                : pendingDialog?.kind === "bookmark"
                  ? "Add web bookmark"
                  : "Add link"}
            </DialogTitle>
            <DialogDescription>
              {pendingDialog?.kind === "note"
                ? "Choose another note or nested page in this area."
                : "Only HTTP and HTTPS links are supported."}
            </DialogDescription>
          </DialogHeader>
          {pendingDialog?.kind === "note" ? (
            <select
              aria-label="Note"
              className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
              value={selectedNoteUuid}
              onChange={(event) => setSelectedNoteUuid(event.target.value)}
            >
              <option value="">Select a note</option>
              {noteOptions.map((note) => (
                <option key={note.uuid} value={note.uuid}>
                  {"— ".repeat(note.depth)}
                  {note.title || "Untitled"}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid gap-3">
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
              <Input
                placeholder={
                  pendingDialog?.kind === "bookmark"
                    ? "Label (optional)"
                    : "Link text (optional)"
                }
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDialog(undefined)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                pendingDialog?.kind === "note"
                  ? !selectedNoteUuid
                  : !normalizeHttpUrl(url)
              }
              onClick={submitDialog}
            >
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NoteEditorContext.Provider>
  );
}

function normalizeHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function safeHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}
