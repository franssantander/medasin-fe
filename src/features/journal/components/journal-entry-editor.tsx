"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  Timer,
  Undo2,
  Redo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import type {
  NoteEditorHistoryState,
  NoteRichTextEditorControls,
} from "@/components/ui/note-rich-text-editor-client";
import { EMPTY_NOTE_DOCUMENT } from "@/components/ui/note-editor-document";
import { useJournalAutosave } from "../hooks/use-journal-autosave";
import type { JournalEntry } from "../type";

const noop = () => undefined;
const unavailable = async (): Promise<never> => {
  throw new Error("This action is unavailable in journal entries.");
};

export function JournalEntryEditor({
  entry,
  draftKey,
  onCreated,
  onSaved,
  onRegisterDeleteFlush,
}: {
  entry?: JournalEntry;
  draftKey: number;
  onCreated: (entry: JournalEntry) => void;
  onSaved: (entry: JournalEntry, created: boolean) => void;
  onRegisterDeleteFlush: (flush?: () => Promise<void>) => void;
}) {
  const [historyState, setHistoryState] = useState<NoteEditorHistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [editorControls, setEditorControls] =
    useState<NoteRichTextEditorControls | null>(null);
  const autosave = useJournalAutosave({
    initialUuid: entry?.uuid,
    initialTitle: entry?.title ?? "",
    initialContent: entry?.content ?? EMPTY_NOTE_DOCUMENT,
    initialResourceUuids: entry?.resources.map((resource) => resource.uuid) ?? [],
    onCreated,
    onSaved,
  });
  useEffect(() => {
    onRegisterDeleteFlush(autosave.flush);

    return () => onRegisterDeleteFlush();
  }, [autosave.flush, onRegisterDeleteFlush]);

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-4">
      <div className="grid shrink-0 gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Input
            aria-label="Journal entry title"
            autoFocus={!entry}
            className="h-auto min-w-0 flex-1 border-0 px-0 py-0 text-2xl font-bold shadow-none focus-visible:ring-0 md:text-3xl"
            placeholder="Untitled entry"
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

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="mr-auto text-xs text-muted-foreground"
            aria-live="polite"
          >
            {autosave.saveStatus === "saving" ? (
              "Saving…"
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
            ) : entry?.updated_at ? (
              `Updated ${formatEntryTimestamp(entry.updated_at)}`
            ) : null}
          </span>
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

      {entry?.source && <FocusSource source={entry.source} />}

      <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border bg-white">
        <NoteRichTextEditor
          mode="resource"
          documentId={entry?.uuid ?? `journal-draft-${draftKey}`}
          content={entry?.content ?? EMPTY_NOTE_DOCUMENT}
          editable
          noteOptions={[]}
          onChange={autosave.updateContent}
          onUploadFile={unavailable}
          onCreateChild={unavailable}
          onOpenNote={noop}
          onEditorReady={setEditorControls}
          onHistoryStateChange={setHistoryState}
          onBlur={() => void autosave.flush().catch(() => undefined)}
        />
      </div>

    </div>
  );
}

function FocusSource({
  source,
}: {
  source: NonNullable<JournalEntry["source"]>;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
        <Timer className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Focus reflection</p>
          <Badge variant="secondary">From Focus</Badge>
          {source.mood && (
            <Badge variant="outline" className="capitalize">
              {source.mood}
            </Badge>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {source.task_title && <span>“{source.task_title}”</span>}
          {source.completed_at && (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" aria-hidden="true" />
              {formatEntryTimestamp(source.completed_at)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function formatEntryTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
