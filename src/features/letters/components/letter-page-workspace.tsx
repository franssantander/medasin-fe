"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  Download,
  GripVertical,
  LoaderCircle,
  Redo2,
  RotateCcw,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  NoteEditorHistoryState,
  NoteEditorSelection,
  NoteRichTextEditorControls,
} from "@/components/ui/note-rich-text-editor-client";
import { serializeNoteDocument } from "@/components/ui/note-editor-document";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { parseApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useLetterPageAutosave } from "../hooks/use-letter-page-autosave";
import { LETTER_EXPORT_FORMATS } from "../letter-export-formats";
import { mapFlowSelection, type LetterPageFlowResult } from "../letter-page-flow";
import { measureLetterPage } from "../letter-page-renderer";
import { letterService } from "../services/letter-service";
import {
  LETTER_PAGE_TEXT_SCALE_MAX,
  LETTER_PAGE_TEXT_SCALE_MIN,
  LETTER_PAGE_TEXT_SCALE_STEP,
  getLetterPageAutoFitScale,
  getLetterPageCanvasBaseline,
  letterPageTextScalePercent,
  normalizeLetterPageTextScale,
  normalizeLetterPageTextScaleMode,
} from "../letter-page-text-scale";
import type {
  Letter,
  LetterExport,
  LetterPage,
  LetterPageLayout,
} from "../type";
import {
  LetterPageCanvas,
  LetterPageThumbnail,
  LetterPageViewport,
} from "./letter-page-preview";

const MAX_LETTER_IMAGE_REQUEST_BYTES = 8 * 1024 * 1024;

export function LetterPageWorkspace({
  open,
  onOpenChange,
  letterExport,
  letterUuid,
  letterTitle,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterExport: LetterExport;
  letterUuid: string;
  letterTitle: string;
  onSaved: (letter: Letter) => void;
}) {
  const [selectedUuid, setSelectedUuid] = useState(letterExport.pages?.[0]?.uuid);
  const selectedUuidRef = useRef(selectedUuid);
  const selectedPageNumberRef = useRef(1);
  const reflowedExportRef = useRef<string | undefined>(undefined);
  const controlsRef = useRef<NoteRichTextEditorControls | null>(null);
  const pendingSelectionRef = useRef<NoteEditorSelection | null>(null);
  const onLayout = useCallback((result: LetterPageFlowResult) => {
    const selection = controlsRef.current?.getSelection();
    const mapped = selection?.focused ? mapFlowSelection(selection, result) : null;
    const next = mapped
      ? result.pages.find((page) => page.uuid === mapped.pageUuid)
      : result.pages.find((page) => page.uuid === selectedUuidRef.current) ??
        result.pages[Math.min(selectedPageNumberRef.current - 1, result.pages.length - 1)];
    if (mapped) pendingSelectionRef.current = mapped.selection;
    if (next) {
      selectedUuidRef.current = next.uuid;
      selectedPageNumberRef.current = next.number;
      setSelectedUuid(next.uuid);
    }
  }, []);
  const preparePages = useCallback(
    async (currentPages: LetterPage[], signal: AbortSignal) => {
      const { flowLetterPages } = await import("../letter-page-flow");
      return flowLetterPages(
        currentPages,
        letterExport.canvas,
        letterExport.uuid,
        signal,
      );
    },
    [letterExport.canvas, letterExport.uuid],
  );
  const { flush, getPages, pages, saveStatus, updatePages } = useLetterPageAutosave({
    letterExport,
    letterUuid,
    onSaved,
    preparePages,
    onLayout,
    isComposing: () => controlsRef.current?.isComposing() ?? false,
  });
  const [closing, setClosing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [historyState, setHistoryState] = useState<NoteEditorHistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [editorControls, setEditorControls] =
    useState<NoteRichTextEditorControls | null>(null);
  const restorePendingSelection = useCallback(() => {
    if (pendingSelectionRef.current && controlsRef.current) {
      controlsRef.current.restoreSelection(pendingSelectionRef.current);
      pendingSelectionRef.current = null;
    }
  }, []);
  const handleEditorReady = useCallback((controls: NoteRichTextEditorControls | null) => {
    controlsRef.current = controls;
    setEditorControls(controls);
    restorePendingSelection();
  }, [restorePendingSelection]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const autoFitKeyRef = useRef<string | undefined>(undefined);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const format = LETTER_EXPORT_FORMATS[letterExport.format];
  const selectedPage = pages.find((page) => page.uuid === selectedUuid) ?? pages[0];
  const selectedIndex = selectedPage
    ? pages.findIndex((page) => page.uuid === selectedPage.uuid)
    : 0;
  const selectedTextScale = normalizeLetterPageTextScale(
    selectedPage?.text_scale,
  );
  const selectedTextScaleMode = normalizeLetterPageTextScaleMode(
    selectedPage?.text_scale_mode,
    selectedPage?.text_scale,
  );
  const selectedContentKey = useMemo(() => {
    if (!selectedPage) return "";

    return JSON.stringify([
      selectedPage.uuid,
      selectedPage.layout,
      selectedPage.title ?? "",
      selectedPage.subtitle ?? "",
      serializeNoteDocument(selectedPage.blocks),
      letterExport.canvas.width,
      letterExport.canvas.height,
    ]);
  }, [
    letterExport.canvas.height,
    letterExport.canvas.width,
    selectedPage,
  ]);

  useEffect(() => {
    selectedUuidRef.current = selectedUuid;
  }, [selectedUuid]);

  useEffect(() => {
    if (pages.some((page) => page.uuid === selectedUuidRef.current)) return;
    const next =
      pages[Math.min(selectedPageNumberRef.current - 1, pages.length - 1)] ??
      pages[0];
    selectedUuidRef.current = next?.uuid;
    setSelectedUuid(next?.uuid);
  }, [pages]);

  useEffect(() => {
    if (!open) {
      reflowedExportRef.current = undefined;
      return;
    }
    if (reflowedExportRef.current === letterExport.uuid) return;

    reflowedExportRef.current = letterExport.uuid;
    updatePages((current) => current);
  }, [letterExport.uuid, open, updatePages]);

  const pageIds = useMemo(() => pages.map((page) => page.uuid), [pages]);

  const requestClose = async (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    setClosing(true);
    try {
      await flush();
      onOpenChange(false);
    } catch (error) {
      toast.add({ type: "error", description: error instanceof Error ? error.message : "Your page edits could not be saved. Try again before closing." });
    } finally {
      setClosing(false);
    }
  };

  const updateSelected = useCallback((update: Partial<LetterPage>) => {
    const currentUuid = selectedUuidRef.current;
    if (!currentUuid) return;

    updatePages((current) =>
      current.map((page) =>
        page.uuid === currentUuid ? { ...page, ...update } : page,
      ),
    );
  }, [updatePages]);

  const uploadImage = useCallback(
    async (file: File) => {
      try {
        if (!file.type.startsWith("image/")) {
          throw new Error("Letter pages only support image uploads.");
        }
        if (file.size >= MAX_LETTER_IMAGE_REQUEST_BYTES) {
          throw new Error("Images must be smaller than 8 MB.");
        }

        const response = await letterService.uploadMedia(letterUuid, file);
        if (!response.data.url) {
          throw new Error("The upload response did not include a media URL.");
        }

        return response.data.url;
      } catch (error) {
        const uploadError = parseApiError(error);
        const description = uploadError.message.includes("POST Content-Length")
          ? "Images must be smaller than 8 MB."
          : uploadError.message;
        toast.add({ type: "error", description });
        throw uploadError;
      }
    },
    [letterUuid],
  );

  useEffect(() => {
    if (
      !open ||
      !selectedPage ||
      selectedPage.layout === "body" ||
      selectedTextScaleMode !== "auto" ||
      !selectedContentKey
    ) {
      autoFitKeyRef.current = undefined;
      return;
    }

    const fitKey = selectedContentKey;
    let frame: number | undefined;
    let retryFrame: number | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;

    const scheduleMeasure = () => {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        const baseline = getLetterPageCanvasBaseline(letterExport.canvas);

        if (autoFitKeyRef.current !== fitKey) {
          autoFitKeyRef.current = fitKey;
          if (selectedTextScale !== baseline) {
            updateSelected({ text_scale: baseline });
            return;
          }
        }

        const measured = canvasRef.current
          ? measureLetterPage(canvasRef.current)
          : null;
        if (!measured) return;

        const nextScale = getLetterPageAutoFitScale(
          selectedTextScale,
          measured.availableHeight,
          measured.contentHeight,
        );
        if (nextScale !== selectedTextScale) {
          updateSelected({ text_scale: nextScale });
        }
      });
    };

    const observeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        retryFrame = window.requestAnimationFrame(observeCanvas);
        return;
      }

      const observer = new ResizeObserver(() => scheduleMeasure());
      resizeObserver = observer;
      mutationObserver = new MutationObserver(() => {
        const content = canvas.querySelector<HTMLElement>("[data-page-content]");
        if (content) {
          observer.observe(content);
          const editor = content.querySelector<HTMLElement>(".bn-editor");
          if (editor) {
            observer.observe(editor);
            const blockGroup = editor.querySelector<HTMLElement>(".bn-block-group");
            if (blockGroup) observer.observe(blockGroup);
          }
        }
        scheduleMeasure();
      });

      observer.observe(canvas);
      mutationObserver.observe(canvas, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      scheduleMeasure();
    };

    observeCanvas();

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (retryFrame !== undefined) window.cancelAnimationFrame(retryFrame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [
    letterExport.canvas,
    open,
    selectedContentKey,
    selectedPage,
    selectedTextScale,
    selectedTextScaleMode,
    updateSelected,
  ]);

  const selectPage = useCallback((uuid: string) => {
    const page = pages.find((item) => item.uuid === uuid);
    selectedPageNumberRef.current = page?.number ?? 1;
    selectedUuidRef.current = uuid;
    setSelectedUuid(uuid);
    setConfirmingDelete(false);
  }, [pages]);

  const handleTextScaleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelected({
      text_scale: normalizeLetterPageTextScale(Number(event.target.value) / 100),
      text_scale_mode: "manual",
    });
  };

  const duplicatePage = () => {
    if (!selectedPage || selectedPage.layout === "cover") return;

    const duplicate = {
      ...selectedPage,
      uuid: crypto.randomUUID(),
      blocks: duplicateBlocks(selectedPage.blocks),
    };
    updatePages((current) => {
      const next = [...current];
      next.splice(selectedIndex + 1, 0, duplicate);
      return next;
    });
    selectedUuidRef.current = duplicate.uuid;
    setSelectedUuid(duplicate.uuid);
    setConfirmingDelete(false);
  };

  const deletePage = () => {
    if (!selectedPage || selectedPage.layout === "cover" || pages.length <= 2) return;
    const fallback = pages[selectedIndex - 1] ?? pages[selectedIndex + 1];
    updatePages((current) => current.filter((page) => page.uuid !== selectedPage.uuid));
    selectedUuidRef.current = fallback?.uuid;
    setSelectedUuid(fallback?.uuid);
    setConfirmingDelete(false);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((page) => page.uuid === active.id);
    const newIndex = pages.findIndex((page) => page.uuid === over.id);
    if (oldIndex <= 0 || newIndex <= 0) return;
    updatePages((current) => arrayMove(current, oldIndex, newIndex));
  };

  const download = async (all: boolean) => {
    if (!selectedPage) return;
    setDownloading(true);
    setDownloadProgress(0);
    try {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      await Promise.resolve();
      await flush();
      const latestPages = getPages();
      const latestSelectedPage =
        latestPages.find((page) => page.uuid === selectedUuidRef.current) ??
        latestPages[Math.min(selectedPage.number - 1, latestPages.length - 1)];
      const currentExport = {
        ...letterExport,
        pages: latestPages,
        page_count: latestPages.length,
      };
      const downloadModule = await import("../letter-page-download");
      if (all) {
        await downloadModule.downloadLetterPages(
          currentExport,
          latestPages,
          letterTitle,
          (completed) => setDownloadProgress(completed),
        );
      } else {
        await downloadModule.downloadLetterPage(
          currentExport,
          latestSelectedPage,
          letterTitle,
        );
      }
      toast.add({ type: "success", description: all ? "Page ZIP downloaded." : `Page ${selectedPage.number} downloaded.` });
    } catch (error) {
      toast.add({
        type: "error",
        description: error instanceof Error ? error.message : "The page images could not be created.",
      });
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (!selectedPage) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => void requestClose(nextOpen)}>
      <DialogContent
        showCloseButton={!closing && !downloading}
        className="h-[calc(100dvh-1rem)] max-h-none w-[calc(100%-1rem)] max-w-none gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div>
              <DialogTitle>Prepare social pages</DialogTitle>
              <DialogDescription>
                {format.label} · {format.width} × {format.height}px · {format.ratio}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {saveStatus === "arranging" ? "Arranging pages…" : saveStatus === "saving" ? "Saving…" : saveStatus === "dirty" ? "Unsaved changes" : saveStatus === "error" ? "Save failed" : saveStatus === "saved" ? "Saved" : null}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={downloading || closing} onClick={() => void download(false)}>
                <Download data-icon="inline-start" />
                Current page
              </Button>
              <Button type="button" size="sm" disabled={downloading || closing} onClick={() => void download(true)}>
                {downloading ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Download data-icon="inline-start" />}
                {downloading ? `Exporting ${downloadProgress}/${pages.length}` : "Download all"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(18rem,1fr)_minmax(18rem,auto)] overflow-y-auto lg:grid-cols-[8.5rem_minmax(20rem,1fr)_minmax(20rem,28rem)] lg:grid-rows-1 lg:overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pageIds} strategy={horizontalListSortingStrategy}>
              <nav aria-label="Pages" className="flex min-w-0 gap-2 overflow-x-auto border-b p-3 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0">
                {pages.map((page) => (
                  <SortablePage
                    key={page.uuid}
                    page={page}
                    canvas={letterExport.canvas}
                    selected={page.uuid === selectedPage.uuid}
                    onSelect={() => selectPage(page.uuid)}
                  />
                ))}
              </nav>
            </SortableContext>
          </DndContext>

          <main className="min-h-0 overflow-hidden bg-muted/30 p-4 sm:p-6">
            <LetterPageViewport
              canvas={letterExport.canvas}
              className="size-full"
            >
              <LetterPageCanvas
                key={selectedPage.uuid}
                ref={canvasRef}
                page={selectedPage}
                canvas={letterExport.canvas}
                exportUuid={letterExport.uuid}
                textScale={selectedTextScale}
                editable
                onTitleChange={(title) => updateSelected({ title })}
                onSubtitleChange={(subtitle) =>
                  updateSelected({ subtitle: subtitle || null })
                }
                onBlocksChange={(blocks) => updateSelected({ blocks })}
                onUploadFile={uploadImage}
                onEditorReady={handleEditorReady}
                onContentApplied={restorePendingSelection}
                onHistoryStateChange={setHistoryState}
                onBlur={() => void flush().catch(() => undefined)}
              />
            </LetterPageViewport>
          </main>

          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t p-4 lg:border-t-0 lg:border-l sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{selectedPage.layout === "cover" ? "Cover" : `Page ${selectedPage.number}`}</p>
                <p className="text-xs text-muted-foreground">Click the text on the page to edit it directly.</p>
              </div>
              {selectedPage.layout !== "cover" ? (
                <div className="flex gap-1">
                  {confirmingDelete ? (
                    <>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
                      <Button type="button" variant="destructive" size="sm" onClick={deletePage}><Trash2 data-icon="inline-start" /> Delete</Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Duplicate page" title="Duplicate page" onClick={duplicatePage}><Copy /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete page" title="Delete page" disabled={pages.length <= 2} onClick={() => setConfirmingDelete(true)}><Trash2 /></Button>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-b pb-4">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor={`letter-page-text-scale-${selectedPage.uuid}`}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Type aria-hidden="true" />
                  Text size
                </label>
                <output
                  htmlFor={`letter-page-text-scale-${selectedPage.uuid}`}
                  className="text-sm tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  {selectedTextScaleMode === "auto" ? "Auto · " : ""}
                  {letterPageTextScalePercent(selectedTextScale)}%
                </output>
              </div>
              <input
                id={`letter-page-text-scale-${selectedPage.uuid}`}
                type="range"
                min={LETTER_PAGE_TEXT_SCALE_MIN * 100}
                max={LETTER_PAGE_TEXT_SCALE_MAX * 100}
                step={LETTER_PAGE_TEXT_SCALE_STEP * 100}
                value={letterPageTextScalePercent(selectedTextScale)}
                onChange={handleTextScaleChange}
                className="h-11 w-full cursor-pointer accent-foreground"
                aria-label="Text size"
                aria-valuetext={`${letterPageTextScalePercent(selectedTextScale)}%${selectedTextScaleMode === "auto" ? " automatic" : " manual"}`}
              />
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{LETTER_PAGE_TEXT_SCALE_MIN * 100}%</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={selectedTextScaleMode === "auto"}
                  onClick={() =>
                    updateSelected({
                      text_scale: getLetterPageCanvasBaseline(letterExport.canvas),
                      text_scale_mode: "auto",
                    })
                  }
                >
                  <RotateCcw data-icon="inline-start" />
                  Reset
                </Button>
                <span>{LETTER_PAGE_TEXT_SCALE_MAX * 100}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedPage.layout === "body"
                  ? "Text flows between pages at the selected size. Reset restores the default size for this format."
                  : selectedTextScaleMode === "auto"
                  ? "Auto-fits this page to its canvas. Use the slider to override it."
                  : "Manual override for this page. Reset to let it auto-fit again."} Branding and signatures stay fixed.
              </p>
            </div>

            {selectedPage.layout !== "cover" ? (
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Page layout
                  <Select value={selectedPage.layout} onValueChange={(value) => updateSelected({ layout: value as LetterPageLayout })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectItem value="body">Body text</SelectItem><SelectItem value="quote">Featured quote</SelectItem></SelectGroup></SelectContent>
                  </Select>
                </label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!historyState.canUndo}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => editorControls?.undo()}
                  >
                    <Undo2 data-icon="inline-start" />
                    Undo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!historyState.canRedo}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => editorControls?.redo()}
                  >
                    <Redo2 data-icon="inline-start" />
                    Redo
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select text on the page to open formatting controls for headings, emphasis, alignment, and links.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                The cover title and subtitle are plain text so the prepared design remains consistent.
              </p>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SortablePage({
  page,
  canvas,
  selected,
  onSelect,
}: {
  page: LetterPage;
  canvas: LetterExport["canvas"];
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.uuid,
    disabled: page.layout === "cover",
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative w-20 shrink-0 lg:w-full", isDragging && "opacity-60")}
    >
      <button
        type="button"
        className="w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Edit page ${page.number}`}
        aria-current={selected ? "page" : undefined}
        onClick={onSelect}
      >
        <LetterPageThumbnail page={page} canvas={canvas} selected={selected} />
      </button>
      {page.layout !== "cover" ? (
        <button
          type="button"
          className="absolute top-1 right-1 flex size-11 touch-none items-center justify-center rounded-md bg-white/90 text-zinc-700 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-8"
          aria-label={`Reorder page ${page.number}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function duplicateBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((value) => {
    const block = structuredClone(value) as Record<string, unknown>;
    return { ...block, id: crypto.randomUUID(), ...(Array.isArray(block.children) ? { children: duplicateBlocks(block.children) } : {}) };
  });
}
