"use client";

import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import type { NoteRichTextEditorControls } from "@/components/ui/note-rich-text-editor-client";
import { useCallback, useRef } from "react";
import { useTheme } from "next-themes";

const noop = () => undefined;
const unavailable = async (): Promise<never> => {
  throw new Error("Use the attachments section to add files and images.");
};

export function ResourceEditor({
  id,
  content,
  onChange,
  readOnly = false,
}: {
  id: string;
  content: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const lastDocument = useRef<string | null>(null);
  const onReady = useCallback((controls: NoteRichTextEditorControls | null) => {
    lastDocument.current = controls?.getContent() ?? null;
  }, []);
  const onDocumentChange = useCallback((value: string) => {
    // BlockNote fills in default block properties on mount and can emit a
    // change for that normalization. Only publish edits to the document.
    if (lastDocument.current === null || value === lastDocument.current) return;
    lastDocument.current = value;
    onChange(value);
  }, [onChange]);
  return (
    <div className="resource-note-editor min-h-72 overflow-hidden rounded-xl border bg-background text-foreground">
      <NoteRichTextEditor
        mode="resource"
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        documentId={id}
        content={content}
        editable={!readOnly}
        noteOptions={[]}
        onChange={onDocumentChange}
        onUploadFile={unavailable}
        onCreateChild={unavailable}
        onOpenNote={noop}
        onEditorReady={onReady}
        onHistoryStateChange={noop}
      />
    </div>
  );
}
