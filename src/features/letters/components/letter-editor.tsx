"use client";

import { useEffect, useMemo, useState } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import type {
  NoteEditorHistoryState,
  NoteRichTextEditorControls,
} from "@/components/ui/note-rich-text-editor-client";
import { EMPTY_NOTE_DOCUMENT, getNoteDocumentPreview } from "@/components/ui/note-editor-document";
import { useCreateLetterExportMutation } from "../queries/letter-query";
import { useLetterAutosave } from "../hooks/use-letter-autosave";
import type { Letter, LetterExportFormat } from "../type";
import { LetterExportPanel } from "./letter-export-panel";

const noop = () => undefined;
const unavailable = async (): Promise<never> => {
  throw new Error("File uploads are unavailable in letters.");
};
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
  const [activeExportUuid, setActiveExportUuid] = useState<string>();
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

    const response = await exportMutation.mutateAsync({
      letterUuid: uuid,
      format,
    });
    setActiveExportUuid(response.data.uuid);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(19rem,25rem)] lg:overflow-hidden">
      <div className="flex min-h-[34rem] min-w-0 flex-col gap-4 lg:min-h-0">
        <div className="grid shrink-0 gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Input
              aria-label="Letter title"
              autoFocus={!letter}
              className="h-auto min-w-0 flex-1 border-0 px-0 py-0 text-2xl font-bold shadow-none focus-visible:ring-0 md:text-3xl"
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
          </div>

          <Input
            aria-label="Letter subtitle"
            className="h-auto border-0 px-0 py-0 text-base text-muted-foreground shadow-none focus-visible:ring-0"
            placeholder="Optional subtitle"
            maxLength={240}
            value={autosave.subtitle}
            onChange={(event) => autosave.updateSubtitle(event.target.value)}
            onBlur={() => void autosave.flush().catch(() => undefined)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="mr-auto text-xs text-muted-foreground"
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
              ) : null}
            </span>
            <Badge variant="outline">
              {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
            </Badge>
            <Badge variant="secondary">
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
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <NoteRichTextEditor
            mode="resource"
            documentId={letter?.uuid ?? `letter-draft-${draftKey}`}
            content={autosave.content}
            editable
            noteOptions={[]}
            onChange={autosave.updateContent}
            onUploadFile={unavailable}
            onCreateChild={unavailableChild}
            onOpenNote={noop}
            onEditorReady={setEditorControls}
            onHistoryStateChange={setHistoryState}
            onBlur={() => void autosave.flush().catch(() => undefined)}
          />
        </div>
      </div>

      <LetterExportPanel
        letterUuid={letter?.uuid ?? autosave.activeUuid}
        letterTitle={autosave.title.trim() || "Untitled letter"}
        latestExport={letter?.latest_export}
        activeExportUuid={activeExportUuid}
        onExport={handleExport}
        exportPending={exportMutation.isPending}
        hasUnsavedChanges={
          autosave.saveStatus === "dirty" ||
          autosave.saveStatus === "saving" ||
          autosave.saveStatus === "error"
        }
      />
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
