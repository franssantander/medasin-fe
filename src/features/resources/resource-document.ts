import {
  getNoteDocumentPreview,
  parseNoteDocument,
  serializeNoteDocument,
} from "@/components/ui/note-editor-document";
import type { ResourceDocument } from "./type";

export function toResourceDocument(value: string): ResourceDocument | null {
  if (!getNoteDocumentPreview(value)) return null;
  return {
    type: "doc",
    format: "blocknote-v1",
    content: parseNoteDocument(value).blocks,
  };
}

export function fromResourceDocument(
  document: ResourceDocument | null,
): string {
  if (document?.format === "blocknote-v1")
    return serializeNoteDocument(document.content ?? []);
  const blocks = (document?.content ?? []).flatMap(convertNode);
  return serializeNoteDocument(
    blocks.length ? blocks : [{ type: "paragraph", content: "" }],
  );
}

function convertNode(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  const node = value as {
    type?: string;
    text?: string;
    content?: unknown[];
    attrs?: { level?: number };
    marks?: { type: string; attrs?: { href?: string } }[];
  };
  if (node.type === "text") {
    const styles: Record<string, boolean> = {};
    for (const mark of node.marks ?? []) {
      const key = (
        {
          bold: "bold",
          italic: "italic",
          underline: "underline",
          strike: "strike",
          code: "code",
        } as Record<string, string>
      )[mark.type];
      if (key) styles[key] = true;
    }
    const text = { type: "text", text: node.text ?? "", styles };
    const link = node.marks?.find((mark) => mark.type === "link")?.attrs?.href;
    return link && safeResourceUrl(link)
      ? [{ type: "link", href: link, content: [text] }]
      : [text];
  }
  if (node.type === "hardBreak")
    return [{ type: "text", text: "\n", styles: {} }];
  if (node.type === "bulletList" || node.type === "orderedList") {
    return (node.content ?? []).flatMap((item) => {
      const children = (item as { content?: unknown[] }).content ?? [];
      return children
        .flatMap(convertNode)
        .map((block) => ({
          ...(block as object),
          type:
            node.type === "bulletList" ? "bulletListItem" : "numberedListItem",
        }));
    });
  }
  if (node.type === "blockquote")
    return (node.content ?? [])
      .flatMap(convertNode)
      .map((block) => ({ ...(block as object), type: "quote" }));
  return [
    {
      type: node.type === "heading" ? "heading" : "paragraph",
      ...(node.type === "heading"
        ? { props: { level: Math.min(3, Math.max(1, node.attrs?.level ?? 1)) } }
        : {}),
      content: (node.content ?? []).flatMap(convertNode),
    },
  ];
}

export function resourcePreview(document: ResourceDocument | null): string {
  return getNoteDocumentPreview(fromResourceDocument(document));
}

export function safeResourceUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
