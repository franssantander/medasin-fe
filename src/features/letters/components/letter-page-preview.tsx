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
import { cn } from "@/lib/utils";
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
  onSubtitleChange?: (subtitle: string) => void;
  onBlocksChange?: (blocks: unknown[]) => void;
  onEditorReady?: (controls: NoteRichTextEditorControls | null) => void;
  onHistoryStateChange?: (state: NoteEditorHistoryState) => void;
  onBlur?: () => void;
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
    onSubtitleChange,
    onBlocksChange,
    onEditorReady = noop,
    onHistoryStateChange = noop,
    onBlur,
  },
  ref,
) {
  const pageUuid = page.uuid || `${exportUuid}-${page.number}`;
  const layout = page.layout || (page.kind === "cover" ? "cover" : "body");
  const serializedBlocks = serializeNoteDocument(page.blocks);
  const textScale = normalizeLetterPageTextScale(
    textScaleOverride ?? page.text_scale,
  );
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
    }
  }, [layout, onEditorReady, onHistoryStateChange]);

  return (
    <div
      ref={ref}
      className={cn(
        "letter-page-canvas relative overflow-hidden bg-white text-zinc-900",
        className,
      )}
      style={{ width: canvas.width, height: canvas.height }}
      data-page-canvas
      role={editable ? "group" : "img"}
      aria-label={`${editable ? "Editable social page" : "Preview"} ${page.number}`}
    >
      {layout === "cover" ? (
        <div className="flex h-full flex-col justify-between p-[9cqw]">
          <Image
            src="/images/medasin-ph.svg"
            alt=""
            width={96}
            height={96}
            className="size-[9cqw] min-h-7 min-w-7 object-contain object-left"
            priority={!editable}
          />
          <div
            className="max-h-[62%] max-w-[86%] overflow-hidden"
            data-page-content
          >
            <p className="mb-[5cqw] text-[1.35cqw] font-medium uppercase tracking-[0.18em] text-zinc-500">
              A letter
            </p>
            <CanvasText
              as="h2"
              ariaLabel="Cover title"
              className="font-spectral text-[5.2cqw] leading-[0.98] tracking-[-0.03em]"
              style={{ fontSize: letterPageTextSize(5.2, textScale) }}
              editable={editable}
              maxLength={120}
              placeholder="Untitled letter"
              value={page.title ?? ""}
              onChange={onTitleChange}
              onBlur={onBlur}
            />
            {editable || page.subtitle ? (
              <CanvasText
                as="p"
                ariaLabel="Cover subtitle"
                className="mt-[5cqw] max-w-[70%] text-[1.8cqw] leading-relaxed text-zinc-600"
                style={{ fontSize: letterPageTextSize(1.8, textScale) }}
                editable={editable}
                maxLength={240}
                placeholder="Add a subtitle"
                value={page.subtitle ?? ""}
                onChange={onSubtitleChange}
                onBlur={onBlur}
              />
            ) : null}
          </div>
          <p className="text-[1.2cqw] uppercase tracking-[0.16em] text-zinc-400">
            Medasin
          </p>
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
              mode="resource"
              editorChrome="formatting-only"
              documentId={`letter-page-quote-${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              content={serializedBlocks}
              editable={editable}
              noteOptions={[]}
              onChange={(content) =>
                onBlocksChange?.(parseNoteDocument(content).blocks)
              }
              onUploadFile={unavailable}
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
              mode="resource"
              editorChrome="formatting-only"
              documentId={`letter-page-body-${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              content={serializedBlocks}
              editable={editable}
              noteOptions={[]}
              onChange={(content) =>
                onBlocksChange?.(parseNoteDocument(content).blocks)
              }
              onUploadFile={unavailable}
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
          {page.truncated && page.continuation_label ? (
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
