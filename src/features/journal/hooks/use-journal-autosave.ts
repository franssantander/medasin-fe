"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { journalService } from "../services/journal-service";
import type {
  JournalEntry,
  JournalEntryInput,
} from "../type";

export type JournalSaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

type UseJournalAutosaveOptions = {
  initialUuid?: string;
  initialTitle: string;
  initialContent: string;
  initialResourceUuids: string[];
  onCreated: (entry: JournalEntry) => void;
  onSaved: (entry: JournalEntry, created: boolean) => void;
};

export function useJournalAutosave({
  initialUuid,
  initialTitle,
  initialContent,
  initialResourceUuids,
  onCreated,
  onSaved,
}: UseJournalAutosaveOptions) {
  const [title, setTitle] = useState(initialTitle);
  const [resourceUuids, setResourceUuids] = useState(initialResourceUuids);
  const [saveStatus, setSaveStatus] = useState<JournalSaveStatus>("idle");
  const [activeUuid, setActiveUuid] = useState(initialUuid);
  const titleRef = useRef(initialTitle);
  const contentRef = useRef(initialContent);
  const resourceUuidsRef = useRef(initialResourceUuids);
  const activeUuidRef = useRef(initialUuid);
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const flushRef = useRef<() => Promise<void>>(async () => undefined);
  const onCreatedRef = useRef(onCreated);
  const onSavedRef = useRef(onSaved);
  const mountedRef = useRef(true);

  useEffect(() => {
    onCreatedRef.current = onCreated;
    onSavedRef.current = onSaved;
  }, [onCreated, onSaved]);

  const currentInput = useCallback(
    (): JournalEntryInput => ({
      title: titleRef.current.trim() || "Untitled entry",
      content: contentRef.current,
      resource_uuids: resourceUuidsRef.current,
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

  const flush = useCallback((): Promise<void> => {
    if (!dirtyRef.current) return Promise.resolve();

    if (timerRef.current) window.clearTimeout(timerRef.current);
    const revision = revisionRef.current;
    const input = currentInput();

    setSaveStatus("saving");

    const job = saveChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const uuid = activeUuidRef.current;
        const response = uuid
          ? await journalService.update(uuid, input)
          : await journalService.create(input);
        const entry = response.data;
        const created = !uuid;

        if (created) {
          activeUuidRef.current = entry.uuid;
          setActiveUuid(entry.uuid);
        }

        if (revisionRef.current === revision) {
          dirtyRef.current = false;
          setSaveStatus("saved");
        }

        if (created && mountedRef.current) onCreatedRef.current(entry);
        onSavedRef.current(entry, created);
      });

    saveChainRef.current = job.catch(() => undefined);

    return job.catch((error) => {
      setSaveStatus("error");
      throw error;
    });
  }, [currentInput]);

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
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateResourceUuids = useCallback(
    (values: string[]) => {
      resourceUuidsRef.current = values;
      setResourceUuids(values);
      scheduleSave();
    },
    [scheduleSave],
  );

  return {
    activeUuid,
    flush,
    resourceUuids,
    saveStatus,
    title,
    updateContent,
    updateResourceUuids,
    updateTitle,
  };
}
