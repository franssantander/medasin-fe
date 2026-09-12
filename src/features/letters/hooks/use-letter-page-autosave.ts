"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUpdateLetterExportMutation } from "../queries/letter-query";
import {
  normalizeLetterPageTextScale,
  normalizeLetterPageTextScaleMode,
} from "../letter-page-text-scale";
import type { LetterExport, LetterExportPageInput, LetterPage } from "../type";

export type LetterPageSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function useLetterPageAutosave({
  letterExport,
  letterUuid,
}: {
  letterExport: LetterExport;
  letterUuid: string;
}) {
  const mutation = useUpdateLetterExportMutation();
  const [pages, setPages] = useState(() => normalizePages(letterExport));
  const [saveStatus, setSaveStatus] = useState<LetterPageSaveStatus>("idle");
  const pagesRef = useRef(pages);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const mutationRef = useRef(mutation.mutateAsync);

  useEffect(() => {
    mutationRef.current = mutation.mutateAsync;
  }, [mutation.mutateAsync]);

  const flush = useCallback(() => {
    if (savedRevisionRef.current === revisionRef.current) {
      return saveChainRef.current;
    }

    if (timerRef.current) window.clearTimeout(timerRef.current);
    const revision = revisionRef.current;
    const inputPages = pagesRef.current.map(toPageInput);
    setSaveStatus("saving");

    const job = saveChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await mutationRef.current({
          letterUuid,
          exportUuid: letterExport.uuid,
          input: { pages: inputPages },
        });

        if (revisionRef.current === revision) {
          const normalized = normalizePages(response.data);
          pagesRef.current = normalized;
          setPages(normalized);
          savedRevisionRef.current = revision;
          setSaveStatus("saved");
        }
      })
      .catch((error) => {
        setSaveStatus("error");
        throw error;
      });

    saveChainRef.current = job.catch(() => undefined);
    return job;
  }, [letterExport.uuid, letterUuid]);

  const updatePages = useCallback(
    (updater: (current: LetterPage[]) => LetterPage[]) => {
      const next = renumberPages(updater(pagesRef.current));
      pagesRef.current = next;
      revisionRef.current += 1;
      setPages(next);
      setSaveStatus("dirty");
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void flush().catch(() => undefined);
      }, 750);
    },
    [flush],
  );

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const getPages = useCallback(() => pagesRef.current, []);

  return { flush, getPages, pages, saveStatus, updatePages };
}

function normalizePages(letterExport: LetterExport) {
  return renumberPages(
    (letterExport.pages ?? []).map((page) => ({
      ...page,
      uuid: page.uuid || crypto.randomUUID(),
      layout: page.layout || (page.kind === "cover" ? "cover" : "body"),
      text_scale: normalizeLetterPageTextScale(page.text_scale),
      text_scale_mode: normalizeLetterPageTextScaleMode(
        page.text_scale_mode,
        page.text_scale,
      ),
    })),
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
  return {
    uuid: page.uuid,
    layout: page.layout,
    text_scale: normalizeLetterPageTextScale(page.text_scale),
    text_scale_mode: normalizeLetterPageTextScaleMode(
      page.text_scale_mode,
      page.text_scale,
    ),
    title: page.layout === "cover" ? page.title : null,
    subtitle: page.layout === "cover" ? page.subtitle : null,
    blocks: page.layout === "cover" ? [] : page.blocks,
  };
}
