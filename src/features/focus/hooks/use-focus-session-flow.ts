"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseApiError } from "@/lib/axios/errors";
import { getActiveTaskUuid, getNextType } from "../lib/focus-utils";
import {
  focusKeys,
  useFocusDashboardQuery,
  useFocusSessionActionMutation,
  useSaveFocusReflectionMutation,
  useStartFocusSessionMutation,
} from "../queries/focus-query";
import type { FocusApiResponse, FocusDashboard, FocusMood, FocusSession, FocusSessionType } from "../type";

export type FocusCompletion = {
  session: FocusSession;
  nextType: FocusSessionType;
  reflectionEnabled: boolean;
  askBeforeNext: boolean;
  reflectionResolved: boolean;
  reflectionSaved: boolean;
  error: string | null;
};

export type ReflectionAction = "save" | "skip" | "finish";
type SessionAction = "pause" | "resume" | "cancel";

export function useFocusSessionFlow({ pollWhenIdle = true, onCompleted }: {
  pollWhenIdle?: boolean;
  onCompleted?: (session: FocusSession) => void;
} = {}) {
  const queryClient = useQueryClient();
  const dashboard = useFocusDashboardQuery(pollWhenIdle);
  const action = useFocusSessionActionMutation();
  const start = useStartFocusSessionMutation();
  const reflect = useSaveFocusReflectionMutation();
  const { mutateAsync: act } = action;
  const { mutateAsync: startSession } = start;
  const { mutateAsync: saveReflection } = reflect;
  const [selectedUuid, setSelectedUuid] = useState<string>();
  const [phase, setPhase] = useState<FocusSessionType | null>(null);
  const [completion, setCompletion] = useState<FocusCompletion | null>(null);
  const [completingSession, setCompletingSession] = useState<FocusSession | null>(null);
  const [completionFailure, setCompletionFailure] = useState<{ session: FocusSession; message: string } | null>(null);
  const [savedReflectionUuid, setSavedReflectionUuid] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ message: string; action: SessionAction | "start" } | null>(null);
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);
  const interactionRef = useRef(false);
  const completionAttemptRef = useRef<string | null>(null);
  const completionInFlightRef = useRef(false);
  const cancellingRef = useRef<string | null>(null);
  const observedRef = useRef<{ session: FocusSession; offset: number } | null>(null);
  const elapsedRef = useRef<(session: FocusSession) => Promise<void>>(async () => undefined);
  const onCompletedRef = useRef(onCompleted);
  const data = dashboard.data?.data;
  const activeSession = data?.active_session ?? null;
  const effectiveSelectedUuid = activeSession?.task?.uuid ?? getActiveTaskUuid(data?.tasks ?? [], selectedUuid);
  const selectedTask = data?.tasks.find((task) => task.uuid === effectiveSelectedUuid);
  const idlePhase = phase ?? data?.suggested_next_type ?? "focus";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const readDashboard = useCallback(() =>
    queryClient.getQueryData<FocusApiResponse<FocusDashboard>>(focusKeys.dashboard(timezone))?.data,
  [queryClient, timezone]);

  const startNext = useCallback(async (current: FocusCompletion) => {
    if (!mountedRef.current) return;
    const latest = readDashboard();
    const taskUuid = getActiveTaskUuid(latest?.tasks ?? [], current.session.task?.uuid ?? selectedUuid);
    if (current.nextType === "focus" && !taskUuid) {
      setCompletion({ ...current, error: "Add an active task before starting another focus session." });
      return;
    }
    try {
      await startSession({ type: current.nextType, taskUuid: current.nextType === "focus" ? taskUuid : undefined });
      setPhase(current.nextType);
      setCompletion(null);
    } catch (error) {
      setCompletion({ ...current, error: parseApiError(error).message });
    }
  }, [readDashboard, selectedUuid, startSession]);

  const handleElapsed = useCallback(async (session: FocusSession, retry = false) => {
    if (completionInFlightRef.current) return;
    if (!retry && completionAttemptRef.current === session.uuid) return;
    completionInFlightRef.current = true;
    completionAttemptRef.current = session.uuid;
    setBusy(true);
    setCompletingSession(session);
    setCompletionFailure(null);
    setRequestError(null);
    setSavedReflectionUuid(null);
    try {
      const response = await act({ uuid: session.uuid, action: "complete" });
      if (!mountedRef.current) return;
      const latest = readDashboard();
      const nextType = getNextType(session.type, latest?.suggested_next_type ?? "short_break");
      const reflectionEnabled = session.type === "focus" && Boolean(latest?.settings.ask_for_reflection);
      const current: FocusCompletion = {
        session: response.data,
        nextType,
        reflectionEnabled,
        askBeforeNext: latest?.settings.ask_before_next_session ?? true,
        reflectionResolved: !reflectionEnabled,
        reflectionSaved: false,
        error: null,
      };
      if (session.type === "focus") setSelectedUuid(session.task?.uuid);
      setPhase(nextType);
      setCompletion(current);
      onCompletedRef.current?.(response.data);
      if (!current.askBeforeNext && current.reflectionResolved) await startNext(current);
    } catch (error) {
      setCompletionFailure({ session, message: parseApiError(error).message });
    } finally {
      completionInFlightRef.current = false;
      setCompletingSession(null);
      setBusy(false);
    }
  }, [act, readDashboard, startNext]);

  useEffect(() => { elapsedRef.current = handleElapsed; }, [handleElapsed]);
  useEffect(() => { onCompletedRef.current = onCompleted; }, [onCompleted]);

  // A dashboard refresh can reconcile an expired session before the timer's next tick.
  useEffect(() => {
    if (activeSession) {
      observedRef.current = {
        session: activeSession,
        offset: new Date(activeSession.server_now).getTime() - Date.now(),
      };
      return;
    }
    const observed = observedRef.current;
    observedRef.current = null;
    if (
      observed?.session.status === "running" && observed.session.ends_at &&
      observed.session.uuid !== cancellingRef.current &&
      new Date(observed.session.ends_at).getTime() <= Date.now() + observed.offset
    ) void elapsedRef.current(observed.session);
  }, [activeSession]);

  const refetch = dashboard.refetch;
  useEffect(() => {
    if (pollWhenIdle) void refetch({ cancelRefetch: false });
  }, [pollWhenIdle, refetch]);
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) void refetch({ cancelRefetch: false });
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refetch]);

  const startCurrent = async () => {
    if (interactionRef.current || activeSession || !data) return;
    const taskUuid = getActiveTaskUuid(data.tasks, selectedUuid);
    if (idlePhase === "focus" && !taskUuid) return;
    interactionRef.current = true;
    setBusy(true);
    setRequestError(null);
    try {
      await startSession({ type: idlePhase, taskUuid: idlePhase === "focus" ? taskUuid : undefined });
      setCompletionFailure(null);
    } catch (error) {
      setRequestError({ message: parseApiError(error).message, action: "start" });
    } finally {
      interactionRef.current = false;
      setBusy(false);
    }
  };

  const runAction = async (nextAction: SessionAction) => {
    if (!activeSession || interactionRef.current) return false;
    interactionRef.current = true;
    if (nextAction === "cancel") cancellingRef.current = activeSession.uuid;
    setBusy(true);
    setRequestError(null);
    try {
      await act({ uuid: activeSession.uuid, action: nextAction });
      setCompletionFailure(null);
      if (nextAction === "cancel") setPhase(activeSession.type);
      return true;
    } catch (error) {
      cancellingRef.current = null;
      setRequestError({ message: parseApiError(error).message, action: nextAction });
      return false;
    } finally {
      interactionRef.current = false;
      setBusy(false);
    }
  };

  const resolveReflection = async (intent: ReflectionAction, mood: FocusMood | null, note: string | null) => {
    if (!completion || interactionRef.current) return;
    interactionRef.current = true;
    setBusy(true);
    let current = { ...completion, error: null };
    setCompletion(current);
    try {
      if (intent !== "skip" && !current.reflectionSaved && (mood || note)) {
        const response = await saveReflection({ uuid: current.session.uuid, mood, note });
        if (!mountedRef.current) return;
        current = { ...current, session: response.data, reflectionSaved: true };
        setSavedReflectionUuid(current.session.uuid);
      }
      current = { ...current, reflectionResolved: true };
      setCompletion(current);
      if (intent === "finish") setCompletion(null);
      else if (!current.askBeforeNext) await startNext(current);
    } catch (error) {
      setCompletion({ ...current, error: parseApiError(error).message });
    } finally {
      interactionRef.current = false;
      setBusy(false);
    }
  };

  const continueSession = async () => {
    if (!completion || interactionRef.current) return;
    interactionRef.current = true;
    setBusy(true);
    try {
      await startNext({ ...completion, error: null });
    } finally {
      interactionRef.current = false;
      setBusy(false);
    }
  };

  return {
    dashboard, data, activeSession, selectedTask, effectiveSelectedUuid, idlePhase,
    timerSession: activeSession ?? completingSession ?? completionFailure?.session ?? null,
    completion, completionFailure, requestError, savedReflectionUuid,
    pending: busy || action.isPending || start.isPending || reflect.isPending,
    setSelectedUuid, setPhase, startCurrent, runAction, handleElapsed, resolveReflection, continueSession,
    finish: () => { if (!interactionRef.current) setCompletion(null); },
    clearCompletionError: () => setCompletion((current) => current && { ...current, error: null }),
    retryCompletion: () => completionFailure && handleElapsed(completionFailure.session, true),
    retryAction: () => requestError?.action === "start" ? startCurrent() : requestError && runAction(requestError.action),
    dismissSavedReflection: () => setSavedReflectionUuid(null),
  };
}
