export const EMPTY_NOTE_DOCUMENT = JSON.stringify({
  version: 1,
  blocks: [{ type: "paragraph", content: "" }],
});

export type SerializedNoteDocument = {
  version: 1;
  blocks: unknown[];
};

export function parseNoteDocument(content: string): SerializedNoteDocument {
  try {
    const parsed = JSON.parse(content) as Partial<SerializedNoteDocument>;
    if (parsed.version === 1 && Array.isArray(parsed.blocks)) {
      return { version: 1, blocks: parsed.blocks };
    }
  } catch {
    // Existing notes stored plain text before the block editor was introduced.
  }

  return {
    version: 1,
    blocks: [{ type: "paragraph", content }],
  };
}

export function serializeNoteDocument(blocks: unknown[]): string {
  return JSON.stringify({ version: 1, blocks });
}

export function getNoteDocumentPreview(content: string | undefined): string {
  if (!content) return "";

  const document = parseNoteDocument(content);

  return document.blocks
    .map(extractBlockText)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBlockText(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const block = value as Record<string, unknown>;
  const content = extractRichText(block.content);
  const children = Array.isArray(block.children)
    ? block.children.map(extractBlockText).filter(Boolean).join(" ")
    : "";

  if (content || children) return [content, children].filter(Boolean).join(" ");

  const props = block.props;
  if (props && typeof props === "object") {
    const label = (props as Record<string, unknown>).label;
    if (typeof label === "string") return label;
  }

  return "";
}

function extractRichText(value: unknown, separator = ""): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    // Inline runs are adjacent characters; formatting does not add a space.
    return value.map((item) => extractRichText(item)).filter(Boolean).join(separator);
  }
  if (!value || typeof value !== "object") return "";

  const item = value as Record<string, unknown>;
  if (typeof item.text === "string") return item.text;

  return [
    extractRichText(item.content),
    extractRichText(item.children, " "),
    extractRichText(item.rows, " "),
    extractRichText(item.cells, " "),
  ]
    .filter(Boolean)
    .join(" ");
}
