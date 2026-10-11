"use client";

import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  LoaderCircle,
  Redo2,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ImageCropDialog,
  type ImageCropAspectOption,
  type ImageCropMetadata,
} from "@/components/ui/image-crop-dialog";
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
import { toast } from "@/components/ui/toast";
import { parseApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { getImageAspectRatio, imageUrlToFile } from "@/lib/image/crop-image";
import { useLetterPageAutosave } from "../hooks/use-letter-page-autosave";
import {
  LETTER_COVER_HERO_ASPECT_RATIO,
  getLetterPageTheme,
  normalizeLetterCover,
  normalizeLetterCoverHeroAspectRatio,
} from "../letter-cover";
import {
  LetterCoverOverflowError,
  LetterPageOverflowError,
  mapFlowSelection,
  type LetterPageFlowResult,
} from "../letter-page-flow";
import { upsertLetterCache } from "../queries/letter-query";
import { letterService } from "../services/letter-service";
import {
  LETTER_PAGE_TEXT_SCALE_MAX,
  LETTER_PAGE_TEXT_SCALE_MIN,
  LETTER_PAGE_TEXT_SCALE_STEP,
  getLetterPageCanvasBaseline,
  letterPageTextScalePercent,
  normalizeLetterPageTextScale,
  normalizeLetterPageTextScaleMode,
} from "../letter-page-text-scale";
import type {
  Letter,
  LetterCover,
  LetterExport,
  LetterExportFormat,
  LetterPage,
} from "../type";
import {
  LetterCoverInspector,
  type CoverImageKind,
  type StudioTextSize,
} from "./letter-cover-inspector";
import { LetterPageCanvas, LetterPageViewport } from "./letter-page-preview";
import { LetterBodyPageInspector, TextSizePanel } from "./letter-studio-inspector";
import { LetterStudioPageRail } from "./letter-studio-page-rail";
import { LetterStudioTopbar } from "./letter-studio-topbar";

const MAX_LETTER_IMAGE_REQUEST_BYTES = 8 * 1024 * 1024;
const MAX_CROPPED_LETTER_IMAGE_BYTES = 7.5 * 1024 * 1024;
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
  initialAspect: number;
  initialAspectLabel: "Cover fit" | "Current crop";
};

function validateLetterImage(file: File) {
  if (!LETTER_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, GIF, WebP, or AVIF image.");
  }
  if (file.size > MAX_LETTER_IMAGE_REQUEST_BYTES) {
    throw new Error("Images must be 8 MB or smaller.");
  }
}

export function LetterStudio({
  letterExport,
  letterUuid,
  letterTitle,
  format,
  formatDisabled,
  onFormatChange,
  stale,
  staleError,
  onRetry,
}: {
  letterExport: LetterExport;
  letterUuid: string;
  letterTitle: string;
  format: LetterExportFormat;
  formatDisabled: boolean;
  onFormatChange: (format: LetterExportFormat) => void;
  stale: boolean;
  staleError?: string;
  onRetry: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedUuid, setSelectedUuid] = useState(letterExport.pages?.[0]?.uuid);
  const selectedUuidRef = useRef(selectedUuid);
  const selectedPageNumberRef = useRef(1);
  const reflowedExportRef = useRef<string | undefined>(undefined);
  const controlsRef = useRef<NoteRichTextEditorControls | null>(null);
  const editorDraftRef = useRef<{ pageUuid: string; content: string } | null>(null);
  const preparedDraftRef = useRef<{ pageUuid: string; content: string } | null>(null);
  const pendingSelectionRef = useRef<NoteEditorSelection | null>(null);
  const onLayout = useCallback((result: LetterPageFlowResult) => {
    const selection = controlsRef.current?.getSelection();
    const mapped = selection?.focused ? mapFlowSelection(selection, result) : null;
    // Restoring an unchanged selection after every reflow can shift the caret
    // across adjacent formatting runs while the user continues typing.
    const selectionMoved = mapped && (
      mapped.pageUuid !== selectedUuidRef.current ||
      mapped.selection.anchor.blockId !== selection?.anchor.blockId ||
      mapped.selection.anchor.offset !== selection?.anchor.offset ||
      mapped.selection.head.blockId !== selection?.head.blockId ||
      mapped.selection.head.offset !== selection?.head.offset
    );
    const next = mapped
      ? result.pages.find((page) => page.uuid === mapped.pageUuid)
      : result.pages.find((page) => page.uuid === selectedUuidRef.current) ??
        result.pages[Math.min(selectedPageNumberRef.current - 1, result.pages.length - 1)];
    pendingSelectionRef.current = selectionMoved ? mapped.selection : null;
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
      preparedDraftRef.current = draft;
      return result;
    },
    [letterExport.canvas, letterExport.uuid],
  );
  const handleSaved = useCallback(
    (letter: Letter) => upsertLetterCache(queryClient, letter),
    [queryClient],
  );
  const { flush, getPages, pages, saveError, saveStatus, updatePages } = useLetterPageAutosave({
    letterExport,
    letterUuid,
    onSaved: handleSaved,
    onPagesSaved: () => {
      const draft = editorDraftRef.current;
      const prepared = preparedDraftRef.current;
      if (
        draft && prepared &&
        draft.pageUuid === prepared.pageUuid &&
        draft.content === prepared.content
      ) {
        editorDraftRef.current = null;
      }
      preparedDraftRef.current = null;
    },
    preparePages,
    onLayout,
    isComposing: () =>
      Boolean(
        controlsRef.current?.isComposing() ||
          controlsRef.current?.isSlashMenuOpen(),
      ),
  });
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [uploadingCoverImage, setUploadingCoverImage] =
    useState<CoverImageKind | null>(null);
  const [coverImageErrors, setCoverImageErrors] = useState<
    Partial<Record<CoverImageKind, string>>
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
  const selectedPage = pages.find((page) => page.uuid === selectedUuid) ?? pages[0];
  const pageTheme = getLetterPageTheme(pages);
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
  const hasPendingSaves =
    saveStatus === "dirty" ||
    saveStatus === "arranging" ||
    saveStatus === "saving";

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
    if (reflowedExportRef.current === letterExport.uuid) return;

    reflowedExportRef.current = letterExport.uuid;
    updatePages((current) => current);
  }, [letterExport.uuid, updatePages]);

  // Page edits save on a short debounce; warn before a reload or tab close
  // would drop the last ones.
  useEffect(() => {
    if (!hasPendingSaves) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasPendingSaves]);

  const commitActiveEditor = useCallback(() => {
    const pageUuid = selectedUuidRef.current;
    const content = controlsRef.current?.getContent();
    if (!pageUuid || content === undefined) return;

    editorDraftRef.current = { pageUuid, content };
    const blocks = parseNoteDocument(content).blocks;
    const plainText = getNoteDocumentPreview(content);
    const currentPage = getPages().find((page) => page.uuid === pageUuid);
    if (!currentPage) return;

    const blocksMatch = serializeNoteDocument(currentPage.blocks) === content;
    if (currentPage.layout !== "cover" && blocksMatch) return;

    const subtitle = plainText.slice(0, 240) || null;
    if (currentPage.layout === "cover") {
      const cover = normalizeLetterCover(currentPage.cover);
      if (
        blocksMatch &&
        serializeNoteDocument(cover.description_blocks) === content &&
        currentPage.subtitle === subtitle
      ) return;
    }

    updatePages((current) =>
      current.map((page) => {
        if (page.uuid !== pageUuid) return page;
        if (page.layout !== "cover") {
          return { ...page, blocks };
        }

        const cover = normalizeLetterCover(page.cover);
        return {
          ...page,
          blocks,
          subtitle,
          cover: { ...cover, description_blocks: blocks },
        };
      }),
    );
  }, [getPages, updatePages]);

  /** Saves every pending page edit before running `next` (navigation, re-render). */
  const leaveAfterSaving = async (next: () => void) => {
    if (leavingRef.current) return;

    leavingRef.current = true;
    setLeaving(true);
    commitActiveEditor();
    try {
      await flush();
      next();
    } catch (error) {
      toast.add({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Your page edits could not be saved. Try again before leaving.",
      });
    } finally {
      leavingRef.current = false;
      setLeaving(false);
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

  const uploadImage = useCallback(
    async (file: File, { toastOnError = true }: { toastOnError?: boolean } = {}) => {
      try {
        validateLetterImage(file);

        const response = await letterService.uploadMedia(letterUuid, file);
        if (!response.data.url) {
          throw new Error("The upload response did not include a media URL.");
        }

        return response.data.url;
      } catch (error) {
        const uploadError = parseApiError(error);
        const description = uploadError.validationErrors?.file?.[0] ?? (
          uploadError.message.includes("POST Content-Length")
            ? "Images must be smaller than 8 MB."
            : uploadError.message
        );
        if (toastOnError) toast.add({ type: "error", description });
        throw new Error(description);
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
    async (kind: CoverImageKind, file?: File) => {
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
          setCoverCrop({
            file,
            source,
            originalAspect,
            initialAspect: LETTER_COVER_HERO_ASPECT_RATIO,
            initialAspectLabel: "Cover fit",
          });
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
        const url = await uploadImage(file, { toastOnError: false });
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
    const cover = normalizeLetterCover(page?.cover);
    const url = cover.hero_image_url;
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
      setCoverCrop({
        file,
        source,
        originalAspect,
        initialAspect:
          cover.hero_image_aspect_ratio ?? LETTER_COVER_HERO_ASPECT_RATIO,
        initialAspectLabel: "Current crop",
      });
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
    updateCover({
      hero_image_url: null,
      hero_image_aspect_ratio: null,
      hero_image_caption: "",
      hero_image_caption_alignment: "center",
      hero_image_caption_placement: "overlay",
    });
  }, [closeCoverCrop, updateCover]);

  const applyCoverCrop = useCallback(
    async (file: File, metadata: ImageCropMetadata) => {
      const revision = coverHeroRevisionRef.current;
      setUploadingCoverImage("hero");
      try {
        const url = await uploadImage(file, { toastOnError: false });
        if (revision !== coverHeroRevisionRef.current) return;
        updateCover({
          hero_image_url: url,
          hero_image_aspect_ratio: normalizeLetterCoverHeroAspectRatio(
            metadata.aspectRatio,
          ),
        });
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

  const selectPage = useCallback((uuid: string) => {
    commitActiveEditor();
    const page = pages.find((item) => item.uuid === uuid);
    selectedPageNumberRef.current = page?.number ?? 1;
    selectedUuidRef.current = uuid;
    setSelectedUuid(uuid);
    setConfirmingDelete(false);
  }, [commitActiveEditor, pages]);

  const selectRelativePage = (offset: number) => {
    const next = pages[Math.min(pages.length - 1, Math.max(0, selectedIndex + offset))];
    if (next && next.uuid !== selectedPage?.uuid) selectPage(next.uuid);
  };

  const setTextScale = (percent: number) => {
    const textScale = normalizeLetterPageTextScale(percent / 100);
    if (selectedPage?.layout === "cover") {
      updateSelected({ text_scale: textScale, text_scale_mode: "manual" });
      return;
    }
    updatePages((current) => current.map((page) =>
      page.layout === "cover"
        ? page
        : { ...page, text_scale: textScale, text_scale_mode: "manual" },
    ));
  };

  const resetTextScale = () => {
    const textScale = getLetterPageCanvasBaseline(letterExport.canvas);
    if (selectedPage?.layout === "cover") {
      updateSelected({ text_scale: textScale, text_scale_mode: "auto" });
      return;
    }
    updatePages((current) => current.map((page) =>
      page.layout === "cover"
        ? page
        : { ...page, text_scale: textScale, text_scale_mode: "auto" },
    ));
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
  const pageCannotFit =
    saveError instanceof LetterCoverOverflowError ||
    saveError instanceof LetterPageOverflowError;
  const textSize: StudioTextSize = {
    percent: letterPageTextScalePercent(selectedTextScale),
    auto: selectedTextScaleMode === "auto",
    min: LETTER_PAGE_TEXT_SCALE_MIN * 100,
    max: LETTER_PAGE_TEXT_SCALE_MAX * 100,
    step: LETTER_PAGE_TEXT_SCALE_STEP * 100,
    onChange: setTextScale,
    onReset: resetTextScale,
  };
  const saveLabel =
    saveStatus === "arranging" ? "Arranging pages…"
    : saveStatus === "saving" ? "Saving…"
    : saveStatus === "dirty" ? "Unsaved changes"
    : saveStatus === "error" ? "Save failed"
    : saveStatus === "saved" ? "Saved"
    : null;
  const pageLabel =
    selectedPage.layout === "cover" ? "Cover" : `Page ${selectedPage.number}`;

  return (
    <section
      aria-label="Letter studio"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background"
    >
      <LetterStudioTopbar
        letterTitle={letterTitle}
        format={format}
        formatDisabled={formatDisabled || leaving || downloading}
        onFormatChange={(nextFormat) =>
          void leaveAfterSaving(() => onFormatChange(nextFormat))
        }
        onBack={() =>
          void leaveAfterSaving(() => router.push(`/letters/${letterUuid}`))
        }
        backPending={leaving}
        status={saveLabel}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title={`Download ${pageLabel.toLowerCase()} as PNG`}
              disabled={downloading || leaving || pageCannotFit}
              onClick={() => void download(false)}
            >
              <Download data-icon="inline-start" />
              <span className="sr-only lg:not-sr-only">Current page</span>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={downloading || leaving || pageCannotFit}
              onClick={() => void download(true)}
            >
              {downloading ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Download data-icon="inline-start" />}
              {downloading ? `Exporting ${downloadProgress}/${pages.length}` : "Download all"}
            </Button>
          </>
        }
      />

      {stale || staleError ? (
        <div
          role="status"
          className={cn(
            "flex shrink-0 items-center justify-center gap-3 border-b px-4 py-2 text-xs",
            staleError
              ? "bg-destructive/5 text-destructive"
              : "bg-amber-500/10 text-amber-900 dark:text-amber-200",
          )}
        >
          {staleError ? (
            <>
              <span>{staleError}</span>
              <Button type="button" variant="outline" size="xs" onClick={onRetry}>
                <RefreshCw data-icon="inline-start" />
                Try again
              </Button>
            </>
          ) : (
            <>
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              Your letter changed since these pages were made. Updating…
            </>
          )}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(22rem,1fr)_auto] overflow-y-auto lg:grid-cols-[8.5rem_minmax(0,1fr)_22rem] lg:grid-rows-1 lg:overflow-hidden">
        <LetterStudioPageRail
          pages={pages}
          canvas={letterExport.canvas}
          pageTheme={pageTheme}
          selectedUuid={selectedPage.uuid}
          onSelect={selectPage}
          onDragEnd={handleDragEnd}
        />

        <div
          data-studio-canvas=""
          className="flex min-h-0 min-w-0 flex-col bg-muted/50 bg-[radial-gradient(color-mix(in_oklab,var(--muted-foreground)_18%,transparent)_1px,transparent_1px)] [background-size:16px_16px]"
        >
          <div className="min-h-0 flex-1 p-4 sm:p-8">
            <LetterPageViewport
              canvas={letterExport.canvas}
              className="size-full"
              frameClassName="shadow-xl ring-black/5"
              minScale={selectedIsCoverContinuation ? 0 : 0.5}
            >
              <LetterPageCanvas
                key={selectedPage.uuid}
                page={selectedPage}
                canvas={letterExport.canvas}
                exportUuid={letterExport.uuid}
                pageTheme={pageTheme}
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
                onBlur={() => {
                  commitActiveEditor();
                  void flush().catch(() => undefined);
                }}
              />
            </LetterPageViewport>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-background/80 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Undo"
                title="Undo"
                disabled={!historyState.canUndo}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => editorControls?.undo()}
              >
                <Undo2 />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Redo"
                title="Redo"
                disabled={!historyState.canRedo}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => editorControls?.redo()}
              >
                <Redo2 />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="View previous page"
                title="Previous page"
                disabled={selectedIndex === 0}
                onClick={() => selectRelativePage(-1)}
              >
                <ChevronLeft />
              </Button>
              <p
                className="min-w-24 text-center text-xs font-medium tabular-nums"
                aria-live="polite"
              >
                Page {selectedPage.number} of {pages.length}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="View next page"
                title="Next page"
                disabled={selectedIndex === pages.length - 1}
                onClick={() => selectRelativePage(1)}
              >
                <ChevronRight />
              </Button>
            </div>
            <span className="hidden w-[4.5rem] text-right text-xs text-muted-foreground sm:block">
              {letterExport.canvas.width}×{letterExport.canvas.height}
            </span>
          </div>
        </div>

        <aside
          aria-label="Page settings"
          className="flex min-h-0 flex-col overflow-y-auto border-t bg-background lg:border-t-0 lg:border-l"
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <p className="font-medium">{pageLabel}</p>
              <p className="text-xs text-muted-foreground">
                {selectedIsCoverContinuation
                  ? "This page is generated from the cover entry."
                  : "Click the text on the page to edit it directly."}
              </p>
            </div>
            {selectedPage.layout !== "cover" && !selectedIsCoverContinuation ? (
              <div className="flex shrink-0 gap-1">
                {confirmingDelete ? (
                  <>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
                    <Button type="button" variant="destructive" size="sm" onClick={deletePage}><Trash2 data-icon="inline-start" /> Delete</Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Duplicate page" title="Duplicate page" onClick={duplicatePage}><Copy /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete page" title={pages.length <= 2 ? "A letter needs at least one page after the cover" : "Delete page"} disabled={pages.length <= 2} onClick={() => setConfirmingDelete(true)}><Trash2 /></Button>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {saveError ? (
            <p role="alert" className="mx-5 mt-4 rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {saveError.message}
            </p>
          ) : null}

          {selectedIsCoverContinuation ? (
            <div className="m-5 flex flex-col items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
              <p className="text-sm font-medium">Cover entry continuation</p>
              <p className="text-sm text-muted-foreground">
                This page is arranged automatically. Edit the complete rich-text
                entry from the cover page.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => pages[0] && selectPage(pages[0].uuid)}
              >
                Edit cover entry
              </Button>
            </div>
          ) : null}
          {selectedIsCoverContinuation ? (
            <div className="px-5 pb-5">
              <TextSizePanel
                id={`letter-page-text-scale-${selectedPage.uuid}`}
                textSize={textSize}
              />
            </div>
          ) : selectedPage.layout !== "cover" ? (
            <LetterBodyPageInspector
              page={selectedPage}
              isLastPage={selectedIndex === pages.length - 1}
              textSize={textSize}
              onLayoutChange={(layout) => updateSelected({ layout })}
              onSignatureChange={(signature) => updateSelected({ signature })}
            />
          ) : (
            <LetterCoverInspector
              page={selectedPage}
              textSize={textSize}
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

      {coverCrop ? (
        <ImageCropDialog
          open
          source={coverCrop.source}
          file={coverCrop.file}
          aspect={coverCrop.initialAspect}
          maxBytes={MAX_CROPPED_LETTER_IMAGE_BYTES}
          title="Crop cover image"
          description="Choose the area that should appear in the cover image section."
          aspectOptions={
            [
              {
                label: coverCrop.initialAspectLabel,
                value: coverCrop.initialAspect,
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
    </section>
  );
}

function duplicateBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((value) => {
    const block = structuredClone(value) as Record<string, unknown>;
    return { ...block, id: crypto.randomUUID(), ...(Array.isArray(block.children) ? { children: duplicateBlocks(block.children) } : {}) };
  });
}
