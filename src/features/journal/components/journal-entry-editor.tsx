"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  Link2,
  LoaderCircle,
  Timer,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import type {
  NoteEditorHistoryState,
  NoteRichTextEditorControls,
} from "@/components/ui/note-rich-text-editor-client";
import { EMPTY_NOTE_DOCUMENT } from "@/components/ui/note-editor-document";
import { ResourceDetailDialog } from "@/features/resources/components/resource-detail-dialog";
import { useResourceQuery } from "@/features/resources/queries/resource-query";
import { useJournalAutosave } from "../hooks/use-journal-autosave";
import {
  JournalResourcePicker,
  toJournalResource,
  type JournalResourcePickerResult,
} from "./journal-resource-picker";
import type { JournalEntry, JournalResource } from "../type";

const noop = () => undefined;
const unavailable = async (): Promise<never> => {
  throw new Error("Use the Resources section to link resources.");
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
  const [linkedResources, setLinkedResources] = useState<JournalResource[]>(
    () => entry?.resources ?? [],
  );
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [historyState, setHistoryState] = useState<NoteEditorHistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [editorControls, setEditorControls] =
    useState<NoteRichTextEditorControls | null>(null);
  const [selectedResourceUuid, setSelectedResourceUuid] = useState<string>();
  const autosave = useJournalAutosave({
    initialUuid: entry?.uuid,
    initialTitle: entry?.title ?? "",
    initialContent: entry?.content ?? EMPTY_NOTE_DOCUMENT,
    initialResourceUuids: entry?.resources.map((resource) => resource.uuid) ?? [],
    onCreated,
    onSaved,
  });
  const selectedResourceQuery = useResourceQuery(selectedResourceUuid);

  useEffect(() => {
    onRegisterDeleteFlush(autosave.flush);

    return () => onRegisterDeleteFlush();
  }, [autosave.flush, onRegisterDeleteFlush]);

  const handleResourceApply = ({
    resourceUuids,
    activeResources,
  }: JournalResourcePickerResult) => {
    setLinkedResources((current) => {
      const currentByUuid = new Map(
        current.map((resource) => [resource.uuid, resource]),
      );
      activeResources.forEach((resource) => {
        currentByUuid.set(resource.uuid, toJournalResource(resource));
      });

      return resourceUuids
        .map((uuid) => currentByUuid.get(uuid))
        .filter((resource): resource is JournalResource => Boolean(resource));
    });
    autosave.updateResourceUuids(resourceUuids);
  };

  const removeResource = (uuid: string) => {
    const nextUuids = autosave.resourceUuids.filter((value) => value !== uuid);
    setLinkedResources((current) =>
      current.filter((resource) => resource.uuid !== uuid),
    );
    autosave.updateResourceUuids(nextUuids);
  };

  const handleOpenResource = (uuid: string) => {
    if (uuid === selectedResourceUuid && selectedResourceQuery.isError) {
      void selectedResourceQuery.refetch();
      return;
    }

    setSelectedResourceUuid(uuid);
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4">
      <div className="grid shrink-0 gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Input
            aria-label="Journal entry title"
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

      <div className="flex h-full min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
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

      <section className="grid shrink-0 gap-2" aria-labelledby="linked-resources">
        <div className="flex min-h-8 items-center justify-between gap-3">
          <h2
            id="linked-resources"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <Link2 className="size-4" aria-hidden="true" />
            Linked resources
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setResourcePickerOpen(true)}
          >
            <Link2 data-icon="inline-start" />
            Link resources
          </Button>
        </div>
        {linkedResources.length > 0 ? (
          <ul
            className="grid max-h-28 gap-2 overflow-y-auto rounded-lg border bg-muted/20 p-2"
            aria-label="Linked resources"
          >
            {linkedResources.map((resource) => (
              <li
                key={resource.uuid}
                className="flex min-w-0 items-center gap-2 rounded-md bg-background px-2.5 py-1.5 text-sm"
              >
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`Open ${resource.title}`}
                  aria-busy={
                    selectedResourceUuid === resource.uuid &&
                    selectedResourceQuery.isFetching
                  }
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => handleOpenResource(resource.uuid)}
                >
                  <Link2
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span
                    className="min-w-0 flex-1 truncate"
                    title={resource.title}
                  >
                    {resource.title}
                  </span>
                  {resource.type && (
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {resource.type}
                    </Badge>
                  )}
                  {resource.archived_at && (
                    <Badge variant="outline" className="shrink-0">
                      Archived
                    </Badge>
                  )}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label={`Unlink ${resource.title}`}
                  title={`Unlink ${resource.title}`}
                  onClick={() => removeResource(resource.uuid)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No resources linked yet. Add references from your Resource library
            when they help tell the story.
          </p>
        )}
      </section>

      <JournalResourcePicker
        key={resourcePickerOpen ? "open" : "closed"}
        open={resourcePickerOpen}
        selectedUuids={autosave.resourceUuids}
        onOpenChange={setResourcePickerOpen}
        onApply={handleResourceApply}
      />

      {selectedResourceUuid &&
      selectedResourceQuery.data?.data?.uuid === selectedResourceUuid ? (
        <ResourceDetailDialog
          resource={selectedResourceQuery.data.data}
          onClose={() => setSelectedResourceUuid(undefined)}
        />
      ) : selectedResourceUuid ? (
        <ResourceLoadingDialog
          error={
            selectedResourceQuery.isError && !selectedResourceQuery.isFetching
          }
          onClose={() => setSelectedResourceUuid(undefined)}
          onRetry={() => void selectedResourceQuery.refetch()}
        />
      ) : null}

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

function ResourceLoadingDialog({
  error,
  onClose,
  onRetry,
}: {
  error: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {error ? "Resource could not be loaded" : "Loading resource"}
          </DialogTitle>
          <DialogDescription>
            {error
              ? "Check your connection and try opening the resource again."
              : "Loading the latest resource details…"}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={onRetry}>
              Try again
            </Button>
          </DialogFooter>
        ) : (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading resource…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
