import { createRoot } from "react-dom/client";
import JSZip from "jszip";
import { toBlob } from "html-to-image";
import { LetterPageCanvas } from "./components/letter-page-preview";
import { LETTER_EXPORT_FORMATS } from "./letter-export-formats";
import type { LetterExport, LetterPage } from "./type";

export async function downloadLetterPage(
  letterExport: LetterExport,
  page: LetterPage,
  letterTitle: string,
) {
  const blob = await renderPage(letterExport, page);
  downloadBlob(blob, pageFilename(letterTitle, letterExport, page));
}

export async function downloadLetterPages(
  letterExport: LetterExport,
  pages: LetterPage[],
  letterTitle: string,
  onProgress?: (completed: number, total: number) => void,
) {
  const zip = new JSZip();

  for (const [index, page] of pages.entries()) {
    const blob = await renderPage(letterExport, page);
    zip.file(pageFilename(letterTitle, letterExport, page), blob);
    onProgress?.(index + 1, pages.length);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const format = LETTER_EXPORT_FORMATS[letterExport.format];
  downloadBlob(blob, `${slugify(letterTitle)}-${slugify(format.shortLabel)}.zip`);
}

async function renderPage(letterExport: LetterExport, page: LetterPage) {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${letterExport.canvas.width}px`,
    height: `${letterExport.canvas.height}px`,
    pointerEvents: "none",
  });
  document.body.append(host);

  const root = createRoot(host);
  root.render(
    <LetterPageCanvas
      page={page}
      canvas={letterExport.canvas}
      exportUuid={letterExport.uuid}
    />,
  );

  try {
    await document.fonts.ready;
    await waitForRender(host);
    const canvas = host.querySelector<HTMLElement>("[data-page-canvas]");
    if (!canvas) throw new Error("The page renderer did not become ready.");
    if (pageOverflows(canvas)) {
      throw new Error(`Page ${page.number} has more content than its canvas can hold.`);
    }

    const blob = await toBlob(canvas, {
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });
    if (!blob) throw new Error("The page image could not be created.");
    return blob;
  } finally {
    root.unmount();
    host.remove();
  }
}

function pageOverflows(canvas: HTMLElement) {
  const content = canvas.querySelector<HTMLElement>("[data-page-content]");
  if (!content) return false;
  const editor = content.querySelector<HTMLElement>(".bn-editor");
  const measured = editor ?? content;
  return measured.scrollHeight > measured.clientHeight + 2;
}

async function waitForRender(host: HTMLElement) {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const images = Array.from(host.querySelectorAll("img"));
  await Promise.all(
    images.map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
  await new Promise((resolve) => window.setTimeout(resolve, 150));
}

function pageFilename(
  letterTitle: string,
  letterExport: LetterExport,
  page: LetterPage,
) {
  const format = LETTER_EXPORT_FORMATS[letterExport.format];
  return `${slugify(letterTitle)}-${slugify(format.shortLabel)}-page-${String(page.number).padStart(2, "0")}.png`;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "letter"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
