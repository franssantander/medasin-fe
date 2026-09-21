"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Redo2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type {
  NoteEditorHistoryState,
  NoteRichTextEditorControls,
} from "@/components/ui/note-rich-text-editor-client";
import { EMPTY_NOTE_DOCUMENT, getNoteDocumentPreview } from "@/components/ui/note-editor-document";
import { parseApiError } from "@/lib/axios";
import { useCreateLetterExportMutation } from "../queries/letter-query";
import { useLetterAutosave } from "../hooks/use-letter-autosave";
import type { Letter, LetterExportFormat } from "../type";
import { letterService } from "../services/letter-service";
import { LetterExportPanel } from "./letter-export-panel";

const noop = () => undefined;
const MAX_LETTER_IMAGE_REQUEST_BYTES = 8 * 1024 * 1024;
const unavailableChild = async (): Promise<never> => {
  throw new Error("Child pages are unavailable in letters.");
};

export function LetterEditor({
  letter,
  draftKey,
  onCreated,
  onSaved,
  onRegisterDeleteFlush,
}: {
  letter?: Letter;
  draftKey: number;
  onCreated: (letter: Letter) => void;
  onSaved: (letter: Letter, created: boolean) => void;
  onRegisterDeleteFlush: (
    flush?: () => Promise<Letter | undefined>,
  ) => void;
}) {
  const [historyState, setHistoryState] = useState<NoteEditorHistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [editorControls, setEditorControls] =
    useState<NoteRichTextEditorControls | null>(null);
  const [formattingToolbarContainer, setFormattingToolbarContainer] =
    useState<HTMLDivElement | null>(null);
  const [activeExportUuid, setActiveExportUuid] = useState<string>();
  const [exportOpen, setExportOpen] = useState(false);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [editorRevision, setEditorRevision] = useState(0);
  const autosave = useLetterAutosave({
    initialUuid: letter?.uuid,
    initialTitle: letter?.title ?? "",
    initialSubtitle: letter?.subtitle ?? "",
    initialContent: letter?.content ?? EMPTY_NOTE_DOCUMENT,
    onCreated,
    onSaved,
  });
  const exportMutation = useCreateLetterExportMutation();
  const contentPreview = useMemo(
    () => getNoteDocumentPreview(autosave.content),
    [autosave.content],
  );
  const wordCount = countWords(contentPreview);
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const handlePagesSaved = useCallback(
    (savedLetter: Letter) => {
      autosave.replaceSavedLetter(savedLetter);
      setEditorRevision((revision) => revision + 1);
      onSaved(savedLetter, false);
    },
    [autosave, onSaved],
  );

  useEffect(() => {
    onRegisterDeleteFlush(autosave.flush);

    return () => onRegisterDeleteFlush();
  }, [autosave.flush, onRegisterDeleteFlush]);

  const handleExport = async (format: LetterExportFormat) => {
    const savedLetter = await autosave.flush(true);
    const uuid = savedLetter?.uuid ?? autosave.activeUuid ?? letter?.uuid;

    if (!uuid) {
      throw new Error("Save the letter before preparing its pages.");
    }

    const currentLetter = savedLetter ?? letter;
    if (!currentLetter) {
      throw new Error("The saved letter could not be loaded for pagination.");
    }

    const { prepareLetterPages } = await import("../letter-page-flow");
    const pages = await prepareLetterPages(currentLetter, format);
    const response = await exportMutation.mutateAsync({
      letterUuid: uuid,
      format,
      pages,
      silent: true,
    });
    setActiveExportUuid(response.data.uuid);
  };

  const handleUploadImage = useCallback(
    async (file: File) => {
      try {
        if (!file.type.startsWith("image/")) {
          throw new Error("Letters only support image uploads.");
        }
        if (file.size >= MAX_LETTER_IMAGE_REQUEST_BYTES) {
          throw new Error("Images must be smaller than 8 MB.");
        }

        const savedLetter = await autosave.flush(true);
        const uuid = savedLetter?.uuid ?? autosave.activeUuid ?? letter?.uuid;
        if (!uuid) {
          throw new Error("The letter could not be saved before uploading.");
        }

        const response = await letterService.uploadMedia(uuid, file);
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
    [autosave, letter],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b bg-background/95 px-3 py-2 sm:px-5">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2">
          <span
            className="mr-auto truncate text-xs text-muted-foreground"
            aria-live="polite"
          >
            {autosave.saveStatus === "saving" ? (
              "Saving..."
            ) : autosave.saveStatus === "dirty" ? (
              "Unsaved changes"
            ) : autosave.saveStatus === "saved" ? (
              "Saved"
            ) : autosave.saveStatus === "error" ? (
              <button
                type="button"
                className="text-destructive underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void autosave.flush().catch(() => undefined)}
              >
                Retry save
              </button>
            ) : letter?.updated_at ? (
              `Updated ${formatEditorTimestamp(letter.updated_at)}`
            ) : (
              "Ready to write"
            )}
          </span>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
          </Badge>
          <Badge variant="secondary" className="hidden md:inline-flex">
            {readTimeMinutes} {readTimeMinutes === 1 ? "min" : "mins"} read
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Undo editor change"
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
            aria-label="Redo editor change"
            title="Redo"
            disabled={!historyState.canRedo}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => editorControls?.redo()}
          >
            <Redo2 />
          </Button>
          <Button type="button" size="sm" onClick={() => setExportOpen(true)}>
            <FileText data-icon="inline-start" />
            <span className="hidden sm:inline">Preview pages</span>
            <span className="sr-only sm:hidden">Preview pages</span>
          </Button>
        </div>
      </div>

      <div className="shrink-0 border-b bg-muted/30 px-3 py-1.5 sm:px-5">
        <div className="mx-auto flex min-h-10 w-full max-w-4xl items-center gap-3">
          <span className="hidden shrink-0 text-xs font-medium text-muted-foreground lg:inline">
            Format
          </span>
          <div
            ref={setFormattingToolbarContainer}
            role="toolbar"
            aria-label="Letter formatting"
            className="letter-formatting-toolbar min-w-0 flex-1 overflow-x-auto"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col bg-background px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
          <div className="grid shrink-0 gap-4 sm:px-[3.25rem]">
            <Textarea
              aria-label="Letter title"
              autoFocus={!letter}
              rows={1}
              className="min-h-0 resize-none overflow-hidden border-0 bg-transparent px-0 py-0 font-spectral text-4xl leading-[1.08] font-semibold tracking-[-0.025em] text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 md:text-5xl dark:bg-transparent"
              placeholder="Untitled letter"
              maxLength={120}
              value={autosave.title}
              onChange={(event) => autosave.updateTitle(event.target.value)}
              onBlur={() => void autosave.flush().catch(() => undefined)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) {
                  return;
                }

                event.preventDefault();
                editorControls?.focusFirstBlock();
              }}
            />
            <Textarea
              aria-label="Letter subtitle"
              rows={1}
              className="min-h-0 max-w-[65ch] resize-none overflow-hidden border-0 bg-transparent px-0 py-0 text-lg leading-relaxed font-normal text-muted-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 sm:text-xl dark:bg-transparent"
              placeholder="Add a short description for your letter"
              maxLength={240}
              value={autosave.subtitle}
              onChange={(event) => autosave.updateSubtitle(event.target.value)}
              onBlur={() => void autosave.flush().catch(() => undefined)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) {
                  return;
                }

                event.preventDefault();
                editorControls?.focusFirstBlock();
              }}
            />
          </div>

          <div className="letter-composer-document mt-10 flex min-h-[32rem] min-w-0 flex-1 overflow-hidden border-t bg-background pt-7">
            <NoteRichTextEditor
              mode="letter"
              formattingToolbarMode="persistent"
              formattingToolbarContainer={formattingToolbarContainer}
              documentId={`${letter?.uuid ?? `letter-draft-${draftKey}`}-${editorRevision}`}
              content={autosave.content}
              editable
              noteOptions={[]}
              onChange={autosave.updateContent}
              onUploadFile={handleUploadImage}
              onCreateChild={unavailableChild}
              onOpenNote={noop}
              onEditorReady={setEditorControls}
              onHistoryStateChange={setHistoryState}
              onBlur={() => void autosave.flush().catch(() => undefined)}
            />
          </div>
        </div>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent
          className="h-[calc(100dvh-1rem)] max-h-none w-[calc(100%-1rem)] max-w-6xl gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Preview letter pages</DialogTitle>
            <DialogDescription>
              Review, customize, and download your letter as social pages.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden p-3 pt-12 sm:p-4 sm:pt-12">
            <LetterExportPanel
              className="h-full rounded-none border-0 bg-transparent p-0 shadow-none"
              letterUuid={letter?.uuid ?? autosave.activeUuid}
              letterTitle={autosave.title.trim() || "Untitled letter"}
              latestExport={letter?.latest_export}
              activeExportUuid={activeExportUuid}
              onExport={handleExport}
              onPagesSaved={handlePagesSaved}
              selectedPageIndex={previewPageIndex}
              onSelectedPageIndexChange={setPreviewPageIndex}
              exportPending={exportMutation.isPending}
              hasUnsavedChanges={
                autosave.saveStatus === "dirty" ||
                autosave.saveStatus === "saving" ||
                autosave.saveStatus === "error"
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function countWords(value: string) {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

function formatEditorTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
