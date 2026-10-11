"use client";

import { Check, RefreshCw, Settings, X } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFocusSession, useFocusView } from "../providers/focus-session-provider";
import { useUpdateFocusSettingsMutation } from "../queries/focus-query";
import type { AmbientSound } from "../type";
import { AddFocusTaskDialog } from "./add-focus-task-dialog";
import { FocusCompletionDialog } from "./focus-completion-dialog";
import { FocusJournalLink } from "./focus-journal-link";
import { FocusQuietView } from "./focus-quiet-view";
import { FocusSettingsDialog } from "./focus-settings-dialog";
import { FocusTaskPanel } from "./focus-task-panel";
import { FocusTimerCard } from "./focus-timer-card";

type FocusDialogState = "open" | "closing" | null;

export function FocusPage() {
  const flow = useFocusSession();
  const { quiet, enterQuiet, exitQuiet } = useFocusView();
  const { dashboard, data, activeSession, timerSession } = flow;
  const updateSettings = useUpdateFocusSettingsMutation();
  const [settingsDialog, setSettingsDialog] = useState<FocusDialogState>(null);
  const [addDialog, setAddDialog] = useState<FocusDialogState>(null);
  const [resetSessionUuid, setResetSessionUuid] = useState<string | null>(null);
  const resetOpen = Boolean(resetSessionUuid && activeSession?.uuid === resetSessionUuid);
  const [requestedSound, setRequestedSound] = useState<AmbientSound>("off");

  if (dashboard.isLoading && !data) return (
    <div className="grid w-full min-w-0 gap-5" role="status" aria-label="Loading Focus">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col items-center gap-6 rounded-xl p-6 ring-1 ring-foreground/10">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-11 w-full max-w-md rounded-lg" />
          <Skeleton className="aspect-square w-full max-w-[min(15rem,42dvh)] rounded-full sm:max-w-[min(18rem,42dvh)]" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl p-5 ring-1 ring-foreground/10">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
  if (!data) return (
    <Card className="w-full min-w-0">
      <CardHeader className="justify-items-center">
        <CardTitle>Focus could not be loaded</CardTitle>
        <CardDescription>Check your connection and try again.</CardDescription>
      </CardHeader>
      <CardContent className="items-center">
        <Button variant="outline" size="sm" onClick={() => dashboard.refetch()}><RefreshCw data-icon="inline-start" />Try again</Button>
      </CardContent>
    </Card>
  );

  const changeAmbient = (sound: AmbientSound) => {
    setRequestedSound(sound);
    updateSettings.mutate({ ...data.settings, ambient_sound: sound });
  };

  const timerProps = {
    session: timerSession,
    phase: flow.idlePhase,
    selectedTask: flow.selectedTask,
    settings: data.settings,
    stats: data.today,
    suggestedNext: data.suggested_next_type,
    pending: flow.pending || Boolean(flow.completionFailure),
    soundPending: updateSettings.isPending,
    onStart: flow.startCurrent,
    onPause: () => flow.runAction("pause"),
    onResume: () => flow.runAction("resume"),
    onReset: () => setResetSessionUuid(activeSession?.uuid ?? null),
    onAmbientChange: changeAmbient,
    onAddTask: () => setAddDialog("open"),
  };

  const alerts = (
    <>
      {dashboard.isError && (
        <Alert>
          <AlertTitle>Focus could not be refreshed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Your current timer is still shown. Check your connection and try again.</span>
            <Button variant="outline" size="sm" onClick={() => dashboard.refetch()} disabled={dashboard.isFetching}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      {flow.completionFailure && (
        <Alert variant="destructive">
          <AlertTitle>Session completion could not be confirmed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {flow.completionFailure.message}
            <Button variant="outline" size="sm" onClick={flow.retryCompletion} disabled={flow.pending}>Retry completion</Button>
          </AlertDescription>
        </Alert>
      )}
      {flow.requestError && !(flow.requestError.action === "cancel" && resetOpen) && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {flow.requestError.message}
            <Button variant="outline" size="sm" onClick={flow.retryAction} disabled={flow.pending}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      {updateSettings.isError && (
        <Alert variant="destructive">
          <AlertTitle>Sound could not be changed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {updateSettings.error.message}
            <Button variant="outline" size="sm" onClick={() => changeAmbient(requestedSound)} disabled={updateSettings.isPending}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      {flow.savedReflectionUuid && !flow.completion && (
        <Alert role="status">
          <Check />
          <AlertTitle>Saved to Journal</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <FocusJournalLink sessionUuid={flow.savedReflectionUuid} />
            <Button variant="ghost" size="icon-sm" aria-label="Dismiss saved reflection" onClick={flow.dismissSavedReflection}><X /></Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );

  return (
    <div className={quiet ? "flex min-h-full w-full min-w-0 flex-col" : "grid w-full min-w-0 gap-5"}>
      {quiet ? (
        <FocusQuietView
          {...timerProps}
          onExitQuiet={exitQuiet}
        >
          {alerts}
        </FocusQuietView>
      ) : (
        <>
          <PageHeader
            title="Focus Timer"
            description="One task. One focused session."
            action={<Button variant="outline" onClick={() => setSettingsDialog("open")} disabled={updateSettings.isPending}><Settings data-icon="inline-start" />Settings</Button>}
          />
          {alerts}
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
            <FocusTimerCard
              {...timerProps}
              onPhaseChange={flow.setPhase}
              onEnterQuiet={enterQuiet}
            />
            <FocusTaskPanel
              tasks={data.tasks}
              selectedUuid={flow.effectiveSelectedUuid}
              activeTaskUuid={timerSession?.task?.uuid}
              sessionActive={timerSession?.type === "focus"}
              onSelect={(task) => flow.setSelectedUuid(task.uuid)}
              onAdd={() => setAddDialog("open")}
            />
          </div>
        </>
      )}
      {addDialog && (
        <AddFocusTaskDialog
          open={addDialog === "open"}
          onOpenChange={(open) => setAddDialog(open ? "open" : "closing")}
          onClosed={() => setAddDialog((current) => current === "closing" ? null : current)}
          onCreated={(task) => activeSession?.type !== "focus" && flow.setSelectedUuid(task.uuid)}
        />
      )}
      {settingsDialog && (
        <FocusSettingsDialog
          open={settingsDialog === "open"}
          onOpenChange={(open) => setSettingsDialog(open ? "open" : "closing")}
          onClosed={() => setSettingsDialog((current) => current === "closing" ? null : current)}
          settings={data.settings}
        />
      )}
      {flow.completion && !settingsDialog && !addDialog && !resetOpen && (
        <FocusCompletionDialog
          key={flow.completion.session.uuid}
          completion={flow.completion}
          settings={data.settings}
          stats={data.today}
          suggestedNext={data.suggested_next_type}
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
            <AlertDialogCancel disabled={flow.pending}>Keep session</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={flow.pending} onClick={async () => {
              if (await flow.runAction("cancel")) setResetSessionUuid(null);
            }}>{flow.pending ? "Resetting…" : "Reset session"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
