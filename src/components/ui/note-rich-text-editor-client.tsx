"use client";

import {
  BlockNoteSchema,
  createExtension,
  defaultBlockSpecs,
  selectedFragmentToHTML,
  type PartialBlock,
} from "@blocknote/core";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
  SideMenuExtension,
  SuggestionMenu as SuggestionMenuExtension,
} from "@blocknote/core/extensions";
import {
  createReactBlockSpec,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  getDefaultReactSlashMenuItems,
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
  useEditorState,
  useExtensionState,
  type DefaultReactSuggestionItem,
  type ReactCustomBlockRenderProps,
  type SideMenuProps,
  type SuggestionMenuProps,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import type {
  Fragment as ProseMirrorFragment,
  Node as ProseMirrorNode,
} from "@tiptap/pm/model";
import { AllSelection, Plugin, TextSelection } from "@tiptap/pm/state";
import "@blocknote/shadcn/style.css";
import {
  BellRing,
  Bookmark,
  Crop,
  FilePlus2,
  ImagePlus,
  Link2,
  LoaderCircle,
  Minus,
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
  useLayoutEffect,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
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
  ImageCropDialog,
  type ImageCropAspectOption,
} from "@/components/ui/image-crop-dialog";
import {
  parseNoteDocument,
  serializeNoteDocument,
} from "@/components/ui/note-editor-document";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { getImageAspectRatio, imageUrlToFile } from "@/lib/image/crop-image";

type NoteLinkTarget = { uuid: string; title: string; depth: number };

type NoteEditorContextValue = {
  noteTitles: Map<string, string>;
  onOpenNote: (uuid: string) => void;
  onSelectBlock: (blockId: string) => void;
  onBlockDragEnd: () => void;
};

const NoteEditorContext = createContext<NoteEditorContextValue>({
  noteTitles: new Map(),
  onOpenNote: () => undefined,
  onSelectBlock: () => undefined,
  onBlockDragEnd: () => undefined,
});

function NoteBlockSideMenu(props: SideMenuProps) {
  const { onSelectBlock, onBlockDragEnd } = useContext(NoteEditorContext);
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  return (
    <div
      className="contents"
      onPointerDownCapture={(event) => {
        if (
          block &&
          event.target instanceof Element &&
          event.target.closest('[draggable="true"]')
        ) {
          onSelectBlock(block.id);
        }
      }}
      onDragStartCapture={() => {
        if (block) onSelectBlock(block.id);
      }}
      onDragEndCapture={onBlockDragEnd}
    >
      <SideMenu {...props} />
    </div>
  );
}

type CropImageRequest = {
  blockId: string;
  url: string;
  name: string;
};

function ImageCropToolbarButton({
  onCropImage,
}: {
  onCropImage: (request: CropImageRequest) => void;
}) {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();
  const image = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) return undefined;

      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];
      if (selectedBlocks.length !== 1) return undefined;

      const block = selectedBlocks[0];
      if (block.type !== "image" || !block.props.url) return undefined;

      return {
        blockId: block.id,
        url: block.props.url,
        name: block.props.name,
      };
    },
  });

  if (!Components || !image) return null;

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label="Crop image"
      mainTooltip="Crop image"
      icon={<Crop size={16} />}
      onClick={() => onCropImage(image)}
    />
  );
}

function NoteFormattingToolbar({
  allowImageCrop,
  allowBlockInsertion,
  onCropImage,
}: {
  allowImageCrop: boolean;
  allowBlockInsertion: boolean;
  onCropImage: (request: CropImageRequest) => void;
}) {
  const defaultItems = getFormattingToolbarItems();

  return (
    <FormattingToolbar>
      {defaultItems.slice(0, 1)}
      {allowBlockInsertion && <LetterInsertToolbarButtons />}
      {defaultItems.slice(1, 4)}
      {allowImageCrop && <ImageCropToolbarButton onCropImage={onCropImage} />}
      {defaultItems.slice(4)}
    </FormattingToolbar>
  );
}

function LetterInsertToolbarButtons() {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();

  if (!Components) return null;

  const insertBlock = (type: "image" | "divider") => {
    const currentBlock = editor.getTextCursorPosition().block;
    editor.insertBlocks([{ type }], currentBlock, "after");
    editor.focus();
  };

  return (
    <>
      <Components.FormattingToolbar.Button
        className="bn-button"
        label="Insert image"
        mainTooltip="Insert image"
        icon={<ImagePlus size={16} />}
        onClick={() => insertBlock("image")}
      />
      <Components.FormattingToolbar.Button
        className="bn-button"
        label="Insert divider"
        mainTooltip="Insert divider"
        icon={<Minus size={16} />}
        onClick={() => insertBlock("divider")}
      />
    </>
  );
}

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
      className="flex h-6 w-full items-center gap-2 rounded-md px-2 text-left text-sm leading-none font-medium underline-offset-4 hover:bg-muted hover:underline"
      onClick={() => context.onOpenNote(block.props.noteUuid)}
    >
      <NotebookTabs className="size-4 shrink-0" />
      <span className="flex min-w-0 flex-1 items-center truncate leading-none">
        {title || "Untitled"}
      </span>
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

function hasInlineMarksAt(doc: ProseMirrorNode, pos: number) {
  const resolved = doc.resolve(pos);
  return Boolean(
    resolved.marks().length ||
      (resolved.nodeBefore?.isText && resolved.nodeBefore.marks.length) ||
      (resolved.nodeAfter?.isText && resolved.nodeAfter.marks.length),
  );
}

function selectionContainsOnlyText(fragment: ProseMirrorFragment) {
  let onlyText = true;
  fragment.descendants((node) => {
    if (
      (node.type.isInGroup("blockContent") && !node.isTextblock) ||
      (node.isLeaf && !node.isText && node.type.name !== "hardBreak")
    ) {
      onlyText = false;
      return false;
    }
    return undefined;
  });
  return onlyText;
}

const letterPageEditingExtension = createExtension({
  key: "letterPageEditing",
  prosemirrorPlugins: [
    new Plugin({
      props: {
        handleTextInput(view, from, to, text, defaultTransaction) {
          if (text !== " ") return false;

          const { state } = view;
          let selectionContainsMarks = false;
          if (from < to) {
            state.doc.nodesBetween(from, to, (node) => {
              if (node.isText && node.marks.length > 0) {
                selectionContainsMarks = true;
                return false;
              }
              return undefined;
            });
          }

          const hasFormattedContext =
            Boolean(state.storedMarks?.length) ||
            hasInlineMarksAt(state.doc, from) ||
            hasInlineMarksAt(state.doc, to) ||
            selectionContainsMarks;
          if (!hasFormattedContext) return false;

          view.dispatch(defaultTransaction());
          return true;
        },
        handleClick(view, pos, event) {
          if (!view.editable || event.button !== 0 || event.detail !== 1) {
            return false;
          }

          const { state } = view;
          const resolved = state.doc.resolve(pos);
          if (!resolved.parent.inlineContent || !hasInlineMarksAt(state.doc, pos)) {
            return false;
          }

          if (
            state.selection instanceof TextSelection &&
            state.selection.empty &&
            state.selection.from === pos
          ) {
            return false;
          }

          view.dispatch(
            state.tr
              .setSelection(TextSelection.create(state.doc, pos))
              .setMeta("addToHistory", false),
          );
          return true;
        },
      },
    }),
  ],
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

type ImageCropSession = CropImageRequest & {
  file: File;
  source: string;
  originalAspect: number;
};

export type NoteRichTextEditorClientProps = {
  mode?: "note" | "task" | "resource" | "letter";
  theme?: "light" | "dark";
  editorChrome?: "full" | "formatting-only" | "none";
  formattingToolbarMode?: "floating" | "persistent";
  formattingToolbarContainer?: HTMLElement | null;
  slashMenuPortalToBody?: boolean;
  documentId: string;
  content: string;
  syncContent?: boolean;
  pageEditor?: boolean;
  onContentApplied?: () => void;
  editable: boolean;
  noteOptions: NoteLinkTarget[];
  onChange: (content: string) => void;
  onUploadFile: (file: File) => Promise<string>;
  onCreateChild: () => Promise<{ uuid: string; title: string }>;
  onOpenNote: (uuid: string, options?: { focusTitle?: boolean }) => void;
  onEditorReady: (controls: NoteRichTextEditorControls | null) => void;
  onHistoryStateChange: (state: NoteEditorHistoryState) => void;
  onBlur?: () => void;
};

export type NoteRichTextEditorControls = {
  undo: () => boolean;
  redo: () => boolean;
  focusFirstBlock: () => void;
  getContent: () => string;
  getSelection: () => NoteEditorSelection | null;
  restoreSelection: (selection: NoteEditorSelection) => void;
  isComposing: () => boolean;
  isSlashMenuOpen: () => boolean;
};

export type NoteEditorSelection = {
  anchor: { blockId: string; offset: number };
  head: { blockId: string; offset: number };
  focused: boolean;
};

export type NoteEditorHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
};

export function NoteRichTextEditorClient({
  mode = "note",
  theme = "light",
  editorChrome = "full",
  formattingToolbarMode = "floating",
  formattingToolbarContainer,
  slashMenuPortalToBody = false,
  documentId,
  content,
  syncContent = false,
  pageEditor = false,
  onContentApplied,
  editable,
  noteOptions,
  onChange,
  onUploadFile,
  onCreateChild,
  onOpenNote,
  onEditorReady,
  onHistoryStateChange,
  onBlur,
}: NoteRichTextEditorClientProps) {
  const isLetterComposer = mode === "letter" && !pageEditor;
  const onChangeRef = useRef(onChange);
  const applyingContentRef = useRef(false);
  const appliedContentRef = useRef(content);
  const externallyAppliedContentRef = useRef<string | null>(null);
  const onUploadFileRef = useRef(onUploadFile);
  const onCreateChildRef = useRef(onCreateChild);
  const onOpenNoteRef = useRef(onOpenNote);
  const onEditorReadyRef = useRef(onEditorReady);
  const onHistoryStateChangeRef = useRef(onHistoryStateChange);
  const onBlurRef = useRef(onBlur);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const selectedBlockIdRef = useRef<string | undefined>(undefined);
  const [pendingDialog, setPendingDialog] = useState<PendingDialog>();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [selectedNoteUuid, setSelectedNoteUuid] = useState("");
  const [imageCrop, setImageCrop] = useState<ImageCropSession>();
  const selectedNote = noteOptions.find(
    (note) => note.uuid === selectedNoteUuid,
  );
  const selectedNoteLabel = selectedNoteUuid
    ? selectedNote?.title || "Untitled"
    : undefined;
  useEffect(() => {
    onChangeRef.current = onChange;
    onUploadFileRef.current = onUploadFile;
    onCreateChildRef.current = onCreateChild;
    onOpenNoteRef.current = onOpenNote;
    onEditorReadyRef.current = onEditorReady;
    onHistoryStateChangeRef.current = onHistoryStateChange;
    onBlurRef.current = onBlur;
  }, [
    onChange,
    onCreateChild,
    onEditorReady,
    onHistoryStateChange,
    onOpenNote,
    onUploadFile,
    onBlur,
  ]);

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
      initialContent: initialContent.length ? initialContent : [{ type: "paragraph", content: "" }],
      uploadFile: (file) => onUploadFileRef.current(file),
      extensions: mode === "letter" || pageEditor ? [letterPageEditingExtension] : [],
      tabBehavior: isLetterComposer ? "prefer-indent" : "prefer-navigate-ui",
    },
    [documentId, mode, pageEditor],
  );
  const prepareImageCrop = useCallback(async (request: CropImageRequest) => {
    let source: string | undefined;

    try {
      const file = await imageUrlToFile(request.url, request.name);
      source = URL.createObjectURL(file);
      const originalAspect = await getImageAspectRatio(source);
      setImageCrop({ ...request, file, source, originalAspect });
    } catch (error) {
      if (source) URL.revokeObjectURL(source);
      toast.add({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "The image could not be prepared for cropping.",
      });
    }
  }, []);
  const noteFormattingToolbar = useCallback(
    () => (
      <NoteFormattingToolbar
        allowImageCrop={mode === "note" || mode === "letter"}
        allowBlockInsertion={
          mode === "letter" && formattingToolbarMode === "persistent"
        }
        onCropImage={(request) => void prepareImageCrop(request)}
      />
    ),
    [formattingToolbarMode, mode, prepareImageCrop],
  );

  useEffect(
    () => () => {
      if (imageCrop) URL.revokeObjectURL(imageCrop.source);
    },
    [imageCrop],
  );
  const noteTitles = useMemo(
    () => new Map(noteOptions.map((note) => [note.uuid, note.title])),
    [noteOptions],
  );
  const openNote = useCallback(
    (uuid: string) => onOpenNoteRef.current(uuid),
    [],
  );
  const clearSelectedBlock = useCallback(() => {
    editor.domElement
      ?.querySelector<HTMLElement>('[data-note-block-selected="true"]')
      ?.removeAttribute("data-note-block-selected");
    selectedBlockIdRef.current = undefined;
  }, [editor]);
  const selectBlock = useCallback(
    (blockId: string) => {
      clearSelectedBlock();

      const blockOuter = Array.from(
        editor.domElement?.querySelectorAll<HTMLElement>(
          '[data-node-type="blockOuter"][data-id]',
        ) ?? [],
      ).find((element) => element.dataset.id === blockId);
      const blockContent =
        blockOuter?.querySelector<HTMLElement>(".bn-block-content");

      if (!blockContent) return;
      blockContent.dataset.noteBlockSelected = "true";
      selectedBlockIdRef.current = blockId;
    },
    [clearSelectedBlock, editor],
  );
  const emitHistoryState = useCallback(() => {
    const historyExtension = editor.getExtension("history") as
      | {
          undoCommand: (state: typeof editor.prosemirrorState) => boolean;
          redoCommand: (state: typeof editor.prosemirrorState) => boolean;
        }
      | undefined;

    onHistoryStateChangeRef.current({
      canUndo: historyExtension?.undoCommand(editor.prosemirrorState) ?? false,
      canRedo: historyExtension?.redoCommand(editor.prosemirrorState) ?? false,
    });
  }, [editor]);
  const editorControls = useMemo<NoteRichTextEditorControls>(
    () => ({
      getContent: () => serializeNoteDocument(editor.document),
      isComposing: () => editor.prosemirrorView.composing,
      isSlashMenuOpen: () =>
        editor.getExtension(SuggestionMenuExtension)?.shown() ?? false,
      getSelection: () => {
        const { selection } = editor.prosemirrorState;
        const point = (position: typeof selection.$anchor) => {
          for (let depth = position.depth; depth > 0; depth -= 1) {
            const id = position.node(depth).attrs.id;
            if (typeof id === "string") {
              return { blockId: id, offset: position.pos - position.start(depth) };
            }
          }
          return null;
        };
        const anchor = point(selection.$anchor);
        const head = point(selection.$head);
        return anchor && head ? { anchor, head, focused: editor.prosemirrorView.hasFocus() } : null;
      },
      restoreSelection: (selection) => {
        const { state } = editor.prosemirrorView;
        const position = (point: NoteEditorSelection["anchor"]) => {
          let found: number | undefined;
          state.doc.descendants((node, pos) => {
            if (node.attrs.id === point.blockId) {
              found = pos + 1 + Math.min(point.offset, node.content.size);
              return false;
            }
          });
          return found;
        };
        const anchor = position(selection.anchor);
        const head = position(selection.head);
        if (anchor === undefined || head === undefined) return;
        editor.prosemirrorView.dispatch(
          state.tr.setSelection(TextSelection.between(state.doc.resolve(anchor), state.doc.resolve(head)))
            .setMeta("addToHistory", false),
        );
        if (selection.focused) editor.focus();
      },
      undo: () => {
        const changed = editor.undo();
        editor.focus();
        queueMicrotask(emitHistoryState);
        return changed;
      },
      redo: () => {
        const changed = editor.redo();
        editor.focus();
        queueMicrotask(emitHistoryState);
        return changed;
      },
      focusFirstBlock: () => {
        const firstBlock = editor.document[0];
        if (firstBlock) editor.setTextCursorPosition(firstBlock, "start");
        editor.focus();
      },
    }),
    [editor, emitHistoryState],
  );

  useLayoutEffect(() => {
    if (!syncContent) return;
    if (appliedContentRef.current !== content) {
      const selection = editorControls.getSelection();
      applyingContentRef.current = true;
      try {
        if (serializeNoteDocument(editor.document) !== content) {
          editor.transact((transaction) => {
            transaction.setMeta("addToHistory", false);
          editor.replaceBlocks(editor.document, initialContent.length ? initialContent : [{ type: "paragraph", content: "" }]);
          });
          if (selection) editorControls.restoreSelection(selection);
        }
        appliedContentRef.current = content;
        externallyAppliedContentRef.current = content;
      } finally {
        applyingContentRef.current = false;
      }
    }
    onContentApplied?.();
  }, [content, editor, editorControls, initialContent, onContentApplied, syncContent]);

  useEffect(() => {
    let active = true;

    onEditorReadyRef.current(editorControls);
    queueMicrotask(() => {
      if (active) emitHistoryState();
    });

    return () => {
      active = false;
      onEditorReadyRef.current(null);
    };
  }, [editorControls, emitHistoryState]);

  const noteEditorContext = useMemo(
    () => ({
      noteTitles,
      onOpenNote: openNote,
      onSelectBlock: selectBlock,
      onBlockDragEnd: clearSelectedBlock,
    }),
    [clearSelectedBlock, noteTitles, openNote, selectBlock],
  );
  const handleEditorChange = useCallback(() => {
    if (applyingContentRef.current) return;
    const serializedDocument = serializeNoteDocument(editor.document);
    if (externallyAppliedContentRef.current === serializedDocument) {
      externallyAppliedContentRef.current = null;
      appliedContentRef.current = serializedDocument;
      return;
    }
    externallyAppliedContentRef.current = null;
    appliedContentRef.current = serializedDocument;

    // BlockNote emits changes while ProseMirror is still reconciling node-view
    // positions. Defer parent state updates so undo/redo can finish that cycle
    // before React rerenders the editor tree.
    queueMicrotask(() => {
      const selectedBlockId = selectedBlockIdRef.current;
      if (selectedBlockId && !editor.getBlock(selectedBlockId)) {
        clearSelectedBlock();
      }
      onChangeRef.current(serializedDocument);
      emitHistoryState();
    });
  }, [clearSelectedBlock, editor, emitHistoryState]);

  const handleLetterClipboard = useCallback(
    (event: ReactClipboardEvent<HTMLDivElement>) => {
      if (
        !isLetterComposer ||
        !(event.target instanceof Node) ||
        !editor.domElement?.contains(event.target)
      ) {
        return;
      }

      const { selection } = editor.prosemirrorState;
      if (
        !(selection instanceof TextSelection || selection instanceof AllSelection) ||
        selection.empty ||
        !selectionContainsOnlyText(selection.content().content)
      ) {
        return;
      }

      const { externalHTML } = selectedFragmentToHTML(editor.prosemirrorView, editor);
      const plainText = editor.prosemirrorState.doc
        .textBetween(selection.from, selection.to, "\n\n", (node) =>
          node.type.name === "hardBreak" ? "\n" : "",
        )
        .replaceAll("\uFFFC", "")
        .replaceAll("\u00A0", " ");

      event.preventDefault();
      event.stopPropagation();
      event.clipboardData.clearData();
      event.clipboardData.setData("text/html", externalHTML);
      event.clipboardData.setData("text/plain", plainText);

      if (event.type === "cut" && editor.isEditable) {
        editor.prosemirrorView.dispatch(
          editor.prosemirrorState.tr.deleteSelection(),
        );
      }
    },
    [editor, isLetterComposer],
  );

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !editorShellRef.current?.contains(event.target)
      ) {
        clearSelectedBlock();
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () => {
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true,
      );
      clearSelectedBlock();
    };
  }, [clearSelectedBlock]);

  const handleSelectedBlockKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Backspace" && event.key !== "Delete") return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          Boolean(target.closest("input, textarea, select, [contenteditable]")))
      ) {
        return;
      }

      const selectedBlockId = selectedBlockIdRef.current;
      if (!selectedBlockId) return;

      const selectedBlock = editor.getBlock(selectedBlockId);
      if (!selectedBlock) {
        clearSelectedBlock();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      editor.removeBlocks([selectedBlock]);
      clearSelectedBlock();
    },
    [clearSelectedBlock, editor],
  );

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
              () => onOpenNoteRef.current(note.uuid, { focusTitle: true }),
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
  const mediaDefaults = new Set(["Image", "Video"]);
  const slashItems = [
    ...getDefaultReactSlashMenuItems(editor).filter(
      (item) =>
        allowedDefaults.has(item.title) &&
        (mode === "note" ||
          (mode === "letter"
            ? item.title !== "Video"
            : !mediaDefaults.has(item.title))),
    ),
    ...(mode === "resource"
      ? [customItems[2]]
        : mode === "task"
          ? [customItems[0], customItems[2], customItems[3], customItems[4]]
          : mode === "letter"
            ? []
            : customItems),
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
      <div
        ref={editorShellRef}
        className={
          mode === "task"
            ? "flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-white"
            : isLetterComposer
              ? "flex min-h-0 w-full min-w-0 flex-1 overflow-visible bg-white"
              : "flex min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-white"
        }
        onCopyCapture={handleLetterClipboard}
        onCutCapture={handleLetterClipboard}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            onBlurRef.current?.();
          }
        }}
        onKeyDownCapture={handleSelectedBlockKeyDown}
        onPointerDownCapture={(event) => {
          if (
            event.target instanceof Element &&
            !event.target.closest(".bn-side-menu, .bn-menu-dropdown")
          ) {
            clearSelectedBlock();
          }
        }}
      >
        <BlockNoteView
          className={
            mode === "task" ? "h-full min-h-0 w-full" : "h-full min-h-0 w-full"
          }
          editor={editor}
          editable={editable}
          formattingToolbar={false}
          sideMenu={false}
          slashMenu={false}
          emojiPicker={mode !== "letter"}
          theme={theme}
          onChange={handleEditorChange}
        >
          {editable && editorChrome !== "none" && (
            <>
              {formattingToolbarMode === "persistent" ? (
                formattingToolbarContainer ? (
                  createPortal(
                    <NoteFormattingToolbar
                      allowImageCrop={mode === "note" || mode === "letter"}
                      allowBlockInsertion={mode === "letter"}
                      onCropImage={(request) => void prepareImageCrop(request)}
                    />,
                    formattingToolbarContainer,
                  )
                ) : null
              ) : (
                <FormattingToolbarController
                  formattingToolbar={noteFormattingToolbar}
                />
              )}
              {editorChrome === "full" ? (
                <>
                  <SideMenuController sideMenu={NoteBlockSideMenu} />
                  <SuggestionMenuController
                    triggerCharacter="/"
                    portalElement={slashMenuPortalToBody ? null : undefined}
                    suggestionMenuComponent={NoteSlashMenu}
                    getItems={async (query) =>
                      filterSuggestionItems(slashItems, query)
                    }
                  />
                </>
              ) : null}
            </>
          )}
        </BlockNoteView>
      </div>
      {imageCrop && (
        <ImageCropDialog
          open
          source={imageCrop.source}
          file={imageCrop.file}
          aspect={imageCrop.originalAspect}
          aspectOptions={
            [
              { label: "Free", value: undefined },
              { label: "Original", value: imageCrop.originalAspect },
              { label: "Square", value: 1 },
              { label: "4:3", value: 4 / 3 },
              { label: "16:9", value: 16 / 9 },
            ] satisfies ImageCropAspectOption[]
          }
          onOpenChange={(open) => {
            if (!open) setImageCrop(undefined);
          }}
          onCrop={async (file) => {
            const currentBlock = editor.getBlock(imageCrop.blockId);
            if (!currentBlock || currentBlock.type !== "image") {
              throw new Error("The image is no longer available to crop.");
            }

            const uploadedUrl = await onUploadFileRef.current(file);
            const latestBlock = editor.getBlock(imageCrop.blockId);
            if (!latestBlock || latestBlock.type !== "image") {
              throw new Error(
                "The image was removed before cropping finished.",
              );
            }

            editor.updateBlock(imageCrop.blockId, {
              props: { url: uploadedUrl },
            });
          }}
        />
      )}
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
                ? "Choose another note or nested page in this collection."
                : "Only HTTP and HTTPS links are supported."}
            </DialogDescription>
          </DialogHeader>
          {pendingDialog?.kind === "note" ? (
            <Select
              value={selectedNoteUuid}
              onValueChange={(value) => setSelectedNoteUuid(value ?? "")}
            >
              <SelectTrigger className="w-full" aria-label="Select a note">
                <SelectValue placeholder="Select a note">
                  {selectedNoteLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {noteOptions.map((note) => (
                    <SelectItem key={note.uuid} value={note.uuid}>
                      {"— ".repeat(note.depth)}
                      {note.title || "Untitled"}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
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
