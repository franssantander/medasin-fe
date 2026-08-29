"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { NoteRichTextEditorClientProps } from "./note-rich-text-editor-client";

const NoteRichTextEditorClient = dynamic(
  () =>
    import("./note-rich-text-editor-client").then(
      (module) => module.NoteRichTextEditorClient,
    ),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="min-h-[32rem] w-full flex-1 rounded-none bg-white" />
    ),
  },
);

export function NoteRichTextEditor(props: NoteRichTextEditorClientProps) {
  return (
    <div className="flex min-h-[32rem] min-w-0 w-full flex-1">
      <NoteRichTextEditorClient {...props} />
    </div>
  );
}
