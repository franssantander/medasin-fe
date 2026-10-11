"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  letterKeys,
  useCreateLetterExportMutation,
  useLetterExportQuery,
} from "../queries/letter-query";
import type {
  Letter,
  LetterApiResponse,
  LetterExportFormat,
} from "../type";

export type LetterStudioPhase =
  | "loading"
  | "rendering"
  | "ready"
  | "failed"
  | "error";

/**
 * Owns the page-set lifecycle for the studio: renders a new export when none
 * exists, the format changes, or the letter changed since the last render,
 * then follows the export until it is ready.
 */
export function useLetterStudioExport({
  letter,
  initialFormat,
}: {
  letter: Letter;
  initialFormat?: LetterExportFormat;
}) {
  const queryClient = useQueryClient();
  const exportMutation = useCreateLetterExportMutation();
  const latestExport = letter.latest_export;
  const letterUuid = letter.uuid;
  const [format, setFormatState] = useState<LetterExportFormat>(
    initialFormat ?? latestExport?.format ?? "portrait",
  );
  const [activeExportUuid, setActiveExportUuid] = useState<string>();
  const [preparationError, setPreparationError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const invalidatedExportRef = useRef<string | undefined>(undefined);
  const requestedRenderRef = useRef<string | undefined>(undefined);
  const exportUuid = activeExportUuid ?? latestExport?.uuid;
  const exportQuery = useLetterExportQuery(letterUuid, exportUuid);
  const currentExport = activeExportUuid
    ? exportQuery.data?.data
    : exportQuery.data?.data ?? latestExport;
  const pages = currentExport?.pages ?? [];
  const isPreparing =
    preparing ||
    exportMutation.isPending ||
    currentExport?.status === "queued" ||
    currentExport?.status === "processing";
  const isCurrentForLetter =
    currentExport?.uuid === latestExport?.uuid
      ? Boolean(currentExport?.is_current && latestExport?.is_current)
      : Boolean(currentExport?.is_current);

  useEffect(() => {
    if (
      !exportUuid ||
      !currentExport ||
      currentExport.status !== "ready" ||
      invalidatedExportRef.current === exportUuid
    ) {
      return;
    }

    invalidatedExportRef.current = exportUuid;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: letterKeys.detail(letterUuid) }),
      queryClient.invalidateQueries({ queryKey: letterKeys.list() }),
    ]);
  }, [currentExport, exportUuid, letterUuid, queryClient]);

  const createExport = useCallback(
    async (nextFormat: LetterExportFormat) => {
      const cachedLetter =
        queryClient.getQueryData<LetterApiResponse<Letter>>(
          letterKeys.detail(letterUuid),
        )?.data ?? letter;
      const previousCoverPage = cachedLetter.latest_export?.pages?.find(
        (page) => page.layout === "cover",
      );
      const { prepareLetterPages } = await import("../letter-page-flow");
      const preparedPages = await prepareLetterPages(
        cachedLetter,
        nextFormat,
        previousCoverPage,
      );
      const response = await exportMutation.mutateAsync({
        letterUuid,
        format: nextFormat,
        pages: preparedPages,
        silent: true,
      });
      setActiveExportUuid(response.data.uuid);
    },
    [exportMutation, letter, letterUuid, queryClient],
  );

  const renderFormat = useCallback(
    async (nextFormat: LetterExportFormat) => {
      setPreparationError("");
      setPreparing(true);
      try {
        await createExport(nextFormat);
      } catch (error) {
        setPreparationError(
          error instanceof Error
            ? error.message
            : "The pages could not be rendered.",
        );
      } finally {
        setPreparing(false);
      }
    },
    [createExport],
  );

  useEffect(() => {
    if (
      preparationError ||
      isPreparing ||
      (activeExportUuid && exportQuery.isLoading && !currentExport)
    ) {
      return;
    }

    const needsRender =
      !currentExport ||
      currentExport.format !== format ||
      !isCurrentForLetter;
    if (!needsRender) {
      requestedRenderRef.current = undefined;
      return;
    }

    const requestKey = [
      letterUuid,
      format,
      currentExport?.uuid ?? "new",
      currentExport?.updated_at ?? "",
      String(isCurrentForLetter),
    ].join(":");
    if (requestedRenderRef.current === requestKey) return;

    requestedRenderRef.current = requestKey;
    void renderFormat(format);
  }, [
    activeExportUuid,
    currentExport,
    exportQuery.isLoading,
    format,
    isCurrentForLetter,
    isPreparing,
    letterUuid,
    preparationError,
    renderFormat,
  ]);

  const setFormat = useCallback(
    (nextFormat: LetterExportFormat) => {
      requestedRenderRef.current = undefined;
      setPreparationError("");
      setFormatState(nextFormat);
      const url = new URL(window.location.href);
      url.searchParams.set("format", nextFormat);
      window.history.replaceState(null, "", url);
    },
    [],
  );

  const retry = useCallback(() => {
    requestedRenderRef.current = undefined;
    void renderFormat(format);
  }, [format, renderFormat]);

  const readyExport =
    currentExport?.status === "ready" &&
    pages.length > 0 &&
    currentExport.format === format
      ? currentExport
      : undefined;
  const phase: LetterStudioPhase = readyExport
    ? "ready"
    : preparationError
      ? "error"
      : currentExport?.status === "failed" && !isPreparing
        ? "failed"
        : exportQuery.isError && !currentExport
          ? "error"
          : isPreparing || currentExport
            ? "rendering"
            : "loading";

  return {
    format,
    setFormat,
    readyExport,
    isPreparing,
    isStale: Boolean(readyExport && (!isCurrentForLetter || isPreparing)),
    phase,
    error:
      preparationError ||
      (currentExport?.status === "failed"
        ? currentExport.error ||
          "Something went wrong while rendering these pages."
        : exportQuery.isError
          ? "The page status could not be checked. Try again when you are back online."
          : ""),
    retry: () => {
      if (exportQuery.isError && !currentExport) {
        void exportQuery.refetch();
        return;
      }
      retry();
    },
  };
}
