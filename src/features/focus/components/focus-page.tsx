"use client";

import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmbientNoise } from "../hooks/use-ambient-noise";
import { useFocusTimer } from "../hooks/use-focus-timer";
import {
  useFocusDashboardQuery,
  useFocusSessionActionMutation,
  useFocusTasksQuery,
  useSaveFocusReflectionMutation,
  useStartFocusSessionMutation,
  useUpdateFocusSettingsMutation,
} from "../queries/focus-query";
import type {
  AmbientSound,
  FocusMood,
  FocusSession,
  FocusSessionType,
  FocusTask,
} from "../type";
import { FocusCompletionDialog } from "./focus-completion-dialog";
import { FocusSettingsDialog } from "./focus-settings-dialog";
import { FocusTaskPanel } from "./focus-task-panel";
import { FocusTimerCard } from "./focus-timer-card";

export function FocusPage() {
  const dashboard = useFocusDashboardQuery();
  const completedTasks = useFocusTasksQuery("completed");
  const action = useFocusSessionActionMutation();
  const start = useStartFocusSessionMutation();
  const reflect = useSaveFocusReflectionMutation();
  const updateSettings = useUpdateFocusSettingsMutation();
  const [selectedUuid, setSelectedUuid] = useState<string>();
  const [phase, setPhase] = useState<FocusSessionType>("focus");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completion, setCompletion] = useState<{
    session: FocusSession;
    nextType: FocusSessionType;
  } | null>(null);
  const continuingRef = useRef(false);
  const data = dashboard.data?.data;
  const activeSession = data?.active_session ?? null;
  const refetchDashboard = dashboard.refetch;

  useEffect(() => {
    const refresh = () => void refetchDashboard();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refetchDashboard]);

  const handleElapsed = async (session: FocusSession) => {
    try {
      const response = await action.mutateAsync({
        uuid: session.uuid,
        action: "complete",
      });
      const refreshed = await dashboard.refetch();
      const suggestedNextType =
        refreshed.data?.data.suggested_next_type ?? "focus";
      const nextType = getNextType(session.type, suggestedNextType);
      const settings = refreshed.data?.data.settings ?? data?.settings;
      if (
        !settings ||
        settings.ask_before_next_session ||
        (session.type === "focus" && settings.ask_for_reflection)
      ) {
        setCompletion({ session: response.data, nextType });
      } else {
        setPhase(nextType);
        const nextTaskUuid =
          session.task?.uuid ??
          selectedUuid ??
          refreshed.data?.data.tasks[0]?.uuid;
        await start.mutateAsync({
          type: nextType,
          taskUuid: nextType === "focus" ? nextTaskUuid : undefined,
        });
      }
    } catch {
      await dashboard.refetch();
    }
  };
  const timer = useFocusTimer(activeSession, handleElapsed);
  useAmbientNoise(
    data?.settings.ambient_sound ?? "off",
    activeSession?.status === "running",
  );

  if (dashboard.isLoading)
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-44" />
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Skeleton className="h-[34rem] rounded-xl" />
          <Skeleton className="h-[34rem] rounded-xl" />
        </div>
      </div>
    );
  if (dashboard.isError || !data)
    return (
      <Card className="items-center py-16 text-center">
        <CardTitle>Focus could not be loaded</CardTitle>
        <CardDescription>Check your connection and try again.</CardDescription>
        <Button variant="outline" onClick={() => dashboard.refetch()}>
          Try again
        </Button>
      </Card>
    );

  const effectiveSelectedUuid =
    activeSession?.task?.uuid ??
    (data.tasks.some((task) => task.uuid === selectedUuid)
      ? selectedUuid
      : data.tasks[0]?.uuid);
  const selectedTask = data.tasks.find(
    (task) => task.uuid === effectiveSelectedUuid,
  );
  const pending = action.isPending || start.isPending || reflect.isPending;
  const startCurrent = () =>
    start.mutate({
      type: phase,
      taskUuid: phase === "focus" ? effectiveSelectedUuid : undefined,
    });
  const runAction = (nextAction: "pause" | "resume" | "cancel") =>
    activeSession &&
    action.mutate({ uuid: activeSession.uuid, action: nextAction });
  const changeAmbient = (sound: AmbientSound) =>
    updateSettings.mutate({ ...data.settings, ambient_sound: sound });
  const continueAfterCompletion = async (
    mood: FocusMood | null,
    note: string | null,
  ) => {
    if (!completion || continuingRef.current) return;
    continuingRef.current = true;
    const { session, nextType: completionNextType } = completion;

    try {
      if (
        session.type === "focus" &&
        data.settings.ask_for_reflection &&
        (mood || note)
      )
        await reflect.mutateAsync({ uuid: session.uuid, mood, note });
      await start.mutateAsync({
        type: completionNextType,
        taskUuid:
          completionNextType === "focus" ? effectiveSelectedUuid : undefined,
      });
      setPhase(completionNextType);
      setCompletion(null);
    } finally {
      continuingRef.current = false;
    }
  };

  return (
    <div className="mx-auto grid w-full gap-4">
      <PageHeader
        title="Focus"
        description="Pick a task, set your rhythm, and go deep."
        action={
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings />
            Settings
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <FocusTaskPanel
          tasks={data.tasks}
          completedTasks={completedTasks.data?.data ?? []}
          completedLoading={completedTasks.isLoading}
          selectedUuid={effectiveSelectedUuid}
          onSelect={(task: FocusTask) => setSelectedUuid(task.uuid)}
        />
        <FocusTimerCard
          session={activeSession}
          phase={phase}
          selectedTask={selectedTask}
          settings={data.settings}
          remaining={timer.remaining}
          progress={timer.progress}
          todayCount={data.today.completed_focus_sessions}
          pending={pending}
          onPhaseChange={setPhase}
          onStart={startCurrent}
          onPause={() => runAction("pause")}
          onResume={() => runAction("resume")}
          onReset={() => runAction("cancel")}
          onAmbientChange={changeAmbient}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>
      {settingsOpen && (
        <FocusSettingsDialog
          open
          onOpenChange={setSettingsOpen}
          settings={data.settings}
        />
      )}
      {completion && (
        <FocusCompletionDialog
          key={completion.session.uuid}
          session={completion.session}
          reflectionEnabled={data.settings.ask_for_reflection}
          nextType={completion.nextType}
          stats={data.today}
          onSkip={() => setCompletion(null)}
          onContinue={continueAfterCompletion}
          pending={pending}
        />
      )}
    </div>
  );
}

function getNextType(
  completedType: FocusSessionType,
  suggestedNextType: FocusSessionType,
): FocusSessionType {
  if (completedType !== "focus") return "focus";

  return suggestedNextType === "long_break" ? "long_break" : "short_break";
}
