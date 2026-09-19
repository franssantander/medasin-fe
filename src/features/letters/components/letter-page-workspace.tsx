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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  Download,
  GripVertical,
  ImagePlus,
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
  type RefObject,
} from "react";
import { Button } from "@/components/ui/button";
import {
  ImageCropDialog,
  type ImageCropAspectOption,
} from "@/components/ui/image-crop-dialog";
import { Input } from "@/components/ui/input";
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
import {
  getNoteDocumentPreview,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { parseApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { getImageAspectRatio, imageUrlToFile } from "@/lib/image/crop-image";
import { useLetterPageAutosave } from "../hooks/use-letter-page-autosave";
import { LETTER_EXPORT_FORMATS } from "../letter-export-formats";
import {
  LETTER_COVER_SECTION_LABELS,
  LETTER_COVER_HERO_ASPECT_RATIO,
  normalizeLetterCover,
} from "../letter-cover";
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
  LetterCover,
  LetterCoverSection,
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
const LETTER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);
type CoverCropSession = {
  file: File;
  source: string;
  originalAspect: number;
};

function validateLetterImage(file: File) {
  if (!LETTER_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, GIF, WebP, or AVIF image.");
  }
  if (file.size > MAX_LETTER_IMAGE_REQUEST_BYTES) {
    throw new Error("Images must be 8 MB or smaller.");
  }
}

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
  const editorDraftRef = useRef<{ pageUuid: string; content: string } | null>(null);
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
      const draft = editorDraftRef.current;
      const pagesWithDraft = draft
        ? currentPages.map((page) => {
            if (page.uuid !== draft.pageUuid) return page;

            const blocks = parseNoteDocument(draft.content).blocks;
            if (page.layout !== "cover") return { ...page, blocks };

            return {
              ...page,
              blocks,
              subtitle: getNoteDocumentPreview(draft.content).slice(0, 240) || null,
              cover: {
                ...normalizeLetterCover(page.cover),
                description_blocks: blocks,
              },
            };
          })
        : currentPages;
      const result = await flowLetterPages(
        pagesWithDraft,
        letterExport.canvas,
        letterExport.uuid,
        signal,
      );
      if (
        draft &&
        editorDraftRef.current?.pageUuid === draft.pageUuid &&
        editorDraftRef.current.content === draft.content
      ) {
        editorDraftRef.current = null;
      }
      return result;
    },
    [letterExport.canvas, letterExport.uuid],
  );
  const { flush, getPages, pages, saveStatus, updatePages } = useLetterPageAutosave({
    letterExport,
    letterUuid,
    onSaved,
    preparePages,
    onLayout,
    isComposing: () =>
      Boolean(
        controlsRef.current?.isComposing() ||
          controlsRef.current?.isSlashMenuOpen(),
      ),
  });
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [uploadingCoverImage, setUploadingCoverImage] = useState<
    "avatar" | "hero" | null
  >(null);
  const [coverImageErrors, setCoverImageErrors] = useState<
    Partial<Record<"avatar" | "hero", string>>
  >({});
  const [coverCrop, setCoverCrop] = useState<CoverCropSession>();
  const coverHeroRevisionRef = useRef(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
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
  const selectedIsCoverContinuation =
    selectedPage?.layout !== "cover" &&
    selectedPage?.content_source === "cover_entry";
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
      JSON.stringify(selectedPage.cover ?? null),
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
    if (closingRef.current) return;

    closingRef.current = true;
    setClosing(true);
    commitActiveEditor();
    const pendingSave = flush();
    onOpenChange(false);
    try {
      await pendingSave;
    } catch (error) {
      toast.add({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Your page edits could not be saved. Reopen the workspace and try again.",
      });
    } finally {
      closingRef.current = false;
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

  const rememberEditorDocument = useCallback((content: string) => {
    const pageUuid = selectedUuidRef.current;
    if (pageUuid) editorDraftRef.current = { pageUuid, content };
  }, []);

  const commitActiveEditor = useCallback(() => {
    const pageUuid = selectedUuidRef.current;
    const content = controlsRef.current?.getContent();
    if (!pageUuid || content === undefined) return;

    editorDraftRef.current = { pageUuid, content };
    const blocks = parseNoteDocument(content).blocks;
    const plainText = getNoteDocumentPreview(content);
    updatePages((current) =>
      current.map((page) => {
        if (page.uuid !== pageUuid) return page;
        if (page.layout !== "cover") {
          return serializeNoteDocument(page.blocks) === content
            ? page
            : { ...page, blocks };
        }

        const cover = normalizeLetterCover(page.cover);
        return {
          ...page,
          blocks,
          subtitle: plainText.slice(0, 240) || null,
          cover: { ...cover, description_blocks: blocks },
        };
      }),
    );
  }, [updatePages]);

  const uploadImage = useCallback(
    async (file: File) => {
      try {
        validateLetterImage(file);

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

  const updateCover = useCallback(
    (update: Partial<LetterCover>) => {
      const currentUuid = selectedUuidRef.current;
      if (!currentUuid) return;

      updatePages((current) =>
        current.map((page) =>
          page.uuid === currentUuid && page.layout === "cover"
            ? {
                ...page,
                cover: { ...normalizeLetterCover(page.cover), ...update },
              }
            : page,
        ),
      );
    },
    [updatePages],
  );

  const handleCoverImage = useCallback(
    async (kind: "avatar" | "hero", file?: File) => {
      if (!file) return;
      setCoverImageErrors((current) => ({ ...current, [kind]: undefined }));

      if (kind === "hero") {
        const revision = ++coverHeroRevisionRef.current;
        let source: string | undefined;
        try {
          validateLetterImage(file);
          source = URL.createObjectURL(file);
          const originalAspect = await getImageAspectRatio(source);
          if (revision !== coverHeroRevisionRef.current) {
            URL.revokeObjectURL(source);
            return;
          }
          setCoverCrop({ file, source, originalAspect });
        } catch (error) {
          if (source) URL.revokeObjectURL(source);
          if (revision !== coverHeroRevisionRef.current) return;
          setCoverImageErrors((current) => ({
            ...current,
            hero:
              error instanceof Error
                ? error.message
                : "The image could not be prepared for cropping.",
          }));
        }
        return;
      }

      setUploadingCoverImage(kind);
      try {
        const url = await uploadImage(file);
        updateCover(
          kind === "avatar" ? { avatar_url: url } : { hero_image_url: url },
        );
      } catch (error) {
        setCoverImageErrors((current) => ({
          ...current,
          [kind]:
            error instanceof Error
              ? error.message
              : "The image could not be uploaded.",
        }));
      } finally {
        setUploadingCoverImage(null);
      }
    },
    [updateCover, uploadImage],
  );

  const prepareExistingCoverCrop = useCallback(async () => {
    const revision = ++coverHeroRevisionRef.current;
    const page = getPages().find(
      (item) => item.uuid === selectedUuidRef.current,
    );
    const url = normalizeLetterCover(page?.cover).hero_image_url;
    if (!url) return;

    setCoverImageErrors((current) => ({ ...current, hero: undefined }));
    let source: string | undefined;
    try {
      const file = await imageUrlToFile(url, "cover-image");
      source = URL.createObjectURL(file);
      const originalAspect = await getImageAspectRatio(source);
      if (revision !== coverHeroRevisionRef.current) {
        URL.revokeObjectURL(source);
        return;
      }
      setCoverCrop({ file, source, originalAspect });
    } catch (error) {
      if (source) URL.revokeObjectURL(source);
      if (revision !== coverHeroRevisionRef.current) return;
      setCoverImageErrors((current) => ({
        ...current,
        hero:
          error instanceof Error
            ? error.message
            : "The cover image could not be prepared for cropping.",
      }));
    }
  }, [getPages]);

  const closeCoverCrop = useCallback(() => {
    setCoverCrop(undefined);
  }, []);

  const removeCoverImage = useCallback(() => {
    coverHeroRevisionRef.current += 1;
    closeCoverCrop();
    setUploadingCoverImage((current) => (current === "hero" ? null : current));
    setCoverImageErrors((current) => ({ ...current, hero: undefined }));
    if (heroInputRef.current) heroInputRef.current.value = "";
    updateCover({ hero_image_url: null });
  }, [closeCoverCrop, updateCover]);

  const applyCoverCrop = useCallback(
    async (file: File) => {
      const revision = coverHeroRevisionRef.current;
      setUploadingCoverImage("hero");
      try {
        const url = await uploadImage(file);
        if (revision !== coverHeroRevisionRef.current) return;
        updateCover({ hero_image_url: url });
      } finally {
        setUploadingCoverImage((current) =>
          current === "hero" ? null : current,
        );
      }
    },
    [updateCover, uploadImage],
  );

  useEffect(() => () => {
    if (coverCrop) URL.revokeObjectURL(coverCrop.source);
  }, [coverCrop]);

  useEffect(() => {
    if (
      !open ||
      !selectedPage ||
      selectedPage.layout === "body" ||
      (selectedPage.layout !== "cover" && selectedTextScaleMode !== "auto") ||
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
          selectedPage.layout === "cover"
            ? LETTER_PAGE_TEXT_SCALE_MIN
            : undefined,
        );
        if (nextScale !== selectedTextScale) {
          updateSelected({
            text_scale: nextScale,
            ...(selectedPage.layout === "cover"
              ? { text_scale_mode: "auto" as const }
              : {}),
          });
          return;
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
    commitActiveEditor();
    const page = pages.find((item) => item.uuid === uuid);
    selectedPageNumberRef.current = page?.number ?? 1;
    selectedUuidRef.current = uuid;
    setSelectedUuid(uuid);
    setConfirmingDelete(false);
  }, [commitActiveEditor, pages]);

  const handleTextScaleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelected({
      text_scale: normalizeLetterPageTextScale(Number(event.target.value) / 100),
      text_scale_mode: "manual",
    });
  };

  const duplicatePage = () => {
    if (!selectedPage || selectedPage.layout === "cover" || selectedIsCoverContinuation) return;

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
    if (!selectedPage || selectedPage.layout === "cover" || selectedIsCoverContinuation || pages.length <= 2) return;
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
    if (
      pages[oldIndex]?.content_source === "cover_entry" ||
      pages[newIndex]?.content_source === "cover_entry"
    ) return;
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
      commitActiveEditor();
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
    <>
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
                editable={!selectedIsCoverContinuation}
                onTitleChange={(title) => {
                  updateSelected({ title, text_scale_mode: "auto" });
                }}
                onBlocksChange={(blocks) => updateSelected({ blocks })}
                onCoverBodyChange={(blocks, plainText) => {
                  updateSelected({
                    blocks,
                    subtitle: plainText.slice(0, 240) || null,
                    text_scale_mode: "auto",
                  });
                  updateCover({ description_blocks: blocks });
                }}
                onEditorDocumentChange={rememberEditorDocument}
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
                <p className="text-xs text-muted-foreground">
                  {selectedIsCoverContinuation
                    ? "This page is generated from the cover entry."
                    : "Click the text on the page to edit it directly."}
                </p>
              </div>
              {selectedPage.layout !== "cover" && !selectedIsCoverContinuation ? (
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

            {!selectedIsCoverContinuation ? (
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
            ) : null}

            {selectedIsCoverContinuation ? (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Cover entry continuation</p>
                <p className="text-sm text-muted-foreground">
                  This page is arranged automatically. Edit the complete rich-text entry from the cover page.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => pages[0] && selectPage(pages[0].uuid)}
                >
                  Edit cover entry
                </Button>
              </div>
            ) : selectedPage.layout !== "cover" ? (
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
              <CoverControls
                page={selectedPage}
                uploading={uploadingCoverImage}
                avatarInputRef={avatarInputRef}
                heroInputRef={heroInputRef}
                imageErrors={coverImageErrors}
                onTitleChange={(title) => {
                  updateSelected({ title, text_scale_mode: "auto" });
                }}
                onCoverChange={updateCover}
                onImageChange={(kind, file) =>
                  void handleCoverImage(kind, file)
                }
                onCropCoverImage={() => void prepareExistingCoverCrop()}
                onRemoveCoverImage={removeCoverImage}
              />
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
    {coverCrop ? (
      <ImageCropDialog
        open
        source={coverCrop.source}
        file={coverCrop.file}
        aspect={LETTER_COVER_HERO_ASPECT_RATIO}
        title="Crop cover image"
        description="Choose the area that should appear in the cover image section."
        aspectOptions={
          [
            {
              label: "Cover fit",
              value: LETTER_COVER_HERO_ASPECT_RATIO,
            },
            { label: "Original", value: coverCrop.originalAspect },
            { label: "Free", value: undefined },
            { label: "Square", value: 1 },
            { label: "4:3", value: 4 / 3 },
            { label: "4:5", value: 4 / 5 },
            { label: "16:9", value: 16 / 9 },
            { label: "9:16", value: 9 / 16 },
          ] satisfies ImageCropAspectOption[]
        }
        onOpenChange={(cropOpen) => {
          if (!cropOpen) closeCoverCrop();
        }}
        onCrop={applyCoverCrop}
      />
    ) : null}
    </>
  );
}

function CoverControls({
  page,
  uploading,
  avatarInputRef,
  heroInputRef,
  imageErrors,
  onTitleChange,
  onCoverChange,
  onImageChange,
  onCropCoverImage,
  onRemoveCoverImage,
}: {
  page: LetterPage;
  uploading: "avatar" | "hero" | null;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  heroInputRef: RefObject<HTMLInputElement | null>;
  imageErrors: Partial<Record<"avatar" | "hero", string>>;
  onTitleChange: (value: string) => void;
  onCoverChange: (update: Partial<LetterCover>) => void;
  onImageChange: (kind: "avatar" | "hero", file?: File) => void;
  onCropCoverImage: () => void;
  onRemoveCoverImage: () => void;
}) {
  const cover = normalizeLetterCover(page.cover);
  const coverSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const reorderSections = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = cover.section_order.indexOf(active.id as LetterCoverSection);
    const newIndex = cover.section_order.indexOf(over.id as LetterCoverSection);
    if (oldIndex < 0 || newIndex < 0) return;
    onCoverChange({
      section_order: arrayMove(cover.section_order, oldIndex, newIndex),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Background
        <Select
          value={cover.theme}
          onValueChange={(value) =>
            onCoverChange({ theme: value as LetterCover["theme"] })
          }
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="light">White</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>

      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`cover-logo-${page.uuid}`} className="text-sm font-medium">
          Show Medasin logo
        </label>
        <Switch
          id={`cover-logo-${page.uuid}`}
          checked={cover.show_logo}
          onCheckedChange={(checked) => onCoverChange({ show_logo: checked })}
        />
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Subheader
        <Input
          value={cover.subheader}
          maxLength={80}
          placeholder="A LETTER"
          onChange={(event) => onCoverChange({ subheader: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Title
        <Textarea
          value={page.title ?? ""}
          maxLength={120}
          rows={3}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Author name
        <Input
          value={cover.author_name}
          maxLength={120}
          onChange={(event) => onCoverChange({ author_name: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Date label
        <Input
          value={cover.date_label}
          maxLength={80}
          placeholder="September 10 at 10:35 PM"
          onChange={(event) => onCoverChange({ date_label: event.target.value })}
        />
      </label>

      <CoverImageControl
        label="Avatar image"
        hasImage={Boolean(cover.avatar_url)}
        uploading={uploading === "avatar"}
        error={imageErrors.avatar}
        inputRef={avatarInputRef}
        onFile={(file) => onImageChange("avatar", file)}
        onRemove={() => onCoverChange({ avatar_url: null })}
      />
      <CoverImageControl
        label="Landscape cover image"
        hasImage={Boolean(cover.hero_image_url)}
        uploading={uploading === "hero"}
        error={imageErrors.hero}
        inputRef={heroInputRef}
        onFile={(file) => onImageChange("hero", file)}
        onCrop={onCropCoverImage}
        onRemove={onRemoveCoverImage}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Section order</p>
        <p className="text-xs text-muted-foreground">
          Drag a section or focus its handle and use the keyboard to reorder it.
        </p>
        <DndContext sensors={coverSensors} collisionDetection={closestCenter} onDragEnd={reorderSections}>
          <SortableContext items={cover.section_order} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {cover.section_order.map((section) => (
                <SortableCoverSection key={section} section={section} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function CoverImageControl({
  label,
  hasImage,
  uploading,
  error,
  inputRef,
  onFile,
  onCrop,
  onRemove,
}: {
  label: string;
  hasImage: boolean;
  uploading: boolean;
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file?: File) => void;
  onCrop?: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <ImagePlus data-icon="inline-start" />
          )}
          {uploading ? "Uploading…" : hasImage ? "Replace" : "Upload"}
        </Button>
        {hasImage ? (
          <>
            {onCrop ? (
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={onCrop}>
                Crop
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={onRemove}>
              Remove
            </Button>
          </>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        JPG, PNG, GIF, WebP, or AVIF · max 8 MB.
        {!hasImage ? " Hidden until an image is provided." : ""}
      </p>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SortableCoverSection({ section }: { section: LetterCoverSection }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm",
        isDragging && "opacity-60",
      )}
    >
      <button
        type="button"
        className="flex size-11 touch-none items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-8"
        aria-label={`Reorder ${LETTER_COVER_SECTION_LABELS[section]}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" />
      </button>
      <span>{LETTER_COVER_SECTION_LABELS[section]}</span>
    </div>
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
    disabled: page.layout === "cover" || page.content_source === "cover_entry",
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
      {page.layout !== "cover" && page.content_source !== "cover_entry" ? (
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
