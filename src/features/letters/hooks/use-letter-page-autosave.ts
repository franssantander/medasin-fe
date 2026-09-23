"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUpdateLetterExportMutation } from "../queries/letter-query";
import {
  normalizeLetterPageTextScale,
  normalizeLetterPageTextScaleMode,
} from "../letter-page-text-scale";
import type {
  Letter,
  LetterExport,
  LetterExportPageInput,
  LetterPage,
} from "../type";
import type { LetterPageFlowResult } from "../letter-page-flow";
import { normalizeLetterPageCover } from "../letter-cover";

export type LetterPageSaveStatus = "idle" | "dirty" | "arranging" | "saving" | "saved" | "error";

export function useLetterPageAutosave({
  letterExport,
  letterUuid,
  onSaved,
  preparePages,
  onLayout,
  isComposing,
}: {
  letterExport: LetterExport;
  letterUuid: string;
  onSaved: (letter: Letter) => void;
  preparePages: (pages: LetterPage[], signal: AbortSignal) => Promise<LetterPageFlowResult>;
  onLayout?: (result: LetterPageFlowResult) => void;
  isComposing?: () => boolean;
}) {
  const mutation = useUpdateLetterExportMutation();
  const [pages, setPages] = useState(() => normalizePages(letterExport));
  const [saveStatus, setSaveStatus] = useState<LetterPageSaveStatus>("idle");
  const pagesRef = useRef(pages);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const saveChainRef = useRef<Promise<void> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const mutationRef = useRef(mutation.mutateAsync);
  const onSavedRef = useRef(onSaved);
  const preparePagesRef = useRef(preparePages);
  const onLayoutRef = useRef(onLayout);
  const isComposingRef = useRef(isComposing);

  useEffect(() => {
    mutationRef.current = mutation.mutateAsync;
    onSavedRef.current = onSaved;
    preparePagesRef.current = preparePages;
    onLayoutRef.current = onLayout;
    isComposingRef.current = isComposing;
  }, [mutation.mutateAsync, onSaved, preparePages, onLayout, isComposing]);

  const flush = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (saveChainRef.current) return saveChainRef.current;
    const job = (async () => {
      while (mountedRef.current && savedRevisionRef.current !== revisionRef.current) {
        const revision = revisionRef.current;
        const controller = new AbortController();
        controllerRef.current = controller;
        try {
          setSaveStatus("arranging");
          const result = await preparePagesRef.current(pagesRef.current, controller.signal);
          if (!mountedRef.current) return;
          if (revision !== revisionRef.current) continue;
          // Composition must complete before replacing the active document.
          while (isComposingRef.current?.()) {
            await new Promise((resolve) => window.setTimeout(resolve, 50));
            controller.signal.throwIfAborted();
          }
          const prepared = renumberPages(result.pages);
          onLayoutRef.current?.(result);
          pagesRef.current = prepared;
          setPages(prepared);
          setSaveStatus("saving");
          const response = await mutationRef.current({
            letterUuid, exportUuid: letterExport.uuid,
            input: { pages: prepared.map(toPageInput) },
          });
          savedRevisionRef.current = revision;
          if (revision === revisionRef.current && mountedRef.current) {
            const normalized = normalizePages(response.data.export);
            pagesRef.current = normalized;
            setPages(normalized);
            setSaveStatus("saved");
            onSavedRef.current(response.data.letter);
          }
        } catch (error) {
          if (controller.signal.aborted) {
            if (!mountedRef.current) return;
            // Wait for the typing pause before measuring the next revision.
            await new Promise((resolve) => window.setTimeout(resolve, 750));
            continue;
          }
          if (mountedRef.current) setSaveStatus("error");
          throw error;
        }
      }
    })().finally(() => { saveChainRef.current = null; });
    saveChainRef.current = job;
    return job;
  }, [letterExport.uuid, letterUuid]);

  const updatePages = useCallback(
    (updater: (current: LetterPage[]) => LetterPage[]) => {
      const next = renumberPages(updater(pagesRef.current));
      pagesRef.current = next;
      revisionRef.current += 1;
      controllerRef.current?.abort();
      setPages(next);
      setSaveStatus("dirty");
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void flush().catch(() => undefined);
      }, 750);
    },
    [flush],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const getPages = useCallback(() => pagesRef.current, []);

  return { flush, getPages, pages, saveStatus, updatePages };
}

function normalizePages(letterExport: LetterExport) {
  const sourcePages = letterExport.pages ?? [];
  const sourceAuthor = [...sourcePages]
    .reverse()
    .find((page) => page.signature)?.signature?.name;

  return renumberPages(
    sourcePages.map((page) =>
      normalizeLetterPageCover(
        {
          ...page,
          uuid: page.uuid || crypto.randomUUID(),
          layout: page.layout || (page.kind === "cover" ? "cover" : "body"),
          text_scale: normalizeLetterPageTextScale(page.text_scale),
          text_scale_mode: normalizeLetterPageTextScaleMode(
            page.text_scale_mode,
            page.text_scale,
          ),
        },
        { author_name: sourceAuthor },
      ),
    ),
  );
}

function renumberPages(pages: LetterPage[]): LetterPage[] {
  const signature = pages.find((page) => page.signature)?.signature ?? null;
  const truncatedPage = pages.find((page) => page.truncated);

  return pages.map((page, index): LetterPage => {
    const kind: LetterPage["kind"] =
      index === 0 ? "cover" : index === pages.length - 1 ? "final" : "body";

    return {
      ...page,
      number: index + 1,
      kind,
      signature: index === pages.length - 1 && index > 0 ? signature : null,
      truncated: index === pages.length - 1 && index > 0 ? Boolean(truncatedPage) : false,
      continuation_label:
        index === pages.length - 1 && index > 0
          ? truncatedPage?.continuation_label ?? null
          : null,
    };
  });
}

function toPageInput(page: LetterPage): LetterExportPageInput {
  const input: LetterExportPageInput = {
    uuid: page.uuid,
    layout: page.layout,
    text_scale: normalizeLetterPageTextScale(page.text_scale),
    text_scale_mode: normalizeLetterPageTextScaleMode(
      page.text_scale_mode,
      page.text_scale,
    ),
    title: page.layout === "cover" ? page.title : null,
    subtitle: page.layout === "cover" ? page.subtitle : null,
    content_source:
      page.content_source ??
      (page.layout === "cover" ? undefined : "letter_body"),
    blocks: page.blocks,
  };

  if (page.layout === "cover") {
    input.cover = page.cover;
  }

  if (page.kind === "final" && page.signature) {
    input.signature = page.signature;
  }

  return input;
}
