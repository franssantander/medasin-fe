"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { letterService } from "../services/letter-service";
import type { Letter, LetterInput } from "../type";

export type LetterSaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

type UseLetterAutosaveOptions = {
  initialUuid?: string;
  initialTitle: string;
  initialContent: string;
  onCreated: (letter: Letter) => void;
  onSaved: (letter: Letter, created: boolean) => void;
};

export function useLetterAutosave({
  initialUuid,
  initialTitle,
  initialContent,
  onCreated,
  onSaved,
}: UseLetterAutosaveOptions) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<LetterSaveStatus>("idle");
  const [activeUuid, setActiveUuid] = useState(initialUuid);
  const titleRef = useRef(initialTitle);
  const contentRef = useRef(initialContent);
  const activeUuidRef = useRef(initialUuid);
  const lastSavedRef = useRef<Letter | undefined>(undefined);
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const flushRef = useRef<(forceCreate?: boolean) => Promise<Letter | undefined>>(
    async () => undefined,
  );
  const onCreatedRef = useRef(onCreated);
  const onSavedRef = useRef(onSaved);
  const mountedRef = useRef(true);

  useEffect(() => {
    onCreatedRef.current = onCreated;
    onSavedRef.current = onSaved;
  }, [onCreated, onSaved]);

  const currentInput = useCallback(
    (): LetterInput => ({
      // The subtitle is the cover text, edited in the Studio; leaving it out
      // keeps whatever the Studio saved.
      title: titleRef.current.trim() || "Untitled letter",
      content: contentRef.current,
    }),
    [],
  );

  const scheduleSave = useCallback(() => {
    revisionRef.current += 1;
    dirtyRef.current = true;
    setSaveStatus("dirty");

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flushRef.current().catch(() => undefined);
    }, 750);
  }, []);

  const flush = useCallback(
    (forceCreate = false): Promise<Letter | undefined> => {
      if (!dirtyRef.current && activeUuidRef.current) {
        return Promise.resolve(lastSavedRef.current);
      }
      if (!dirtyRef.current && !forceCreate) return Promise.resolve(undefined);

      if (timerRef.current) window.clearTimeout(timerRef.current);
      const revision = revisionRef.current;
      const input = currentInput();

      if (mountedRef.current) setSaveStatus("saving");

      const job = saveChainRef.current
        .catch(() => undefined)
        .then(async () => {
          const uuid = activeUuidRef.current;
          const response = uuid
            ? await letterService.update(uuid, input)
            : await letterService.create(input);
          const letter = response.data;
          const created = !uuid;

          lastSavedRef.current = letter;

          if (created) {
            activeUuidRef.current = letter.uuid;
            if (mountedRef.current) setActiveUuid(letter.uuid);
          }

          if (revisionRef.current === revision) {
            dirtyRef.current = false;
            if (mountedRef.current) setSaveStatus("saved");
          }

          if (created && mountedRef.current) onCreatedRef.current(letter);
          onSavedRef.current(letter, created);

          return letter;
        });

      saveChainRef.current = job.then(
        () => undefined,
        () => undefined,
      );

      return job.catch((error) => {
        if (mountedRef.current) setSaveStatus("error");
        throw error;
      });
    },
    [currentInput],
  );

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (dirtyRef.current) void flushRef.current().catch(() => undefined);
    };
  }, []);

  const updateTitle = useCallback(
    (value: string) => {
      titleRef.current = value;
      setTitle(value);
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateContent = useCallback(
    (value: string) => {
      contentRef.current = value;
      setContent(value);
      scheduleSave();
    },
    [scheduleSave],
  );

  const replaceSavedLetter = useCallback((letter: Letter) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    titleRef.current = letter.title;
    contentRef.current = letter.content;
    activeUuidRef.current = letter.uuid;
    lastSavedRef.current = letter;
    dirtyRef.current = false;
    setTitle(letter.title);
    setContent(letter.content);
    setActiveUuid(letter.uuid);
    setSaveStatus("saved");
  }, []);

  return {
    activeUuid,
    content,
    flush,
    saveStatus,
    replaceSavedLetter,
    title,
    updateContent,
    updateTitle,
  };
}
