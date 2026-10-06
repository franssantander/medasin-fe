"use client";

import { Check, RefreshCw, Settings, X } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmbientNoise } from "../hooks/use-ambient-noise";
import { useFocusSessionFlow } from "../hooks/use-focus-session-flow";
import { useUpdateFocusSettingsMutation } from "../queries/focus-query";
import type { AmbientSound } from "../type";
import { AddFocusTaskDialog } from "./add-focus-task-dialog";
import { FocusCompletionDialog } from "./focus-completion-dialog";
import { FocusJournalLink } from "./focus-journal-link";
import { FocusSettingsDialog } from "./focus-settings-dialog";
import { FocusTaskPanel } from "./focus-task-panel";
import { FocusTimerCard } from "./focus-timer-card";

export function FocusPage() {
  const flow = useFocusSessionFlow();
  const { dashboard, data, activeSession } = flow;
  const updateSettings = useUpdateFocusSettingsMutation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [resetSessionUuid, setResetSessionUuid] = useState<string | null>(null);
  const resetOpen = Boolean(resetSessionUuid && activeSession?.uuid === resetSessionUuid);
  const [requestedSound, setRequestedSound] = useState<AmbientSound>("off");
  useAmbientNoise(data?.settings.ambient_sound ?? "off", activeSession?.status === "running");

  if (dashboard.isLoading && !data) return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <Skeleton className="h-12 w-64" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[38rem] rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
  if (!data) return (
    <Card>
      <CardHeader className="justify-items-center">
        <CardTitle>Focus could not be loaded</CardTitle>
        <CardDescription>Check your connection and try again.</CardDescription>
      </CardHeader>
      <CardContent className="items-center">
        <Button variant="outline" className="min-h-11" onClick={() => dashboard.refetch()}><RefreshCw data-icon="inline-start" />Try again</Button>
      </CardContent>
    </Card>
  );

  const changeAmbient = (sound: AmbientSound) => {
    setRequestedSound(sound);
    updateSettings.mutate({ ...data.settings, ambient_sound: sound });
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <PageHeader
        title="Focus Timer"
        description="One task. One focused session."
        action={<Button variant="outline" className="min-h-11" onClick={() => setSettingsOpen(true)} disabled={updateSettings.isPending}><Settings data-icon="inline-start" />Settings</Button>}
      />
      {dashboard.isError && (
        <Alert>
          <AlertTitle>Focus could not be refreshed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Your current timer is still shown. Check your connection and try again.</span>
            <Button variant="outline" className="min-h-11" onClick={() => dashboard.refetch()} disabled={dashboard.isFetching}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      {flow.completionFailure && (
        <Alert variant="destructive">
          <AlertTitle>Session completion could not be confirmed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {flow.completionFailure.message}
            <Button variant="outline" className="min-h-11" onClick={flow.retryCompletion} disabled={flow.pending}>Retry completion</Button>
          </AlertDescription>
        </Alert>
      )}
      {flow.requestError && !(flow.requestError.action === "cancel" && resetOpen) && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {flow.requestError.message}
            <Button variant="outline" className="min-h-11" onClick={flow.retryAction} disabled={flow.pending}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      {updateSettings.isError && (
        <Alert variant="destructive">
          <AlertTitle>Sound could not be changed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {updateSettings.error.message}
            <Button variant="outline" className="min-h-11" onClick={() => changeAmbient(requestedSound)} disabled={updateSettings.isPending}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      {flow.savedReflectionUuid && !flow.completion && (
        <Alert role="status">
          <Check />
          <AlertTitle>Saved to Journal</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <FocusJournalLink sessionUuid={flow.savedReflectionUuid} />
            <Button variant="ghost" size="icon" className="size-11" aria-label="Dismiss saved reflection" onClick={flow.dismissSavedReflection}><X /></Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <FocusTimerCard
          session={activeSession}
          phase={flow.idlePhase}
          selectedTask={flow.selectedTask}
          settings={data.settings}
          stats={data.today}
          pending={flow.pending || Boolean(flow.completionFailure)}
          soundPending={updateSettings.isPending}
          onPhaseChange={flow.setPhase}
          onStart={flow.startCurrent}
          onPause={() => flow.runAction("pause")}
          onResume={() => flow.runAction("resume")}
          onReset={() => setResetSessionUuid(activeSession?.uuid ?? null)}
          onAmbientChange={changeAmbient}
          onAddTask={() => setAddOpen(true)}
          onElapsed={flow.handleElapsed}
        />
        <FocusTaskPanel
          tasks={data.tasks}
          selectedUuid={flow.effectiveSelectedUuid}
          activeTaskUuid={activeSession?.task?.uuid}
          sessionActive={activeSession?.type === "focus"}
          onSelect={(task) => flow.setSelectedUuid(task.uuid)}
          onAdd={() => setAddOpen(true)}
        />
      </div>
      {addOpen && <AddFocusTaskDialog onOpenChange={setAddOpen} onCreated={(task) => activeSession?.type !== "focus" && flow.setSelectedUuid(task.uuid)} />}
      {settingsOpen && <FocusSettingsDialog open onOpenChange={setSettingsOpen} settings={data.settings} />}
      {flow.completion && !settingsOpen && !addOpen && !resetOpen && (
        <FocusCompletionDialog
          key={flow.completion.session.uuid}
          completion={flow.completion}
          settings={data.settings}
          stats={data.today}
          hasActiveTask={data.tasks.length > 0}
          onResolve={flow.resolveReflection}
          onContinue={flow.continueSession}
          onFinish={flow.finish}
          onDraftChange={flow.clearCompletionError}
          pending={flow.pending}
        />
      )}
      <AlertDialog open={resetOpen} onOpenChange={(open) => !flow.pending && !open && setResetSessionUuid(null)}>
        <AlertDialogContent finalFocus={() => document.getElementById("focus-primary-action")}>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this session?</AlertDialogTitle>
            <AlertDialogDescription>The timer will return to its full duration. This session will not count as completed.</AlertDialogDescription>
          </AlertDialogHeader>
          {flow.requestError?.action === "cancel" && <Alert variant="destructive"><AlertDescription>{flow.requestError.message}</AlertDescription></Alert>}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={flow.pending}>Keep session</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" variant="destructive" disabled={flow.pending} onClick={async () => {
              if (await flow.runAction("cancel")) setResetSessionUuid(null);
            }}>{flow.pending ? "Resetting…" : "Reset session"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
