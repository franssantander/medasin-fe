"use client";

import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";

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
  return (
    <div className="min-h-48 overflow-hidden rounded-lg border bg-white py-3 text-black">
      <NoteRichTextEditor
        mode="resource"
        documentId={id}
        content={content}
        editable={!readOnly}
        noteOptions={[]}
        onChange={onChange}
        onUploadFile={unavailable}
        onCreateChild={unavailable}
        onOpenNote={noop}
        onEditorReady={noop}
        onHistoryStateChange={noop}
      />
    </div>
  );
}
