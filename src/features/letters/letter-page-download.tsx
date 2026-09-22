import JSZip from "jszip";
import { toBlob } from "html-to-image";
import { imageFetchSource } from "@/lib/image/crop-image";
import { getLetterPageTheme } from "./letter-cover";
import { createLetterPageRenderer } from "./letter-page-renderer";
import { LETTER_EXPORT_FORMATS } from "./letter-export-formats";
import type { LetterExport, LetterPage } from "./type";

export async function downloadLetterPage(
  letterExport: LetterExport,
  page: LetterPage,
  letterTitle: string,
) {
  const blob = await renderPage(
    letterExport,
    page,
    getLetterPageTheme(letterExport.pages ?? [page]),
  );
  downloadBlob(blob, pageFilename(letterTitle, letterExport, page));
}

export async function downloadLetterPages(
  letterExport: LetterExport,
  pages: LetterPage[],
  letterTitle: string,
  onProgress?: (completed: number, total: number) => void,
) {
  const zip = new JSZip();
  const pageTheme = getLetterPageTheme(pages);

  for (const [index, page] of pages.entries()) {
    const blob = await renderPage(letterExport, page, pageTheme);
    zip.file(pageFilename(letterTitle, letterExport, page), blob);
    onProgress?.(index + 1, pages.length);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const format = LETTER_EXPORT_FORMATS[letterExport.format];
  downloadBlob(blob, `${slugify(letterTitle)}-${slugify(format.shortLabel)}.zip`);
}

async function renderPage(
  letterExport: LetterExport,
  page: LetterPage,
  pageTheme: ReturnType<typeof getLetterPageTheme>,
) {
  const renderer = createLetterPageRenderer(
    letterExport.canvas,
    letterExport.uuid,
    undefined,
    pageTheme,
  );
  try {
    const canvas = await renderer.render(page);
    await prepareImagesForExport(canvas);
    const blob = await toBlob(canvas, {
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: getComputedStyle(canvas).backgroundColor,
    });
    if (!blob) throw new Error("The page image could not be created.");
    return blob;
  } finally {
    renderer.dispose();
  }
}

async function prepareImagesForExport(canvas: HTMLElement) {
  await Promise.all(
    Array.from(canvas.querySelectorAll<HTMLImageElement>("img")).map(
      async (image) => {
        const source = imageFetchSource(image.currentSrc || image.src);
        if (source !== image.getAttribute("src")) {
          await replaceImageSource(image, source);
        }

        if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
          await waitForImage(image);
        }
      },
    ),
  );
}

function replaceImageSource(image: HTMLImageElement, source: string) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("An image on this page could not be loaded for export."));
    };

    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
    image.removeAttribute("srcset");
    image.src = source;
    if (image.complete) {
      if (image.naturalWidth && image.naturalHeight) handleLoad();
      else handleError();
    }
  });
}

function waitForImage(image: HTMLImageElement) {
  if (image.complete && image.naturalWidth && image.naturalHeight) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("An image on this page could not be loaded for export."));
    };

    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
  });
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
