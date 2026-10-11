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
  useLetterCoverFit,
  type LetterCoverFit,
} from "../hooks/use-letter-cover-fit";
import {
  LETTER_COVER_HERO_ASPECT_RATIO,
  letterCoverTextSize,
  normalizeLetterCover,
} from "../letter-cover";
import {
  letterPageTextSize,
  normalizeLetterPageTextScale,
} from "../letter-page-text-scale";
import type {
  LetterCanvas,
  LetterCover,
  LetterCoverSection,
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
const COVER_COLUMN_CLASS = "mx-auto w-full max-w-[92%]";
/** Tallest the cover image may be, as a share of the page height. */
const COVER_HERO_MAX_HEIGHT = { overlay: 0.48, below: 0.4 } as const;
// The visible logo stops seven units before the SVG's 135-unit right edge.
const COVER_LOGO_RIGHT_INSET = "0.363cqw";

type LetterPageCanvasProps = {
  page: LetterPage;
  canvas: LetterCanvas;
  exportUuid: string;
  pageTheme?: LetterCover["theme"];
  /** Page numbers are an export-wide cover setting. */
  showPageNumbers?: boolean;
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
  /** How the cover fitted its text: shrunk, or still too full. */
  onCoverFitChange?: (fit: LetterCoverFit) => void;
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
    showPageNumbers: pageNumbersEnabled = true,
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
    onCoverFitChange,
  },
  ref,
) {
  const pageUuid = page.uuid || `${exportUuid}-${page.number}`;
  const layout = page.layout || (page.kind === "cover" ? "cover" : "body");
  const displayPageNumber = page.number - 1;
  const showPageNumber =
    pageNumbersEnabled &&
    layout !== "cover" &&
    !(page.kind === "final" && page.number === 2);
  const serializedBlocks = serializeNoteDocument(page.blocks);
  const textScale = normalizeLetterPageTextScale(
    textScaleOverride ?? page.text_scale,
  );
  const cover = normalizeLetterCover(page.cover);
  // The cover always shows its whole entry; older exports split it over pages.
  const coverDescription = serializeNoteDocument(cover.description_blocks);
  const coverDescriptionText = getNoteDocumentPreview(coverDescription);
  const resolvedTheme =
    pageTheme ?? (layout === "cover" ? cover.theme : "light");
  const pageIsDark = resolvedTheme === "dark";
  const coverTextAlignmentClass =
    COVER_TEXT_ALIGNMENT_CLASS[cover.text_alignment];
  const coverTextJustificationClass =
    COVER_TEXT_JUSTIFICATION_CLASS[cover.text_alignment];
  const byline = {
    name: cover.show_author ? cover.author_name.trim() : "",
    avatarUrl: cover.show_author ? cover.avatar_url : null,
    meta: [
      cover.show_author ? cover.author_handle.trim() : "",
      cover.show_date ? cover.date_label.trim() : "",
    ].filter(Boolean).join(" · "),
  };
  const hasByline = Boolean(byline.name || byline.avatarUrl || byline.meta);
  const bylineAtBottom = cover.byline_placement === "bottom";
  const coverSections = cover.section_order.filter(
    (section) =>
      (section !== "header" || Boolean(cover.subheader)) &&
      (section !== "entry" || Boolean(coverDescriptionText || editable)) &&
      (section !== "hero" || Boolean(cover.hero_image_url)) &&
      (section !== "author" || (hasByline && !bylineAtBottom)),
  );
  const footerByline = hasByline && bylineAtBottom;
  const coverHeroAspectRatio =
    cover.hero_image_aspect_ratio ?? LETTER_COVER_HERO_ASPECT_RATIO;
  const heroCaption = cover.hero_image_caption.trim();
  const captionBelowImage = cover.hero_image_caption_placement === "below";
  const editorStyle = {
    "--letter-page-editor-font-size": letterPageTextSize(
      layout === "quote" ? 4.3 : 2.7,
      textScale,
    ),
  } as CSSProperties;

  const coverMainRef = useRef<HTMLDivElement>(null);
  useLetterCoverFit(coverMainRef, layout === "cover", onCoverFitChange);

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
      aria-label={
        layout === "cover"
          ? `${editable ? "Editable social" : "Preview"} cover${!editable && heroCaption ? `, image caption: ${heroCaption}` : ""}`
          : `${editable ? "Editable social page" : "Preview page"} ${displayPageNumber}`
      }
    >
      {layout === "cover" ? (
        <div
          className="flex h-full flex-col gap-[3cqh] overflow-hidden p-[7cqw]"
          data-page-content
        >
          <div
            ref={coverMainRef}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            data-cover-main
          >
            {coverSections.map((section, index) => {
              const spacing = coverSectionSpacing(coverSections[index - 1], section);
              if (section === "header") {
                return (
                  <div
                    key={section}
                    data-cover-section="header"
                    className={cn(
                      COVER_COLUMN_CLASS,
                      spacing,
                      "flex shrink-0 items-center",
                      coverTextJustificationClass,
                      coverTextAlignmentClass,
                    )}
                  >
                    <p
                      className={cn(
                        "font-semibold uppercase tracking-[0.16em]",
                        pageIsDark ? "text-zinc-300" : "text-zinc-500",
                      )}
                      style={{
                        fontSize: letterCoverTextSize(
                          2,
                          textScale,
                          cover.subheader_font_scale,
                        ),
                      }}
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
                      COVER_COLUMN_CLASS,
                      spacing,
                      "shrink-0 overflow-hidden",
                      coverTextAlignmentClass,
                    )}
                  >
                    <CanvasText
                      as="h2"
                      ariaLabel="Cover title"
                      className={cn(
                        "font-spectral leading-[1.04] tracking-[-0.025em]",
                        coverTextAlignmentClass,
                      )}
                      style={{
                        fontSize: letterCoverTextSize(
                          7,
                          textScale,
                          cover.title_font_scale,
                        ),
                      }}
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

              if (section === "entry") {
                return (
                  <div
                    key={section}
                    data-cover-section="entry"
                    data-cover-text-alignment={cover.text_alignment}
                    className={cn(
                      COVER_COLUMN_CLASS,
                      spacing,
                      // Only a cover that is still full clips the entry (globals.css).
                      "letter-cover-description shrink-0 overflow-hidden",
                      coverTextAlignmentClass,
                      pageIsDark ? "text-zinc-300" : "text-zinc-600",
                    )}
                    style={{
                      // `--letter-cover-fit` is set by useLetterCoverFit.
                      "--letter-cover-description-font-size": `calc(${letterCoverTextSize(
                        2.5,
                        textScale,
                        cover.body_font_scale,
                      )} * var(--letter-cover-fit, 1))`,
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
                      pageEditor
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

              if (section === "author") {
                return (
                  <CoverByline
                    key={section}
                    byline={byline}
                    alignment={cover.text_alignment}
                    textScale={textScale}
                    pageIsDark={pageIsDark}
                    className={cn(COVER_COLUMN_CLASS, spacing)}
                  />
                );
              }

              if (section === "hero" && cover.hero_image_url) {
                return (
                  <figure
                    key={section}
                    data-cover-section="hero"
                    data-caption-placement={cover.hero_image_caption_placement}
                    data-cover-hero-frame={captionBelowImage ? undefined : ""}
                    data-max-height={captionBelowImage ? undefined : COVER_HERO_MAX_HEIGHT.overlay}
                    className={cn(
                      COVER_COLUMN_CLASS,
                      spacing,
                      // useLetterCoverFit sets the image height.
                      captionBelowImage
                        ? "flex shrink-0 flex-col items-center gap-[1cqh]"
                        : "relative shrink-0 overflow-hidden rounded-[2cqw]",
                    )}
                    style={captionBelowImage ? undefined : {
                      aspectRatio: `${coverHeroAspectRatio}`,
                      maxHeight: `${COVER_HERO_MAX_HEIGHT.overlay * 100}cqh`,
                    }}
                  >
                    <div
                      data-cover-hero-image
                      data-cover-hero-frame={captionBelowImage ? "" : undefined}
                      data-max-height={captionBelowImage ? COVER_HERO_MAX_HEIGHT.below : undefined}
                      data-aspect-ratio={coverHeroAspectRatio}
                      className={cn(
                        "relative overflow-hidden rounded-[2cqw]",
                        captionBelowImage
                          ? "w-full shrink-0"
                          : "size-full",
                      )}
                      style={captionBelowImage ? {
                        aspectRatio: `${coverHeroAspectRatio}`,
                        maxHeight: `${COVER_HERO_MAX_HEIGHT.below * 100}cqh`,
                      } : undefined}
                    >
                      <Image
                        unoptimized
                        // Off-screen measuring and download renders never load lazy images.
                        loading="eager"
                        src={imageFetchSource(cover.hero_image_url)}
                        alt="Letter cover"
                        width={1600}
                        height={Math.max(
                          1,
                          Math.round(1600 / coverHeroAspectRatio),
                        )}
                        className="absolute inset-0 size-full object-cover object-center"
                      />
                    </div>
                    {heroCaption ? (
                      <figcaption
                        data-cover-hero-caption
                        data-caption-alignment={cover.hero_image_caption_alignment}
                        data-caption-placement={cover.hero_image_caption_placement}
                        className={cn(
                          "break-words px-[2.5cqw]",
                          captionBelowImage
                            ? cn(
                                "w-full shrink-0 pt-[0.8cqh] pb-[0.5cqh] leading-snug",
                                pageIsDark ? "text-zinc-400" : "text-zinc-500",
                              )
                            : "absolute inset-x-0 bottom-0 max-h-full overflow-hidden bg-black/75 py-[1.5cqw] font-medium leading-[1.3] text-white",
                          COVER_TEXT_ALIGNMENT_CLASS[cover.hero_image_caption_alignment],
                        )}
                        style={{
                          fontSize: letterPageTextSize(
                            captionBelowImage ? 1.8 : 1.9,
                            textScale,
                          ),
                        }}
                      >
                        {heroCaption}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              }

              return null;
            })}
          </div>
          {cover.show_logo || footerByline ? (
            <footer
              data-cover-footer
              className={cn(
                COVER_COLUMN_CLASS,
                "flex shrink-0 items-center gap-[2.5cqw]",
                footerByline ? "justify-between" : "justify-end",
              )}
            >
              {footerByline ? (
                <CoverByline
                  byline={byline}
                  alignment="left"
                  textScale={textScale}
                  pageIsDark={pageIsDark}
                  className="min-w-0"
                />
              ) : null}
              {cover.show_logo ? (
                <span data-cover-section="logo" className="flex shrink-0">
                  <Image
                    src="/images/medasin-leaf.svg"
                    alt="Medasin"
                    width={96}
                    height={96}
                    className={cn(
                      "size-[6cqw] shrink-0 object-contain object-right",
                      pageIsDark && "invert",
                    )}
                    style={{ transform: `translateX(${COVER_LOGO_RIGHT_INSET})` }}
                    priority={!editable}
                  />
                </span>
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
              pageEditor
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
          {page.signature?.name.trim() || page.signature?.handle.trim() ? (
            <div
              className={cn(
                "letter-page-signature text-center",
                pageIsDark ? "text-zinc-400" : "text-zinc-500",
              )}
            >
              {page.signature?.name.trim() ? (
                <p
                  className={cn(
                    "font-medium [overflow-wrap:anywhere]",
                    pageIsDark ? "text-zinc-200" : "text-zinc-700",
                  )}
                  style={{ fontSize: letterPageTextSize(2.2, textScale) }}
                >
                  {page.signature.name}
                </p>
              ) : null}
              {page.signature?.handle.trim() ? (
                <p
                  className="[overflow-wrap:anywhere]"
                  style={{ fontSize: letterPageTextSize(1.8, textScale) }}
                >
                  {page.signature.handle}
                </p>
              ) : null}
            </div>
          ) : !page.signature ? (
            <p
              className={cn(
                "text-center text-[1.2cqw] uppercase tracking-[0.16em]",
                pageIsDark ? "text-zinc-500" : "text-zinc-400",
              )}
            >
              Medasin
            </p>
          ) : null}
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
              pageEditor
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
          {page.signature?.name.trim() || page.signature?.handle.trim() ? (
            <div
              className={cn(
                "letter-page-signature mt-[4cqw] shrink-0 border-t pt-[3cqw]",
                pageIsDark ? "border-zinc-800" : "border-zinc-200",
              )}
            >
              {page.signature?.name.trim() ? (
                <p
                  className="font-spectral leading-tight [overflow-wrap:anywhere]"
                  style={{ fontSize: letterPageTextSize(2.6, textScale) }}
                >
                  {page.signature.name}
                </p>
              ) : null}
              {page.signature?.handle.trim() ? (
                <p
                  className={cn(
                    page.signature.name.trim() && "mt-[0.6cqw]",
                    "leading-tight [overflow-wrap:anywhere]",
                    pageIsDark ? "text-zinc-400" : "text-zinc-500",
                  )}
                  style={{ fontSize: letterPageTextSize(1.9, textScale) }}
                >
                  {page.signature.handle}
                </p>
              ) : null}
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
      {showPageNumber ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-[3cqw] left-1/2 -translate-x-1/2 text-[1.9cqw] leading-none tabular-nums",
            pageIsDark ? "text-zinc-500" : "text-zinc-400",
          )}
          data-page-number
        >
          {displayPageNumber}
        </span>
      ) : null}
    </div>
  );
});

export function LetterPageViewport({
  canvas,
  children,
  className,
  frameClassName,
  minScale = 0,
}: {
  canvas: LetterCanvas;
  children: ReactNode;
  className?: string;
  frameClassName?: string;
  minScale?: number;
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
      setScale(
        Number.isFinite(nextScale) ? Math.max(minScale, nextScale) : 0,
      );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();

    return () => observer.disconnect();
  }, [canvas.height, canvas.width, minScale]);

  return (
    <div
      ref={viewportRef}
      className={cn(
        "relative min-h-0 min-w-0",
        minScale > 0 ? "overflow-auto" : "overflow-hidden",
        className,
      )}
    >
      <div
        className="relative min-h-full min-w-full"
        style={{
          width: canvas.width * scale,
          height: canvas.height * scale,
        }}
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

/**
 * Space above a cover section depends on its neighbour: the kicker and a byline
 * directly under the title hug it equally, an excerpt sits a little apart, and
 * the image is its own band.
 */
function coverSectionSpacing(
  previous: LetterCoverSection | undefined,
  section: LetterCoverSection,
) {
  if (!previous) return undefined;
  if (previous === "hero" || section === "hero") return "mt-[3.2cqh]";
  if (previous === "header" && section === "title") return "mt-[0.8cqh]";
  if (previous === "title" && section === "author") return "mt-[0.8cqh]";
  if (previous === "title" || section === "author") return "mt-[1.6cqh]";
  return "mt-[2cqh]";
}

type CoverBylineContent = {
  name: string;
  avatarUrl: string | null;
  meta: string;
};

/**
 * Left and right covers stack the name over the meta line beside a larger
 * avatar; centered covers keep the avatar inline with the name instead.
 */
function CoverByline({
  byline,
  alignment,
  textScale,
  pageIsDark,
  className,
}: {
  byline: CoverBylineContent;
  alignment: LetterCoverTextAlignment;
  textScale: number;
  pageIsDark: boolean;
  className?: string;
}) {
  const inline = alignment === "center";
  const avatar = byline.avatarUrl ? (
    <Image
      unoptimized
      loading="eager"
      src={imageFetchSource(byline.avatarUrl)}
      alt={byline.name ? `${byline.name}'s avatar` : "Cover author avatar"}
      width={96}
      height={96}
      data-cover-byline-avatar
      className={cn(
        "shrink-0 rounded-full object-cover",
        !inline && "size-[5.6cqw]",
      )}
      style={
        inline
          ? {
              width: letterPageTextSize(4, textScale),
              height: letterPageTextSize(4, textScale),
            }
          : undefined
      }
    />
  ) : null;
  const name = byline.name ? (
    <p
      data-cover-byline-name
      className="min-w-0 truncate leading-tight font-semibold"
      style={{ fontSize: letterPageTextSize(2.3, textScale) }}
    >
      {byline.name}
    </p>
  ) : null;
  const meta = byline.meta ? (
    <p
      data-cover-byline-meta
      className={cn(
        "truncate leading-tight",
        byline.name && (inline ? "mt-[0.8cqw]" : "mt-[0.6cqw]"),
        pageIsDark ? "text-zinc-400" : "text-zinc-600",
      )}
      style={{ fontSize: letterPageTextSize(1.9, textScale) }}
    >
      {byline.meta}
    </p>
  ) : null;

  return (
    <div
      data-cover-section="author"
      data-byline-layout={inline ? "inline" : "stacked"}
      className={cn(
        "flex shrink-0",
        inline
          ? "flex-col items-center text-center"
          : cn(
              "items-center gap-[2cqw]",
              alignment === "right"
                ? "flex-row-reverse text-right"
                : "text-left",
            ),
        className,
      )}
    >
      {inline ? (
        <>
          {avatar || name ? (
            <div className="flex max-w-full items-center justify-center gap-[1.4cqw]">
              {avatar}
              {name}
            </div>
          ) : null}
          {meta}
        </>
      ) : (
        <>
          {avatar}
          {name || meta ? (
            <div className="min-w-0">
              {name}
              {meta}
            </div>
          ) : null}
        </>
      )}
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
    // Blurring without typing is not an edit; it must not re-fit the cover.
    if (nextValue !== value) onChange?.(nextValue);
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
        // Edited in place like the cover body text: a focus ring around the
        // full-width title painted over the kicker and byline beside it.
        "letter-page-editable-text whitespace-pre-wrap caret-current outline-none",
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
