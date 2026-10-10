"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUpdateResource } from "../queries/resource-query";
import { resourceRequestErrors, validateResourceMetadata, type ResourceFormErrors } from "../resource-form-utils";
import type { ResourceUpdateInput } from "../type";

export function useResourceAutosave(input: ResourceUpdateInput, enabled: boolean) {
  const signature = JSON.stringify(input);
  const [savedSignature, setSavedSignature] = useState(signature);
  const [hasSavedChanges, setHasSavedChanges] = useState(false);
  const [state, setState] = useState<"saved" | "saving" | "error">("saved");
  const [failure, setFailure] = useState<{ signature: string; errors: ResourceFormErrors } | null>(null);
  const latest = useRef({ input, signature, enabled });
  const saved = useRef(signature);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const debounceTimer = useRef<number | null>(null);
  const { mutateAsync } = useUpdateResource();

  const save = useCallback((): Promise<boolean> => {
    // A manual flush consumes the pending debounce, including when it fails.
    // It must not retry in the background while dismissal is being confirmed.
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (inFlight.current) return inFlight.current;

    async function flush() {
      // Only one request runs at a time. Each response acknowledges its own
      // snapshot; newer field values are never replaced by server responses.
      while (latest.current.enabled && latest.current.signature !== saved.current) {
        const snapshot = latest.current;
        const invalid = validateResourceMetadata(snapshot.input);
        if (Object.keys(invalid).length) {
          setFailure({ signature: snapshot.signature, errors: invalid });
          setState("error");
          return false;
        }
        setFailure(null);
        setState("saving");
        try {
          await mutateAsync(snapshot.input);
          saved.current = snapshot.signature;
          setSavedSignature(snapshot.signature);
          setHasSavedChanges(true);
        } catch (error) {
          if (snapshot.signature !== latest.current.signature) continue;
          setFailure({ signature: snapshot.signature, errors: resourceRequestErrors(error) });
          setState("error");
          return false;
        }
      }
      setState("saved");
      return true;
    }

    const pending = flush().finally(() => { inFlight.current = null; });
    inFlight.current = pending;
    return pending;
  }, [mutateAsync]);

  useLayoutEffect(() => {
    latest.current = { input, signature, enabled };
  }, [enabled, input, signature]);

  useEffect(() => {
    if (!enabled || signature === saved.current) return;
    const timer = window.setTimeout(() => {
      debounceTimer.current = null;
      void save();
    }, 700);
    debounceTimer.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (debounceTimer.current === timer) debounceTimer.current = null;
    };
  }, [enabled, input, save, signature]);

  return {
    errors: failure?.signature === signature ? failure.errors : {},
    save,
    dirty: signature !== savedSignature,
    hasSavedChanges,
    saving: state === "saving",
    failed: state === "error" && failure?.signature === signature && signature !== savedSignature,
    status: state === "saving" ? "Saving…"
      : signature === savedSignature ? "Saved"
        : state === "error" && failure?.signature === signature ? "Save failed" : "Unsaved changes",
  };
}
