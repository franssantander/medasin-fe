import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/** The cover image never gets shorter than this share of its natural height. */
export const LETTER_COVER_HERO_MIN_SHARE = 0.5;
/** The smallest the cover text may get, as a share of its chosen size. */
export const LETTER_COVER_TEXT_FIT_MIN = 0.7;
const LETTER_COVER_TEXT_FIT_STEP = 0.025;

export type LetterCoverFit = {
  /** How much the cover text was scaled down to fit (1 = its chosen size). */
  scale: number;
  /** Still too much for one page with the image and text at their smallest. */
  overflow: boolean;
};

/**
 * Keeps everything on the cover by giving room in a fixed order: first the
 * image shrinks (down to `LETTER_COVER_HERO_MIN_SHARE`), then the cover text
 * (down to `LETTER_COVER_TEXT_FIT_MIN`). The subheader, title and byline keep
 * the sizes the user chose.
 *
 * This runs synchronously before paint and only writes inline styles and a data
 * attribute, so the cover never visibly jumps.
 */
export function fitLetterCover(main: HTMLElement): LetterCoverFit {
  const canvas = main.closest<HTMLElement>("[data-page-canvas]");
  const frame = main.querySelector<HTMLElement>("[data-cover-hero-frame]");
  const ratio = Number(
    main.querySelector<HTMLElement>("[data-cover-hero-image]")?.dataset.aspectRatio,
  );
  const excess = () => main.scrollHeight - main.clientHeight;

  // Measure from the natural layout every time.
  if (canvas) delete canvas.dataset.coverFit;
  main.style.setProperty("--letter-cover-fit", "1");

  // Moving the caption changes which element is the frame, and React keeps
  // heights it did not set, so clear them on both.
  main
    .querySelectorAll<HTMLElement>('[data-cover-section="hero"], [data-cover-hero-image]')
    .forEach((element) => element.style.removeProperty("height"));

  let heroShrunk = false;
  if (frame) {
    // The cap is a share of the page height; container units do not resolve to
    // pixels in computed styles.
    const cap = Number(frame.dataset.maxHeight) * (canvas?.clientHeight ?? 0);
    const natural = Math.min(
      ratio > 0 ? frame.clientWidth / ratio : frame.clientHeight,
      cap > 0 ? cap : Infinity,
    );
    frame.style.height = `${natural}px`;
    const over = excess();
    if (over > 1) {
      frame.style.height = `${Math.max(natural * LETTER_COVER_HERO_MIN_SHARE, natural - over)}px`;
      heroShrunk = true;
    }
  }

  let scale = 1;
  if (excess() > 1) {
    const steps = Math.round(
      (1 - LETTER_COVER_TEXT_FIT_MIN) / LETTER_COVER_TEXT_FIT_STEP,
    );
    const apply = (step: number) => {
      scale = Number((1 - step * LETTER_COVER_TEXT_FIT_STEP).toFixed(3));
      main.style.setProperty("--letter-cover-fit", String(scale));
    };
    let low = 1;
    let high = steps;
    let best = steps;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      apply(middle);
      if (excess() <= 1) {
        best = middle;
        high = middle - 1;
      } else {
        low = middle + 1;
      }
    }
    apply(best);
  }

  const overflow = excess() > 1;
  if (canvas) {
    canvas.dataset.coverFit = overflow
      ? "overflow"
      : heroShrunk || scale < 1
        ? "fitted"
        : "natural";
  }
  return { scale, overflow };
}

/** Re-fits the cover after every render, text change and font load. */
export function useLetterCoverFit(
  mainRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onChange?: (fit: LetterCoverFit) => void,
) {
  const lastRef = useRef<LetterCoverFit | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const run = useCallback(() => {
    const main = mainRef.current;
    if (!main) return;
    const fit = fitLetterCover(main);
    const last = lastRef.current;
    if (last?.scale === fit.scale && last.overflow === fit.overflow) return;
    lastRef.current = fit;
    onChangeRef.current?.(fit);
  }, [mainRef]);

  useLayoutEffect(() => {
    if (enabled) run();
  });

  useEffect(() => {
    const main = mainRef.current;
    if (!enabled || !main) return;
    // Typing and the editor applying its content change the DOM without a
    // React render. Only styles are written here, which are not observed.
    const observer = new MutationObserver(run);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) run();
    });
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [enabled, mainRef, run]);
}
