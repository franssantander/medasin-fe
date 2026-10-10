"use client";

import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import type { NoteRichTextEditorControls } from "@/components/ui/note-rich-text-editor-client";
import { useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const noop = () => undefined;
const unavailable = async (): Promise<never> => {
  throw new Error("Use the attachments section to add files and images.");
};

export function ResourceEditor({
  id,
  content,
  onChange,
  readOnly = false,
  presentation = "editor",
}: {
  id: string;
  content: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  presentation?: "editor" | "view";
}) {
  const { resolvedTheme } = useTheme();
  const lastDocument = useRef<string | null>(null);
  const onReady = useCallback((controls: NoteRichTextEditorControls | null) => {
    lastDocument.current = controls?.getContent() ?? null;
  }, []);
  const onDocumentChange = useCallback((value: string) => {
    // BlockNote fills in default block properties on mount and can emit a
    // change for that normalization. Only publish edits to the document.
    if (readOnly || lastDocument.current === null || value === lastDocument.current) return;
    lastDocument.current = value;
    onChange(value);
  }, [onChange, readOnly]);
  return (
    <div className={cn(
      "resource-note-editor text-foreground",
      presentation === "view" ? "resource-note-view" : "min-h-56 overflow-hidden rounded-lg border bg-background shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
    )}>
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
