"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CircleCheck,
  CircleCheckBig,
  LoaderCircle,
  MoreHorizontal,
  Redo2,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type {
  NoteEditorHistoryState,
  NoteRichTextEditorControls,
} from "@/components/ui/note-rich-text-editor-client";
import { EMPTY_NOTE_DOCUMENT, getNoteDocumentPreview } from "@/components/ui/note-editor-document";
import { parseApiError } from "@/lib/axios";
import {
  upsertLetterCache,
  useDeleteLetterMutation,
  useSetLetterDoneMutation,
} from "../queries/letter-query";
import { useLetterAutosave } from "../hooks/use-letter-autosave";
import {
  countWords,
  formatReadTime,
  formatWordCount,
} from "../letter-format";
import type { Letter } from "../type";
import { letterService } from "../services/letter-service";
import { LetterDeleteDialog } from "./letter-delete-dialog";

const noop = () => undefined;
const MAX_LETTER_IMAGE_REQUEST_BYTES = 8 * 1024 * 1024;
const unavailableChild = async (): Promise<never> => {
  throw new Error("Child pages are unavailable in letters.");
};

export function LetterEditor({ letter }: { letter?: Letter }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteLetterMutation();
  const doneMutation = useSetLetterDoneMutation();
  const [doneAt, setDoneAt] = useState(letter?.done_at ?? null);
  const [historyState, setHistoryState] = useState<NoteEditorHistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [editorControls, setEditorControls] =
    useState<NoteRichTextEditorControls | null>(null);
  const [formattingToolbarContainer, setFormattingToolbarContainer] =
    useState<HTMLDivElement | null>(null);
  const [leaving, setLeaving] = useState<"library" | "studio" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const handleCreated = useCallback(
    (created: Letter) => {
      upsertLetterCache(queryClient, created, true);
      // Swap `/letters/new` for the real URL without remounting the editor,
      // so the caret and undo history survive the first autosave.
      window.history.replaceState(null, "", `/letters/${created.uuid}`);
    },
    [queryClient],
  );
  const handleSaved = useCallback(
    (saved: Letter) => upsertLetterCache(queryClient, saved),
    [queryClient],
  );
  const autosave = useLetterAutosave({
    initialUuid: letter?.uuid,
    initialTitle: letter?.title ?? "",
    initialContent: letter?.content ?? EMPTY_NOTE_DOCUMENT,
    onCreated: handleCreated,
    onSaved: handleSaved,
  });
  const { content: savedContent, updateContent } = autosave;
  const contentPreview = useMemo(
    () => getNoteDocumentPreview(autosave.content),
    [autosave.content],
  );
  const wordCount = countWords(contentPreview);
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const letterUuid = autosave.activeUuid ?? letter?.uuid;
  const syncEditorContent = useCallback(() => {
    const currentContent = editorControls?.getContent();
    if (currentContent !== undefined && currentContent !== savedContent) {
      updateContent(currentContent);
    }
  }, [editorControls, savedContent, updateContent]);

  const leave = async (destination: "library" | "studio") => {
    if (leaving) return;

    setLeaving(destination);
    try {
      syncEditorContent();
      const savedLetter = await autosave.flush(destination === "studio");
      const uuid = savedLetter?.uuid ?? autosave.activeUuid ?? letter?.uuid;
      if (destination === "studio") {
        if (!uuid) throw new Error("Save the letter before preparing its pages.");
        router.push(`/letters/${uuid}/studio`);
      } else {
        router.push("/letters");
      }
    } catch (error) {
      setLeaving(null);
      toast.add({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Your letter could not be saved. Try again before leaving.",
      });
    }
  };

  const toggleDone = async () => {
    if (doneMutation.isPending || leaving) return;

    let uuid: string | undefined;
    try {
      // Save first so a new letter exists and a late autosave cannot carry
      // the old done state back into the cache.
      syncEditorContent();
      const savedLetter = await autosave.flush(true);
      uuid = savedLetter?.uuid ?? autosave.activeUuid ?? letter?.uuid;
      if (!uuid) throw new Error("Save the letter before marking it done.");
    } catch (error) {
      toast.add({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Your letter could not be saved. Try again.",
      });
      return;
    }

    try {
      const response = await doneMutation.mutateAsync({ uuid, done: !doneAt });
      setDoneAt(response.data.done_at);
    } catch {
      // The mutation already reported the failure.
    }
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
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={Boolean(leaving)}
          onClick={() => void leave("library")}
        >
          {leaving === "library" ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <ArrowLeft data-icon="inline-start" />
          )}
          Letters
        </Button>
        <Separator orientation="vertical" className="h-5 data-vertical:self-center" />
        <span
          className="min-w-0 truncate px-1 text-xs text-muted-foreground"
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
            "Draft"
          )}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span className="mr-2 hidden text-xs whitespace-nowrap text-muted-foreground tabular-nums md:inline">
            {formatWordCount(wordCount)} · {formatReadTime(readTimeMinutes)}
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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Letter actions"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="min-w-44">
              <DropdownMenuItem
                destructive
                disabled={!letterUuid}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
                Delete letter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant={doneAt ? "secondary" : "outline"}
            size="sm"
            className="ml-1"
            disabled={Boolean(leaving) || doneMutation.isPending}
            aria-label={doneAt ? "Done, move back to drafts" : "Mark as done"}
            title={doneAt ? "Move back to drafts" : "Mark this letter as done"}
            onClick={() => void toggleDone()}
          >
            {doneMutation.isPending ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : doneAt ? (
              <CircleCheckBig
                className="text-emerald-600 dark:text-emerald-400"
                data-icon="inline-start"
              />
            ) : (
              <CircleCheck data-icon="inline-start" />
            )}
            <span className="hidden sm:inline">
              {doneAt ? "Done" : "Mark as done"}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="ml-1"
            disabled={Boolean(leaving)}
            title="Turn this letter into shareable pages"
            onClick={() => void leave("studio")}
          >
            {leaving === "studio" ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            Publish
          </Button>
        </div>
      </header>

      <div className="flex shrink-0 justify-center border-b bg-background px-2 py-2 sm:px-4">
        <div
          ref={setFormattingToolbarContainer}
          role="toolbar"
          aria-label="Letter formatting"
          className="letter-formatting-toolbar max-w-full min-w-0 overflow-x-auto rounded-full border bg-background px-2 py-0.5 shadow-xs"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col bg-white px-5 pt-10 pb-4 text-zinc-950 sm:px-8 sm:pt-16 lg:pt-20">
          <div className="grid shrink-0 gap-4 sm:px-[3.25rem]">
            <Textarea
              aria-label="Letter title"
              autoFocus={!letter}
              rows={1}
              className="min-h-0 resize-none overflow-hidden border-0 bg-transparent px-0 py-0 font-spectral text-4xl leading-[1.08] font-semibold tracking-[-0.025em] text-zinc-950 caret-zinc-950 shadow-none placeholder:text-zinc-300 focus-visible:ring-0 md:text-5xl dark:bg-transparent"
              placeholder="Title"
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

          <div className="letter-composer-document mt-8 flex min-w-0 overflow-visible bg-white sm:mt-10">
            <NoteRichTextEditor
              mode="letter"
              formattingToolbarMode="persistent"
              formattingToolbarContainer={formattingToolbarContainer}
              documentId={letter?.uuid ?? "new-letter"}
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

      <LetterDeleteDialog
        open={deleteOpen}
        letterTitle={autosave.title}
        onOpenChange={setDeleteOpen}
        onConfirm={async () => {
          if (!letterUuid) return;
          await autosave.flush().catch(() => undefined);
          await deleteMutation.mutateAsync(letterUuid);
          router.push("/letters");
        }}
      />
    </div>
  );
}

function formatEditorTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
