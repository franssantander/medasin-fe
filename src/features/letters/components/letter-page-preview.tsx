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
import {
  LETTER_COVER_HERO_ASPECT_RATIO,
  normalizeLetterCover,
} from "../letter-cover";
import {
  letterPageTextSize,
  normalizeLetterPageTextScale,
} from "../letter-page-text-scale";
import type {
  LetterCanvas,
  LetterCover,
  LetterCoverTextAlignment,
  LetterPage,
} from "../type";

const noop = () => undefined;
const unavailable = async (): Promise<never> => {
  throw new Error("File uploads are unavailable in letter previews.");
};
const unavailableChild = async (): Promise<never> => {
  throw new Error("Child pages are unavailable in letter previews.");
};
const COVER_TEXT_ALIGNMENT_CLASS: Record<LetterCoverTextAlignment, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};
const COVER_TEXT_JUSTIFICATION_CLASS: Record<LetterCoverTextAlignment, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

type LetterPageCanvasProps = {
  page: LetterPage;
  canvas: LetterCanvas;
  exportUuid: string;
  pageTheme?: LetterCover["theme"];
  textScale?: number;
  editable?: boolean;
  className?: string;
  onTitleChange?: (title: string) => void;
  onBlocksChange?: (blocks: unknown[]) => void;
  onCoverBodyChange?: (blocks: unknown[], plainText: string) => void;
  onEditorDocumentChange?: (content: string) => void;
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
    pageTheme,
    textScale: textScaleOverride,
    editable = false,
    className,
    onTitleChange,
    onBlocksChange,
    onCoverBodyChange,
    onEditorDocumentChange,
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
    editable
      ? cover.description_blocks
      : page.content_source === "cover_entry"
      ? page.blocks
      : cover.description_blocks,
  );
  const coverDescriptionText = getNoteDocumentPreview(coverDescription);
  const resolvedTheme =
    pageTheme ?? (layout === "cover" ? cover.theme : "light");
  const pageIsDark = resolvedTheme === "dark";
  const coverTextAlignmentClass =
    COVER_TEXT_ALIGNMENT_CLASS[cover.text_alignment];
  const coverTextJustificationClass =
    COVER_TEXT_JUSTIFICATION_CLASS[cover.text_alignment];
  const coverSections = cover.section_order.filter(
    (section) =>
      section !== "author" &&
      (section !== "hero" || Boolean(cover.hero_image_url)),
  );
  const coverHasFooter = Boolean(
    cover.show_logo ||
      cover.author_name ||
      cover.date_label ||
      cover.avatar_url,
  );
  const coverHeroAspectRatio =
    cover.hero_image_aspect_ratio ?? LETTER_COVER_HERO_ASPECT_RATIO;
  const editorStyle = {
    "--letter-page-editor-font-size": letterPageTextSize(
      layout === "quote" ? 4.3 : 1.72,
      textScale,
    ),
  } as CSSProperties;

  useEffect(() => {
    if (layout === "cover" && !editable) {
      onEditorReady(null);
      onHistoryStateChange({ canUndo: false, canRedo: false });
      onContentApplied?.();
    }
  }, [editable, layout, onEditorReady, onHistoryStateChange, onContentApplied]);

  return (
    <div
      ref={ref}
      className={cn(
        "letter-page-canvas relative overflow-hidden",
        pageIsDark
          ? "bg-zinc-950 text-zinc-50"
          : "bg-white text-zinc-900",
        className,
      )}
      style={{ width: canvas.width, height: canvas.height }}
      data-page-canvas
      data-page-layout={layout}
      data-page-theme={resolvedTheme}
      role={editable ? "group" : "img"}
      aria-label={`${editable ? "Editable social page" : "Preview"} ${page.number}`}
    >
      {layout === "cover" ? (
        <div
          className="flex h-full flex-col gap-[3cqh] overflow-hidden p-[7cqw]"
          data-page-content
        >
          <div
            className="flex min-h-0 flex-1 flex-col gap-[3cqh] overflow-hidden"
            data-cover-main
          >
            {coverSections.map((section) => {
              if (section === "header") {
                if (!cover.subheader) return null;
                return (
                  <div
                    key={section}
                    data-cover-section="header"
                    className={cn(
                      "mx-auto flex w-full max-w-[92%] shrink-0 items-center",
                      coverTextJustificationClass,
                      coverTextAlignmentClass,
                    )}
                  >
                    <p
                      className={cn(
                        "text-[1.5cqw] font-medium uppercase tracking-[0.18em]",
                        pageIsDark ? "text-zinc-300" : "text-zinc-500",
                      )}
                      style={{ fontSize: letterPageTextSize(1.5, textScale) }}
                    >
                      {cover.subheader}
                    </p>
                  </div>
                );
              }

              if (section === "title") {
                return (
                  <div
                    key={section}
                    data-cover-section="title"
                    className={cn(
                      "mx-auto w-full max-w-[92%] shrink-0 overflow-hidden",
                      coverTextAlignmentClass,
                    )}
                  >
                    <CanvasText
                      as="h2"
                      ariaLabel="Cover title"
                      className={cn(
                        "font-spectral leading-[0.98] tracking-[-0.03em]",
                        coverTextAlignmentClass,
                      )}
                      style={{ fontSize: letterPageTextSize(5.8, textScale) }}
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

              if (section === "entry" && (coverDescriptionText || editable)) {
                return (
                  <div
                    key={section}
                    data-cover-section="entry"
                    data-cover-text-alignment={cover.text_alignment}
                    className={cn(
                      "letter-cover-description mx-auto w-full max-w-[92%] shrink-0 overflow-hidden",
                      coverTextAlignmentClass,
                      pageIsDark ? "text-zinc-300" : "text-zinc-600",
                    )}
                    style={{
                      "--letter-cover-description-font-size":
                        letterPageTextSize(1.8, textScale),
                    } as CSSProperties}
                  >
                    <NoteRichTextEditor
                      mode="resource"
                      theme={resolvedTheme}
                      editorChrome={editable ? "full" : "none"}
                      slashMenuPortalToBody={editable}
                      documentId={`letter-cover-description-${exportUuid}-${pageUuid}`}
                      content={coverDescription}
                      syncContent
                      onContentApplied={onContentApplied}
                      editable={editable}
                      noteOptions={[]}
                      onChange={(content) => {
                        if (!editable) return;
                        onEditorDocumentChange?.(content);
                        onCoverBodyChange?.(
                          parseNoteDocument(content).blocks,
                          getNoteDocumentPreview(content),
                        );
                      }}
                      onUploadFile={unavailable}
                      onCreateChild={unavailableChild}
                      onOpenNote={noop}
                      onEditorReady={onEditorReady}
                      onHistoryStateChange={onHistoryStateChange}
                      onBlur={onBlur}
                    />
                  </div>
                );
              }

              if (section === "hero" && cover.hero_image_url) {
                return (
                  <div
                    key={section}
                    data-cover-section="hero"
                    className="mx-auto min-h-[12cqh] max-h-[42cqh] shrink overflow-hidden rounded-[2cqw]"
                    style={{
                      aspectRatio: `${coverHeroAspectRatio}`,
                      width: `min(92%, ${42 * coverHeroAspectRatio}cqh)`,
                    }}
                  >
                    <Image
                      unoptimized
                      src={imageFetchSource(cover.hero_image_url)}
                      alt="Letter cover"
                      width={1600}
                      height={Math.max(
                        1,
                        Math.round(1600 / coverHeroAspectRatio),
                      )}
                      className="size-full object-cover object-center"
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
          {coverHasFooter ? (
            <footer
              data-cover-section="author"
              className="mx-auto flex w-full max-w-[92%] shrink-0 items-center justify-between gap-[2.5cqw]"
            >
              <div className="flex min-w-0 items-center gap-[2.5cqw]">
                {cover.avatar_url ? (
                  <Image
                    unoptimized
                    src={imageFetchSource(cover.avatar_url)}
                    alt={
                      cover.author_name
                        ? `${cover.author_name}'s avatar`
                        : "Cover author avatar"
                    }
                    width={96}
                    height={96}
                    className="size-[7cqw] rounded-full object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  {cover.author_name ? (
                    <p
                      className="truncate font-medium"
                      style={{
                        fontSize: letterPageTextSize(1.75, textScale),
                      }}
                    >
                      {cover.author_name}
                    </p>
                  ) : null}
                  {cover.date_label ? (
                    <p
                      className={
                        pageIsDark ? "text-zinc-400" : "text-zinc-500"
                      }
                      style={{
                        fontSize: letterPageTextSize(1.35, textScale),
                      }}
                    >
                      {cover.date_label}
                    </p>
                  ) : null}
                </div>
              </div>
              {cover.show_logo ? (
                <Image
                  src="/images/medasin-leaf.svg"
                  alt="Medasin"
                  width={96}
                  height={96}
                  className={cn(
                    "size-[7cqw] shrink-0 object-contain object-right",
                    pageIsDark && "invert",
                  )}
                  priority={!editable}
                />
              ) : null}
            </footer>
          ) : null}
        </div>
      ) : layout === "quote" ? (
        <div className="flex h-full flex-col p-[9cqw]">
          <Image
            src="/images/medasin-leaf.svg"
            alt=""
            width={72}
            height={72}
            className={cn(
              "size-[6cqw] object-contain object-left",
              pageIsDark && "invert",
            )}
            priority={!editable}
          />
          <div
            className={cn(
              "letter-page-quote-document relative m-auto h-[72%] w-[84%] overflow-hidden",
              pageIsDark ? "text-zinc-100" : "text-zinc-900",
            )}
            style={editorStyle}
            data-page-content
          >
            <span
              className={cn(
                "pointer-events-none absolute top-0 left-0 font-spectral text-[5cqw] leading-none",
                pageIsDark ? "text-zinc-700" : "text-zinc-300",
              )}
              aria-hidden="true"
            >
              “
            </span>
            <NoteRichTextEditor
              key={`${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              mode={editable ? "letter" : "resource"}
              theme={resolvedTheme}
              editorChrome={editable ? "full" : "none"}
              documentId={`letter-page-quote-${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              content={serializedBlocks}
              syncContent
              onContentApplied={onContentApplied}
              editable={editable}
              noteOptions={[]}
              onChange={(content) => {
                onEditorDocumentChange?.(content);
                onBlocksChange?.(parseNoteDocument(content).blocks);
              }}
              onUploadFile={onUploadFile}
              onCreateChild={unavailableChild}
              onOpenNote={noop}
              onEditorReady={onEditorReady}
              onHistoryStateChange={onHistoryStateChange}
              onBlur={onBlur}
            />
            <span
              className={cn(
                "pointer-events-none absolute right-0 bottom-0 font-spectral text-[5cqw] leading-none",
                pageIsDark ? "text-zinc-700" : "text-zinc-300",
              )}
              aria-hidden="true"
            >
              ”
            </span>
          </div>
          {page.signature ? (
            <div
              className={cn(
                "text-center text-[1.4cqw]",
                pageIsDark ? "text-zinc-400" : "text-zinc-500",
              )}
            >
              <p
                className={cn(
                  "font-medium",
                  pageIsDark ? "text-zinc-200" : "text-zinc-700",
                )}
              >
                {page.signature.name}
              </p>
              <p>{page.signature.handle}</p>
            </div>
          ) : (
            <p
              className={cn(
                "text-center text-[1.2cqw] uppercase tracking-[0.16em]",
                pageIsDark ? "text-zinc-500" : "text-zinc-400",
              )}
            >
              Medasin
            </p>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col p-[8cqw]">
          <div
            className={cn(
              "letter-page-document min-h-0 flex-1 overflow-hidden",
              pageIsDark ? "text-zinc-100" : "text-zinc-900",
            )}
            style={editorStyle}
            data-page-content
          >
            <NoteRichTextEditor
              key={`${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              mode={editable ? "letter" : "resource"}
              theme={resolvedTheme}
              editorChrome={editable ? "full" : "none"}
              documentId={`letter-page-body-${exportUuid}-${pageUuid}-${editable ? "edit" : "view"}`}
              content={serializedBlocks}
              syncContent
              onContentApplied={onContentApplied}
              editable={editable}
              noteOptions={[]}
              onChange={(content) => {
                onEditorDocumentChange?.(content);
                onBlocksChange?.(parseNoteDocument(content).blocks);
              }}
              onUploadFile={onUploadFile}
              onCreateChild={unavailableChild}
              onOpenNote={noop}
              onEditorReady={onEditorReady}
              onHistoryStateChange={onHistoryStateChange}
              onBlur={onBlur}
            />
          </div>
          {page.signature ? (
            <div
              className={cn(
                "mt-[5cqw] shrink-0 border-t pt-[3cqw]",
                pageIsDark ? "border-zinc-800" : "border-zinc-200",
              )}
            >
              <p className="font-spectral text-[2.2cqw]">{page.signature.name}</p>
              <p
                className={cn(
                  "mt-[0.6cqw] text-[1.3cqw]",
                  pageIsDark ? "text-zinc-400" : "text-zinc-500",
                )}
              >
                {page.signature.handle}
              </p>
            </div>
          ) : null}
          {page.continuation_label ? (
            <p
              className={cn(
                "mt-[3cqw] shrink-0 text-[1.2cqw] uppercase tracking-[0.12em]",
                pageIsDark ? "text-zinc-500" : "text-zinc-400",
              )}
            >
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

export function LetterPagePreview({ page, exportUuid, canvas, pageTheme }: {
  page: LetterPage;
  exportUuid: string;
  canvas: LetterCanvas;
  pageTheme?: LetterCover["theme"];
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
          pageTheme={pageTheme}
        />
      </LetterPageViewport>
    </div>
  );
}

export function LetterPageThumbnail({
  page,
  canvas,
  pageTheme = "light",
  selected = false,
}: {
  page: LetterPage;
  canvas: LetterCanvas;
  pageTheme?: LetterCover["theme"];
  selected?: boolean;
}) {
  const bodyPreview = getNoteDocumentPreview(serializeNoteDocument(page.blocks));
  const layout = page.layout || (page.kind === "cover" ? "cover" : "body");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border text-left transition-colors",
        pageTheme === "dark"
          ? "bg-zinc-950 text-zinc-50"
          : "bg-white text-zinc-900",
        selected
          ? "border-foreground ring-2 ring-ring/30"
          : pageTheme === "dark"
            ? "border-zinc-800"
            : "border-zinc-200",
      )}
      style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
      data-page-theme={pageTheme}
    >
      <div className="flex h-full flex-col p-[12%]">
        <p
          className={cn(
            "mb-[8%] text-[0.45rem] font-medium uppercase tracking-[0.13em]",
            pageTheme === "dark" ? "text-zinc-500" : "text-zinc-400",
          )}
        >
          {layout === "cover" ? "Cover" : layout === "quote" ? "Quote" : `Page ${page.number}`}
        </p>
        {layout === "cover" ? (
          <>
            <p className="line-clamp-3 font-spectral text-[clamp(0.65rem,1.7vw,0.95rem)] leading-tight">
              {page.title || "Untitled letter"}
            </p>
            {page.subtitle ? (
              <p
                className={cn(
                  "mt-1 line-clamp-2 text-[0.55rem] leading-tight",
                  pageTheme === "dark" ? "text-zinc-400" : "text-zinc-500",
                )}
              >
                {page.subtitle}
              </p>
            ) : null}
          </>
        ) : (
          <p className={cn(
            "line-clamp-8 text-[clamp(0.55rem,1.5vw,0.78rem)]",
            pageTheme === "dark" ? "text-zinc-300" : "text-zinc-700",
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
