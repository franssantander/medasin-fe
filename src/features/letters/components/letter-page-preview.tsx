"use client";

import Image from "next/image";
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { NoteRichTextEditor } from "@/components/ui/note-rich-text-editor";
import type {
  NoteEditorHistoryState,
  NoteRichTextEditorControls,
} from "@/components/ui/note-rich-text-editor-client";
import {
  getNoteDocumentPreview,
  parseNoteDocument,
  serializeNoteDocument,
} from "@/components/ui/note-editor-document";
import { imageFetchSource } from "@/lib/image/crop-image";
import { cn } from "@/lib/utils";
import { normalizeLetterCover } from "../letter-cover";
import {
  letterPageTextSize,
  normalizeLetterPageTextScale,
} from "../letter-page-text-scale";
import type { LetterCanvas, LetterPage } from "../type";

const noop = () => undefined;
const unavailable = async (): Promise<never> => {
  throw new Error("File uploads are unavailable in letter previews.");
};
const unavailableChild = async (): Promise<never> => {
  throw new Error("Child pages are unavailable in letter previews.");
};

type LetterPageCanvasProps = {
  page: LetterPage;
  canvas: LetterCanvas;
  exportUuid: string;
  textScale?: number;
  editable?: boolean;
  className?: string;
  onTitleChange?: (title: string) => void;
  onBlocksChange?: (blocks: unknown[]) => void;
  onUploadFile?: (file: File) => Promise<string>;
  onEditorReady?: (controls: NoteRichTextEditorControls | null) => void;
  onHistoryStateChange?: (state: NoteEditorHistoryState) => void;
  onBlur?: () => void;
  onContentApplied?: () => void;
};

export const LetterPageCanvas = forwardRef<
  HTMLDivElement,
  LetterPageCanvasProps
>(function LetterPageCanvas(
  {
    page,
    canvas,
    exportUuid,
    textScale: textScaleOverride,
    editable = false,
    className,
    onTitleChange,
    onBlocksChange,
    onUploadFile = unavailable,
    onEditorReady = noop,
    onHistoryStateChange = noop,
    onBlur,
    onContentApplied,
  },
  ref,
) {
  const pageUuid = page.uuid || `${exportUuid}-${page.number}`;
  const layout = page.layout || (page.kind === "cover" ? "cover" : "body");
  const serializedBlocks = serializeNoteDocument(page.blocks);
  const textScale = normalizeLetterPageTextScale(
    textScaleOverride ?? page.text_scale,
  );
  const cover = normalizeLetterCover(page.cover);
  const coverDescription = serializeNoteDocument(
    page.content_source === "cover_entry"
      ? page.blocks
      : cover.description_blocks,
  );
  const coverDescriptionText = getNoteDocumentPreview(coverDescription);
  const coverIsDark = cover.theme === "dark";
  const coverSections = cover.hero_image_url
    ? cover.section_order
    : [
        ...cover.section_order.filter((section) => section !== "author"),
        "author" as const,
      ];
  const editorStyle = {
    "--letter-page-editor-font-size": letterPageTextSize(
      layout === "quote" ? 4.3 : 1.72,
      textScale,
    ),
  } as CSSProperties;

  useEffect(() => {
    if (layout === "cover") {
      onEditorReady(null);
      onHistoryStateChange({ canUndo: false, canRedo: false });
      onContentApplied?.();
    }
  }, [layout, onEditorReady, onHistoryStateChange, onContentApplied]);

  return (
    <div
      ref={ref}
      className={cn(
        "letter-page-canvas relative overflow-hidden",
        layout === "cover" && coverIsDark
          ? "bg-zinc-950 text-zinc-50"
          : "bg-white text-zinc-900",
        className,
      )}
      style={{ width: canvas.width, height: canvas.height }}
      data-page-canvas
      data-page-layout={layout}
      role={editable ? "group" : "img"}
      aria-label={`${editable ? "Editable social page" : "Preview"} ${page.number}`}
    >
      {layout === "cover" ? (
        <div
          className="flex h-full flex-col gap-[4cqh] overflow-hidden p-[7cqw]"
          data-page-content
        >
          {coverSections.map((section) => {
            if (section === "header") {
              if (!cover.show_logo && !cover.subheader) return null;
              return (
                <div key={section} className="flex shrink-0 items-center justify-between gap-[4cqw]">
                  {cover.subheader ? (
                    <p
                      className={cn(
                        "text-[1.35cqw] font-medium uppercase tracking-[0.18em]",
                        coverIsDark ? "text-zinc-300" : "text-zinc-500",
                      )}
                      style={{ fontSize: letterPageTextSize(1.35, textScale) }}
                    >
                      {cover.subheader}
                    </p>
                  ) : <span />}
                  {cover.show_logo ? (
                    <Image
                      src="/images/medasin-ph.svg"
                      alt="Medasin"
                      width={96}
                      height={96}
                      className={cn(
                        "size-[7cqw] min-h-7 min-w-7 object-contain object-right",
                        coverIsDark && "brightness-0 invert",
                      )}
                      priority={!editable}
                    />
                  ) : null}
                </div>
              );
            }

            if (section === "title") {
              return (
                <div key={section} className="shrink-0 overflow-hidden">
                  <CanvasText
                    as="h2"
                    ariaLabel="Cover title"
                    className="font-spectral leading-[0.98] tracking-[-0.03em]"
                    style={{ fontSize: letterPageTextSize(5.2, textScale) }}
                    editable={editable}
                    maxLength={120}
                    placeholder="Untitled letter"
                    value={page.title ?? ""}
                    onChange={onTitleChange}
                    onBlur={onBlur}
                  />
                </div>
              );
            }

            if (section === "entry" && coverDescriptionText) {
              return (
                <div
                  key={section}
                  className={cn(
                    "letter-cover-description max-w-[92%] shrink-0 overflow-hidden",
                    coverIsDark ? "text-zinc-300" : "text-zinc-600",
                  )}
                  style={{
                    "--letter-cover-description-font-size":
                      letterPageTextSize(1.8, textScale),
                  } as CSSProperties}
                >
                  <NoteRichTextEditor
                    mode="resource"
                    editorChrome="none"
                    documentId={`letter-cover-description-${exportUuid}-${pageUuid}`}
                    content={coverDescription}
                    syncContent
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
              );
            }

            if (section === "author") {
              if (!cover.author_name && !cover.date_label && !cover.avatar_url) return null;
              return (
                <div
                  key={section}
                  data-cover-section="author"
                  className={cn(
                    "flex shrink-0 items-center gap-[2.5cqw]",
                    !cover.hero_image_url && "mt-auto",
                  )}
                >
                  {cover.avatar_url ? (
                    <Image
                      unoptimized
                      src={imageFetchSource(cover.avatar_url)}
                      alt={cover.author_name ? `${cover.author_name}'s avatar` : "Cover author avatar"}
                      width={96}
                      height={96}
                      className="size-[7cqw] rounded-full object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    {cover.author_name ? (
                      <p className="truncate font-medium" style={{ fontSize: letterPageTextSize(1.65, textScale) }}>
                        {cover.author_name}
                      </p>
                    ) : null}
                    {cover.date_label ? (
                      <p
                        className={coverIsDark ? "text-zinc-400" : "text-zinc-500"}
                        style={{ fontSize: letterPageTextSize(1.25, textScale) }}
                      >
                        {cover.date_label}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            }

            if (section === "hero" && cover.hero_image_url) {
              return (
                <div key={section} className="min-h-[30%] flex-1 overflow-hidden rounded-[2cqw]">
                  <Image
                    unoptimized
                    src={imageFetchSource(cover.hero_image_url)}
                    alt="Letter cover"
                    width={1600}
                    height={900}
                    className="size-full object-cover"
                  />
                </div>
              );
            }

            return null;
          })}
        </div>
      ) : layout === "quote" ? (
        <div className="flex h-full flex-col p-[9cqw]">
          <Image
            src="/images/medasin-ph.svg"
            alt=""
            width={72}
            height={72}
            className="size-[6cqw] object-contain object-left"
            priority={!editable}
          />
          <div
            className="letter-page-quote-document relative m-auto h-[72%] w-[84%] overflow-hidden"
            style={editorStyle}
            data-page-content
          >
            <span
              className="pointer-events-none absolute top-0 left-0 font-spectral text-[5cqw] leading-none text-zinc-300"
              aria-hidden="true"
            >
              “
            </span>
            <NoteRichTextEditor
              key={`${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              mode={editable ? "letter" : "resource"}
              editorChrome={editable ? "full" : "none"}
              documentId={`letter-page-quote-${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              content={serializedBlocks}
              syncContent
              onContentApplied={onContentApplied}
              editable={editable}
              noteOptions={[]}
              onChange={(content) =>
                onBlocksChange?.(parseNoteDocument(content).blocks)
              }
              onUploadFile={onUploadFile}
              onCreateChild={unavailableChild}
              onOpenNote={noop}
              onEditorReady={onEditorReady}
              onHistoryStateChange={onHistoryStateChange}
              onBlur={onBlur}
            />
            <span
              className="pointer-events-none absolute right-0 bottom-0 font-spectral text-[5cqw] leading-none text-zinc-300"
              aria-hidden="true"
            >
              ”
            </span>
          </div>
          {page.signature ? (
            <div className="text-center text-[1.4cqw] text-zinc-500">
              <p className="font-medium text-zinc-700">{page.signature.name}</p>
              <p>{page.signature.handle}</p>
            </div>
          ) : (
            <p className="text-center text-[1.2cqw] uppercase tracking-[0.16em] text-zinc-400">
              Medasin
            </p>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col p-[8cqw]">
          <div
            className="letter-page-document min-h-0 flex-1 overflow-hidden"
            style={editorStyle}
            data-page-content
          >
            <NoteRichTextEditor
              key={`${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              mode={editable ? "letter" : "resource"}
              editorChrome={editable ? "full" : "none"}
              documentId={`letter-page-body-${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              content={serializedBlocks}
              syncContent
              onContentApplied={onContentApplied}
              editable={editable}
              noteOptions={[]}
              onChange={(content) =>
                onBlocksChange?.(parseNoteDocument(content).blocks)
              }
              onUploadFile={onUploadFile}
              onCreateChild={unavailableChild}
              onOpenNote={noop}
              onEditorReady={onEditorReady}
              onHistoryStateChange={onHistoryStateChange}
              onBlur={onBlur}
            />
          </div>
          {page.signature ? (
            <div className="mt-[5cqw] shrink-0 border-t border-zinc-200 pt-[3cqw]">
              <p className="font-spectral text-[2.2cqw]">{page.signature.name}</p>
              <p className="mt-[0.6cqw] text-[1.3cqw] text-zinc-500">
                {page.signature.handle}
              </p>
            </div>
          ) : null}
          {page.continuation_label ? (
            <p className="mt-[3cqw] shrink-0 text-[1.2cqw] uppercase tracking-[0.12em] text-zinc-400">
              {page.continuation_label}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
});

export function LetterPageViewport({
  canvas,
  children,
  className,
  frameClassName,
}: {
  canvas: LetterCanvas;
  children: ReactNode;
  className?: string;
  frameClassName?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const resize = () => {
      const nextScale = Math.min(
        viewport.clientWidth / canvas.width,
        viewport.clientHeight / canvas.height,
      );
      setScale(Number.isFinite(nextScale) ? Math.max(0, nextScale) : 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();

    return () => observer.disconnect();
  }, [canvas.height, canvas.width]);

  return (
    <div
      ref={viewportRef}
      className={cn("relative min-h-0 min-w-0 overflow-hidden", className)}
    >
      <div
        className={cn(
          "absolute top-1/2 left-1/2 origin-center overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-border",
          frameClassName,
        )}
        style={{
          width: canvas.width,
          height: canvas.height,
          opacity: scale > 0 ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function LetterPagePreview({ page, exportUuid, canvas }: {
  page: LetterPage;
  exportUuid: string;
  canvas: LetterCanvas;
}) {
  return (
    <div
      className="w-full"
      style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
    >
      <LetterPageViewport
        canvas={canvas}
        className="size-full"
        frameClassName="shadow-sm"
      >
        <LetterPageCanvas
          page={page}
          exportUuid={exportUuid}
          canvas={canvas}
        />
      </LetterPageViewport>
    </div>
  );
}

export function LetterPageThumbnail({ page, canvas, selected = false }: {
  page: LetterPage;
  canvas: LetterCanvas;
  selected?: boolean;
}) {
  const bodyPreview = getNoteDocumentPreview(serializeNoteDocument(page.blocks));
  const layout = page.layout || (page.kind === "cover" ? "cover" : "body");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-white text-left text-zinc-900 transition-colors",
        selected ? "border-foreground ring-2 ring-ring/30" : "border-zinc-200",
      )}
      style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
    >
      <div className="flex h-full flex-col p-[12%]">
        <p className="mb-[8%] text-[0.45rem] font-medium uppercase tracking-[0.13em] text-zinc-400">
          {layout === "cover" ? "Cover" : layout === "quote" ? "Quote" : `Page ${page.number}`}
        </p>
        {layout === "cover" ? (
          <>
            <p className="line-clamp-3 font-spectral text-[clamp(0.65rem,1.7vw,0.95rem)] leading-tight">
              {page.title || "Untitled letter"}
            </p>
            {page.subtitle ? (
              <p className="mt-1 line-clamp-2 text-[0.55rem] leading-tight text-zinc-500">{page.subtitle}</p>
            ) : null}
          </>
        ) : (
          <p className={cn(
            "line-clamp-8 text-[clamp(0.55rem,1.5vw,0.78rem)] text-zinc-700",
            layout === "quote" ? "my-auto text-center font-spectral leading-tight" : "leading-[1.35]",
          )}>
            {bodyPreview || "No text on this page."}
          </p>
        )}
      </div>
    </div>
  );
}

function CanvasText({
  as: Tag,
  ariaLabel,
  className,
  editable,
  maxLength,
  placeholder,
  value,
  onChange,
  onBlur,
  style,
}: {
  as: "h2" | "p";
  ariaLabel: string;
  className: string;
  editable: boolean;
  maxLength: number;
  placeholder: string;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  style?: CSSProperties;
}) {
  const elementRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element && document.activeElement !== element && element.innerText !== value) {
      element.textContent = value;
    }
  }, [value]);

  const emitValue = () => {
    const element = elementRef.current;
    if (!element) return;
    const nextValue = element.innerText.replace(/\r/g, "").slice(0, maxLength);
    if (element.innerText !== nextValue) {
      element.textContent = nextValue;
      placeCaretAtEnd(element);
    }
    onChange?.(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
    }
  };

  return (
    <Tag
      ref={(element) => {
        elementRef.current = element;
      }}
      className={cn(
        "letter-page-editable-text whitespace-pre-wrap outline-none",
        editable && "rounded-[0.25cqw] focus-visible:ring-[0.2cqw] focus-visible:ring-zinc-500/70 focus-visible:ring-offset-[0.4cqw]",
        className,
      )}
      style={style}
      contentEditable={editable ? "plaintext-only" : false}
      suppressContentEditableWarning
      role={editable ? "textbox" : undefined}
      aria-label={editable ? ariaLabel : undefined}
      aria-multiline={editable ? true : undefined}
      data-empty={!value}
      data-placeholder={editable || !value ? placeholder : undefined}
      onInput={emitValue}
      onBlur={() => {
        emitValue();
        onBlur?.();
      }}
      onKeyDown={handleKeyDown}
      onPaste={(event) => {
        if (!editable) return;
        event.preventDefault();
        insertPlainText(event.clipboardData.getData("text/plain"));
        queueMicrotask(emitValue);
      }}
      spellCheck={editable}
    >
      {editable ? null : value}
    </Tag>
  );
}

function insertPlainText(value: string) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  selection.deleteFromDocument();
  const range = selection.getRangeAt(0);
  const text = document.createTextNode(value);
  range.insertNode(text);
  range.setStartAfter(text);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function placeCaretAtEnd(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}
