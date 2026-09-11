"use client";

import Image from "next/image";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import {
  getNoteDocumentPreview,
  serializeNoteDocument,
} from "@/components/ui/note-editor-document";
import { cn } from "@/lib/utils";
import type { LetterExport, LetterPage } from "../type";

const noop = () => undefined;
const unavailable = async (): Promise<never> => {
  throw new Error("File uploads are unavailable in letter previews.");
};
const unavailableChild = async (): Promise<never> => {
  throw new Error("Child pages are unavailable in letter previews.");
};

export function LetterPagePreview({
  page,
  letterExport,
}: {
  page: LetterPage;
  letterExport: LetterExport;
}) {
  const documentId = `letter-preview-${letterExport.uuid}-${page.number}`;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border bg-white text-zinc-900 shadow-sm"
      style={{ aspectRatio: `${letterExport.canvas.width} / ${letterExport.canvas.height}` }}
      role="img"
      aria-label={`Preview of page ${page.number}`}
    >
      {page.kind === "cover" ? (
        <div className="flex h-full flex-col justify-between p-[9%]">
          <Image
            src="/images/medasin-ph.svg"
            alt=""
            width={56}
            height={56}
            className="size-[9%] min-h-7 min-w-7 object-contain object-left"
          />
          <div className="max-w-[86%]">
            <p className="mb-[5%] text-[clamp(0.55rem,1.5vw,0.9rem)] font-medium uppercase tracking-[0.18em] text-zinc-500">
              A letter
            </p>
            <h2 className="font-spectral text-[clamp(1.3rem,5vw,3.6rem)] leading-[0.98] tracking-[-0.03em]">
              {page.title || "Untitled letter"}
            </h2>
            {page.subtitle && (
              <p className="mt-[5%] max-w-[31rem] text-[clamp(0.7rem,1.8vw,1.1rem)] leading-relaxed text-zinc-600">
                {page.subtitle}
              </p>
            )}
          </div>
          <p className="text-[clamp(0.55rem,1.4vw,0.8rem)] uppercase tracking-[0.16em] text-zinc-400">
            Medasin
          </p>
        </div>
      ) : (
        <div className="flex h-full flex-col p-[8%]">
          <div className="min-h-0 flex-1 overflow-hidden">
            <NoteRichTextEditor
              key={documentId}
              mode="resource"
              documentId={documentId}
              content={serializeNoteDocument(page.blocks)}
              editable={false}
              noteOptions={[]}
              onChange={noop}
              onUploadFile={unavailable}
              onCreateChild={unavailableChild}
              onOpenNote={noop}
              onEditorReady={noop}
              onHistoryStateChange={noop}
            />
          </div>
          {page.signature && (
            <div className="mt-[6%] shrink-0 border-t border-zinc-200 pt-[4%]">
              <p className="font-spectral text-[clamp(0.9rem,2.4vw,1.35rem)]">
                {page.signature.name}
              </p>
              <p className="mt-1 text-[clamp(0.55rem,1.4vw,0.8rem)] text-zinc-500">
                {page.signature.handle}
              </p>
            </div>
          )}
          {page.truncated && page.continuation_label && (
            <p className="mt-[4%] shrink-0 text-[clamp(0.55rem,1.4vw,0.8rem)] uppercase tracking-[0.12em] text-zinc-400">
              {page.continuation_label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function LetterPageThumbnail({
  page,
  letterExport,
  selected = false,
}: {
  page: LetterPage;
  letterExport: LetterExport;
  selected?: boolean;
}) {
  const bodyPreview = getNoteDocumentPreview(serializeNoteDocument(page.blocks));
  const kindLabel = page.kind === "cover" ? "Cover" : page.kind === "final" ? "Final" : "Page";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-white text-left text-zinc-900 transition-colors",
        selected ? "border-foreground ring-2 ring-ring/30" : "border-zinc-200",
      )}
      style={{ aspectRatio: `${letterExport.canvas.width} / ${letterExport.canvas.height}` }}
    >
      {page.kind === "cover" ? (
        <div className="flex h-full flex-col justify-end p-[12%]">
          <p className="mb-1 text-[0.45rem] font-medium uppercase tracking-[0.13em] text-zinc-400">
            {kindLabel}
          </p>
          <p className="line-clamp-3 font-spectral text-[clamp(0.65rem,1.7vw,0.95rem)] leading-tight">
            {page.title || "Untitled letter"}
          </p>
          {page.subtitle && (
            <p className="mt-1 line-clamp-2 text-[0.55rem] leading-tight text-zinc-500">
              {page.subtitle}
            </p>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col p-[12%]">
          <p className="mb-[10%] text-[0.45rem] font-medium uppercase tracking-[0.13em] text-zinc-400">
            {kindLabel}
          </p>
          <p className="line-clamp-8 text-[clamp(0.55rem,1.5vw,0.78rem)] leading-[1.35] text-zinc-700">
            {bodyPreview || "No text on this page."}
          </p>
          {page.signature && (
            <p className="mt-auto truncate border-t border-zinc-200 pt-[8%] text-[0.55rem] text-zinc-500">
              {page.signature.name}
            </p>
          )}
          {page.truncated && (
            <p className="mt-1 truncate text-[0.45rem] uppercase tracking-[0.08em] text-zinc-400">
              {page.continuation_label || "Continued in the app"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
