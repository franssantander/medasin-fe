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
