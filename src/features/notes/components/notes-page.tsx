"use client";

import PageHeader from "@/components/shared/page-header";
import { NoteWorkspace } from "./note-workspace";
import { noteKeys } from "../queries/note-query";
import { noteService } from "../services/note-service";

const queryKeys = {
  tree: noteKeys.tree(),
  detail: noteKeys.detail,
};

export function NotesPage({ initialNoteUuid }: { initialNoteUuid?: string }) {
  return (
    <div className="flex min-h-full min-w-0 flex-col gap-5">
      <PageHeader
        title="Notes"
        description="Capture ideas, write freely, and keep related pages together."
      />
      <div className="flex h-[calc(100dvh-10rem)] min-h-[36rem] min-w-0">
        <NoteWorkspace
          service={noteService}
          queryKeys={queryKeys}
          initialNoteUuid={initialNoteUuid}
        />
      </div>
    </div>
  );
}
