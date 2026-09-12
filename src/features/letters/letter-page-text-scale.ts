import type { LetterCanvas, LetterPageTextScaleMode } from "./type";

export const LETTER_PAGE_TEXT_SCALE_DEFAULT = 1;
export const LETTER_PAGE_TEXT_SCALE_MIN = 0.7;
export const LETTER_PAGE_TEXT_SCALE_MAX = 1.4;
export const LETTER_PAGE_TEXT_SCALE_STEP = 0.05;

export function normalizeLetterPageTextScale(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return LETTER_PAGE_TEXT_SCALE_DEFAULT;
  }

  const clamped = Math.min(
    LETTER_PAGE_TEXT_SCALE_MAX,
    Math.max(LETTER_PAGE_TEXT_SCALE_MIN, numeric),
  );

  return Number(
    (
      Math.round(clamped / LETTER_PAGE_TEXT_SCALE_STEP) *
      LETTER_PAGE_TEXT_SCALE_STEP
    ).toFixed(2),
  );
}

export function normalizeLetterPageTextScaleMode(
  value: unknown,
  scale: unknown,
): LetterPageTextScaleMode {
  if (value === "manual") return "manual";
  if (value === "auto") return "auto";

  // Older saved page sets had no mode. Preserve a non-default scale as an
  // intentional override while allowing untouched pages to enter auto-fit.
  return normalizeLetterPageTextScale(scale) === LETTER_PAGE_TEXT_SCALE_DEFAULT
    ? "auto"
    : "manual";
}

export function getLetterPageCanvasBaseline(canvas: LetterCanvas): number {
  const referenceWidth = 1080;
  const referenceHeight = 1350;
  const sizeRatio = Math.min(
    canvas.width / referenceWidth,
    canvas.height / referenceHeight,
  );

  return normalizeLetterPageTextScale(sizeRatio);
}

export function getLetterPageAutoFitScale(
  currentScale: unknown,
  availableHeight: number,
  contentHeight: number,
): number {
  const current = normalizeLetterPageTextScale(currentScale);

  if (
    !Number.isFinite(availableHeight) ||
    !Number.isFinite(contentHeight) ||
    availableHeight <= 0 ||
    contentHeight <= 0
  ) {
    return current;
  }

  // Only adjust pages that are clearly overflowing or unusually sparse. The
  // small safety margin prevents a rounded scale from landing on the edge.
  if (contentHeight > availableHeight) {
    return normalizeLetterPageTextScale(
      current * ((availableHeight / contentHeight) * 0.98),
    );
  }

  if (contentHeight < availableHeight * 0.55) {
    return normalizeLetterPageTextScale(
      current * ((availableHeight * 0.78) / contentHeight),
    );
  }

  return current;
}

export function letterPageTextScalePercent(value: unknown): number {
  return Math.round(normalizeLetterPageTextScale(value) * 100);
}

export function letterPageTextSize(baseCqw: number, value: unknown): string {
  const scale = normalizeLetterPageTextScale(value);
  return `${(baseCqw * scale).toFixed(3)}cqw`;
}
