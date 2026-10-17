"use client";

import { useMemo, useState } from "react";

import { NoteListRail } from "@/features/notes/components/note-list-rail";
import { NotePageTopbar } from "@/features/notes/components/note-page-topbar";
import { buildNotePath, flattenNotes, formatNoteTimestamp } from "@/features/notes/note-tree-utils";
import { buildPreviewNotes, previewNoteBody } from "./preview-fixtures";

const noop = () => {};
const selectedUuid = "preview-note-spring";

// note-workspace.tsx in its "journal" presentation: the Notes list on the left, the open page on the right.
// The page body is static text styled like the BlockNote canvas, so the editor bundle stays off the landing page.
export default function NotesScreen() {
  const [now] = useState(() => new Date());
  const tree = useMemo(() => buildPreviewNotes(now), [now]);
  const flatNotes = useMemo(() => flattenNotes(tree), [tree]);
  const path = buildNotePath(flatNotes, selectedUuid);
  const note = path[path.length - 1];

  return (
    <div className="h-full min-h-0 min-w-0">
      <div className="grid h-full min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-card md:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 min-w-0 border-r bg-muted/30 md:block">
          <NoteListRail
            collections={[{ key: "standalone", label: "Notes", archived: false, showLabel: false, tree, flatNotes }]}
            selectedCollectionKey="standalone"
            selectedUuid={selectedUuid}
            createPending={false}
            onNew={noop}
            onCollapse={noop}
            onSelect={noop}
            onAddChild={noop}
            onPin={noop}
            onDelete={noop}
          />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col">
          <NotePageTopbar
            rootLabel="Notes"
            ancestors={path.slice(0, -1)}
            currentTitle={note.title}
            onOpenNote={noop}
            archived={false}
            saveStatus="idle"
            onRetrySave={noop}
            canUndo
            canRedo={false}
            onUndo={noop}
            onRedo={noop}
            menu={{ pinned: false, createPending: false, onAddChild: noop, onPin: noop, onDelete: noop }}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="notes-page-header">
              <p className="py-1 text-3xl font-bold tracking-tight md:text-4xl">{note.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Edited {formatNoteTimestamp(note.updated_at, now)} · Type / for blocks
              </p>
              <div className="mt-6 flex flex-col gap-3 text-base leading-relaxed">
                {previewNoteBody.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <p className="font-semibold">Sections</p>
                <ul className="flex list-disc flex-col gap-1 pl-6">
                  <li>The frost, and what I would do differently</li>
                  <li>Ana&apos;s tips on raised beds</li>
                  <li>One question from a reader</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
