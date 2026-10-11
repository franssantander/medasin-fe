"use client";

import { useTheme } from "next-themes";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronRight,
  Ellipsis,
  LoaderCircle,
  Redo2,
  Sparkles,
  Timer,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import type {
  NoteEditorHistoryState,
  NoteRichTextEditorControls,
} from "@/components/ui/note-rich-text-editor-client";
import { EMPTY_NOTE_DOCUMENT } from "@/components/ui/note-editor-document";
import { IconTooltipButton } from "@/features/notes/components/note-page-sidebar";
import {
  useJournalAutosave,
  type JournalSaveStatus,
} from "../hooks/use-journal-autosave";
import {
  JOURNAL_TIME_OF_DAY_LABEL,
  countWords,
  formatDateStamp,
  formatEntryTimestamp,
  getTimeOfDay,
  journalEntryTitle,
  pickJournalPrompts,
} from "../journal-utils";
import type { JournalEntry } from "../type";
import type { JournalDeleteTarget } from "./journal-delete-dialog";
import { JournalEntryProperties } from "./journal-entry-properties";

const noop = () => undefined;
const unavailable = async (): Promise<never> => {
  throw new Error("This action is unavailable in journal entries.");
};

export function JournalEntryEditor({
  entry,
  draftKey,
  leading,
  onCreated,
  onSaved,
  onRegisterDeleteFlush,
  onRequestDelete,
}: {
  entry?: JournalEntry;
  draftKey: number;
  leading?: ReactNode;
  onCreated: (entry: JournalEntry) => void;
  onSaved: (entry: JournalEntry, created: boolean) => void;
  onRegisterDeleteFlush: (flush?: () => Promise<void>) => void;
  onRequestDelete: (target: JournalDeleteTarget) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [openedAt] = useState(() => new Date());
  const [historyState, setHistoryState] = useState<NoteEditorHistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [editorControls, setEditorControls] =
    useState<NoteRichTextEditorControls | null>(null);
  const [wordCount, setWordCount] = useState(() =>
    countWords(entry?.content ?? EMPTY_NOTE_DOCUMENT),
  );
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const autosave = useJournalAutosave({
    initialUuid: entry?.uuid,
    initialTitle: entry?.title ?? "",
    initialContent: entry?.content ?? EMPTY_NOTE_DOCUMENT,
    initialResourceUuids: entry?.resources.map((resource) => resource.uuid) ?? [],
    onCreated,
    onSaved,
  });
  const { updateContent } = autosave;

  useEffect(() => {
    onRegisterDeleteFlush(autosave.flush);

    return () => onRegisterDeleteFlush();
  }, [autosave.flush, onRegisterDeleteFlush]);

  const handleContentChange = useCallback(
    (content: string) => {
      updateContent(content);
      setWordCount(countWords(content));
    },
    [updateContent],
  );

  const fitTitle = useCallback(() => {
    const title = titleRef.current;
    if (!title) return;

    title.style.height = "auto";
    title.style.height = `${title.scrollHeight}px`;
  }, []);

  useLayoutEffect(fitTitle, [autosave.title, fitTitle]);

  useEffect(() => {
    const container = titleRef.current?.parentElement;
    if (!container) return;

    const observer = new ResizeObserver(fitTitle);
    observer.observe(container);

    return () => observer.disconnect();
  }, [fitTitle]);

  const flushSave = () => void autosave.flush().catch(() => undefined);

  const timeOfDay = getTimeOfDay(entry?.created_at ?? openedAt);
  const showPrompts = !entry && !autosave.title.trim() && wordCount === 0;
  const minutes = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
        {leading}
        <nav aria-label="Journal breadcrumb" className="min-w-0 flex-1">
          <ol className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <li className="shrink-0">
              <h1 className="px-1 text-sm font-normal text-muted-foreground">
                Journal
              </h1>
            </li>
            <li className="shrink-0" aria-hidden="true">
              <ChevronRight className="size-3.5 opacity-60" />
            </li>
            <li
              aria-current="page"
              className="min-w-0 truncate px-1 font-medium text-foreground"
            >
              {journalEntryTitle(autosave.title)}
            </li>
          </ol>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <SaveStatus
            status={autosave.saveStatus}
            updatedAt={entry?.updated_at}
            onRetry={flushSave}
          />
          <div className="hidden items-center sm:flex">
            <IconTooltipButton
              label="Undo"
              shortcut={
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Z</Kbd>
                </KbdGroup>
              }
              preserveFocus
              disabled={!historyState.canUndo}
              onClick={() => editorControls?.undo()}
            >
              <Undo2 />
            </IconTooltipButton>
            <IconTooltipButton
              label="Redo"
              shortcut={
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Shift</Kbd>
                  <Kbd>Z</Kbd>
                </KbdGroup>
              }
              preserveFocus
              disabled={!historyState.canRedo}
              onClick={() => editorControls?.redo()}
            >
              <Redo2 />
            </IconTooltipButton>
          </div>
          {autosave.activeUuid && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Entry actions"
                  />
                }
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" className="w-48">
                <DropdownMenuItem
                  destructive
                  onClick={() =>
                    onRequestDelete({
                      uuid: autosave.activeUuid!,
                      title: autosave.title,
                    })
                  }
                >
                  <Trash2 />
                  Delete entry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="workspace-list-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="journal-page-header">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {entry?.source && (
              <Timer className="size-3.5" aria-hidden="true" />
            )}
            {formatDateStamp(entry?.created_at ?? openedAt)}
            <span aria-hidden="true">·</span>
            {JOURNAL_TIME_OF_DAY_LABEL[timeOfDay]}
          </p>

          <textarea
            ref={titleRef}
            aria-label="Journal entry title"
            autoFocus={!entry}
            rows={1}
            className="mt-1 block w-full resize-none overflow-hidden border-0 bg-transparent p-0 py-1 text-2xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] outline-none placeholder:text-muted-foreground md:text-3xl"
            placeholder="Untitled entry"
            maxLength={120}
            value={autosave.title}
            onChange={(event) =>
              autosave.updateTitle(event.target.value.replace(/[\r\n]+/g, " "))
            }
            onBlur={flushSave}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing) {
                return;
              }

              event.preventDefault();
              editorControls?.focusFirstBlock();
            }}
          />

          <div className="mt-4">
            <JournalEntryProperties
              createdAt={entry?.created_at}
              source={entry?.source}
            />
          </div>

          {showPrompts && (
            <div className="mt-6">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Need somewhere to start?
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pickJournalPrompts(openedAt.getDate() + draftKey).map(
                  (prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="rounded-md bg-muted/60 px-2.5 py-1 text-left text-sm text-foreground/80 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                      onClick={() => {
                        autosave.updateTitle(prompt);
                        editorControls?.focusFirstBlock();
                      }}
                    >
                      {prompt}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          <div className="mt-6 h-px bg-border/60" aria-hidden="true" />
        </div>

        <div className="journal-writing-canvas journal-page-canvas">
          <NoteRichTextEditor
            mode="resource"
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            formattingToolbarMode="floating"
            documentId={entry?.uuid ?? `journal-draft-${draftKey}`}
            content={entry?.content ?? EMPTY_NOTE_DOCUMENT}
            editable
            noteOptions={[]}
            onChange={handleContentChange}
            onUploadFile={unavailable}
            onCreateChild={unavailable}
            onOpenNote={noop}
            onEditorReady={setEditorControls}
            onHistoryStateChange={setHistoryState}
            onBlur={flushSave}
          />
        </div>

        <p className="journal-page-footer text-xs text-muted-foreground">
          {wordCount === 0
            ? "Begin wherever you are."
            : `${wordCount.toLocaleString()} ${wordCount === 1 ? "word" : "words"} · ${minutes} min read`}
        </p>
      </div>
    </div>
  );
}

function SaveStatus({
  status,
  updatedAt,
  onRetry,
}: {
  status: JournalSaveStatus;
  updatedAt?: string | null;
  onRetry: () => void;
}) {
  return (
    <span
      className="mr-1 inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground"
      aria-live="polite"
    >
      {status === "saving" ? (
        <>
          <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
          Saving…
        </>
      ) : status === "dirty" ? (
        "Unsaved changes"
      ) : status === "saved" ? (
        <>
          <Check className="size-3" aria-hidden="true" />
          Saved
        </>
      ) : status === "error" ? (
        <button
          type="button"
          className="text-destructive underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onRetry}
        >
          Retry save
        </button>
      ) : updatedAt ? (
        <span className="hidden md:inline">
          Edited {formatEntryTimestamp(updatedAt)}
        </span>
      ) : null}
    </span>
  );
}
