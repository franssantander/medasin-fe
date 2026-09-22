import { createRoot } from "react-dom/client";
import { LetterPageCanvas } from "./components/letter-page-preview";
import type { LetterCanvas, LetterPage } from "./type";

export type LetterPageMeasurement = {
  availableHeight: number;
  contentHeight: number;
  fits: boolean;
};

/** One geometry measurement for pagination, the workspace and downloads. */
export function measureLetterPage(
  canvas: HTMLElement,
): LetterPageMeasurement | null {
  if (
    canvas.scrollHeight > canvas.clientHeight + 1 ||
    canvas.scrollWidth > canvas.clientWidth + 1
  ) {
    return {
      availableHeight: canvas.clientHeight,
      contentHeight: canvas.scrollHeight,
      fits: false,
    };
  }
  const content = canvas.querySelector<HTMLElement>("[data-page-content]");
  const coverMain =
    canvas.dataset.pageLayout === "cover"
      ? content?.querySelector<HTMLElement>("[data-cover-main]")
      : null;
  const editor =
    canvas.dataset.pageLayout === "cover"
      ? null
      : content?.querySelector<HTMLElement>(".bn-editor");
  const measured = coverMain ?? editor ?? content;
  if (
    !content ||
    !measured ||
    measured.clientHeight <= 0 ||
    measured.clientWidth <= 0
  ) {
    return null;
  }

  let contentHeight = measured.scrollHeight;
  let fits =
    measured.scrollHeight <= measured.clientHeight + 1 &&
    measured.scrollWidth <= measured.clientWidth + 1;

  // Bounding boxes also catch centered content overflowing above the scroll
  // origin, which scrollHeight alone cannot represent.
  const group = editor?.querySelector<HTMLElement>(":scope > .bn-block-group");
  if (group) {
    const bounds = content.getBoundingClientRect();
    const blocks = group.getBoundingClientRect();
    contentHeight = Math.max(contentHeight, group.scrollHeight, blocks.height);
    if (blocks.top < bounds.top - 1 || blocks.bottom > bounds.bottom + 1) {
      fits = false;
    }
  }

  return {
    availableHeight: measured.clientHeight,
    contentHeight,
    fits,
  };
}

export function letterPageFits(canvas: HTMLElement): boolean {
  return measureLetterPage(canvas)?.fits ?? false;
}

export function createLetterPageRenderer(canvas: LetterCanvas, exportUuid: string, signal?: AbortSignal) {
  const host = document.createElement("div");
  host.className = "letter-page-measuring";
  host.setAttribute("aria-hidden", "true");
  host.inert = true;
  Object.assign(host.style, {
    position: "fixed", left: "-100000px", top: "0",
    width: `${canvas.width}px`, height: `${canvas.height}px`, pointerEvents: "none",
  });
  document.body.append(host);
  const root = createRoot(host);

  return {
    async render(page: LetterPage) {
      signal?.throwIfAborted();
      let applied = false;
      root.render(
        <LetterPageCanvas
          page={{ ...page, uuid: "measurement" }} canvas={canvas} exportUuid={exportUuid}
          onContentApplied={() => { applied = true; }}
        />,
      );
      const deadline = performance.now() + 15000;
      let previous = "";
      let stableFrames = 0;
      while (performance.now() < deadline) {
        signal?.throwIfAborted();
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const element = host.querySelector<HTMLElement>("[data-page-canvas]");
        const content = element?.querySelector<HTMLElement>("[data-page-content]");
        const coverMain =
          page.layout === "cover"
            ? content?.querySelector<HTMLElement>("[data-cover-main]")
            : null;
        const editor = content?.querySelector<HTMLElement>(".bn-editor");
        if (!applied || !element || !content || (page.layout !== "cover" && !editor)) continue;
        if (document.fonts.status !== "loaded" || Array.from(host.querySelectorAll("img")).some((img) => !img.complete)) continue;
        const measured = coverMain ?? editor ?? content;
        if (!measured.clientHeight || !measured.clientWidth) continue;
        const sizes = `${measured.clientHeight}:${measured.clientWidth}:${measured.scrollHeight}:${measured.scrollWidth}`;
        stableFrames = sizes === previous ? stableFrames + 1 : 0;
        previous = sizes;
        if (stableFrames >= 2) return element;
      }
      throw new Error("The page could not finish rendering. Please try again.");
    },
    dispose() { root.unmount(); host.remove(); },
  };
}
