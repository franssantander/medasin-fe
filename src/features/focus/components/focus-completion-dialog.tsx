"use client";

import { Check, Frown, Loader2, Meh, Moon, Play, Smile, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FocusCompletion, ReflectionAction } from "../hooks/use-focus-session-flow";
import { cn } from "@/lib/utils";
import { phaseLabels, phaseMeta, phaseMinutes } from "../lib/focus-utils";
import type { FocusDashboard, FocusMood, FocusSettings } from "../type";
import { FocusJournalLink } from "./focus-journal-link";
import { FocusRoundDots } from "./focus-round-dots";
import { FocusTodayStats } from "./focus-today-stats";

const moods = [
  { value: "calm", icon: Smile, label: "Calm" },
  { value: "frustrated", icon: Frown, label: "Frustrated" },
  { value: "neutral", icon: Meh, label: "Neutral" },
  { value: "tired", icon: Moon, label: "Tired" },
] as const;

export function FocusCompletionDialog({
  completion, settings, stats, suggestedNext, hasActiveTask, onResolve, onContinue, onFinish, onDraftChange, pending,
}: {
  completion: FocusCompletion;
  settings: FocusSettings;
  stats: FocusDashboard["today"];
  suggestedNext: FocusDashboard["suggested_next_type"];
  hasActiveTask: boolean;
  onResolve: (intent: ReflectionAction, mood: FocusMood | null, note: string | null) => void;
  onContinue: () => void;
  onFinish: () => void;
  onDraftChange: () => void;
  pending: boolean;
}) {
  const [mood, setMood] = useState<FocusMood | null>(completion.session.mood);
  const [note, setNote] = useState(completion.session.reflection_note ?? "");
  const [discardIntent, setDiscardIntent] = useState<"skip" | "finish" | null>(null);
  const { session, nextType } = completion;
  const needsReflection = completion.reflectionEnabled && !completion.reflectionResolved;
  const hasDraft = Boolean(mood || note.trim());
  const nextMinutes = phaseMinutes(settings)[nextType];
  const doneMeta = phaseMeta[session.type];
  const nextMeta = phaseMeta[nextType];
  const canContinue = nextType !== "focus" || hasActiveTask;
  const requestDismiss = (intent: "skip" | "finish") => {
    if (pending) return;
    if (needsReflection && hasDraft) {
      setDiscardIntent(intent);
      return;
    }
    if (needsReflection) onResolve(intent, null, null);
    else onFinish();
  };
  const save = (intent: "save" | "finish") => onResolve(intent, mood, note.trim() || null);

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && requestDismiss("finish")}>
        <DialogContent
          showCloseButton={false}
          finalFocus={() => document.getElementById("focus-primary-action")}
          className="max-h-[min(90dvh,44rem)] max-w-lg gap-0 overflow-hidden p-0 motion-reduce:transition-none"
        >
          <DialogHeader className="shrink-0 border-b px-5 py-5 pr-14 sm:px-6 sm:pr-14">
            <span className={cn("mb-1 grid size-10 place-items-center rounded-full", doneMeta.chip)} aria-hidden="true"><Check className="size-5" /></span>
            <DialogTitle>{session.type === "focus" ? "Focus session complete" : "Break complete"}</DialogTitle>
            <DialogDescription>
              {Math.round(session.duration_seconds / 60)} minutes{session.task ? " on “" + session.task.title + "”" : " to reset and recharge"}.
            </DialogDescription>
          </DialogHeader>
          <Button variant="ghost" size="icon-sm" className="absolute top-4 right-4" aria-label="Close" onClick={() => requestDismiss("finish")} disabled={pending}><X /></Button>
          <div className="workspace-list-scrollbar flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {completion.reflectionSaved && (
              <Alert role="status">
                <Check />
                <AlertTitle>Saved to Journal</AlertTitle>
                <AlertDescription><FocusJournalLink sessionUuid={session.uuid} /></AlertDescription>
              </Alert>
            )}
            {needsReflection ? (
              <FieldGroup className="gap-5">
                <FieldSet className="gap-2">
                  <FieldLegend variant="label" id="focus-mood-label">How did that feel?</FieldLegend>
                  <ToggleGroup
                    aria-labelledby="focus-mood-label"
                    value={mood ? [mood] : []}
                    onValueChange={(values) => { setMood(values[0] as FocusMood ?? null); onDraftChange(); }}
                    disabled={pending}
                    variant="outline"
                    className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
                  >
                    {moods.map((item) => (
                      <ToggleGroupItem key={item.value} value={item.value} className="h-auto flex-col gap-1.5 py-3 aria-pressed:border-foreground/25 aria-pressed:bg-muted">
                        <item.icon aria-hidden="true" />
                        {item.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FieldSet>
                <Field className="gap-2">
                  <FieldLabel htmlFor="focus-reflection-note">Reflection note <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                  <Textarea
                    id="focus-reflection-note"
                    value={note}
                    onChange={(event) => { setNote(event.target.value); onDraftChange(); }}
                    maxLength={1000}
                    placeholder="What went well? What would help next time?"
                    aria-describedby="focus-reflection-help focus-reflection-count"
                    className="min-h-28 resize-none"
                    disabled={pending}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <FieldDescription id="focus-reflection-help">Your mood and note are saved privately to Journal.</FieldDescription>
                    <span id="focus-reflection-count" className="shrink-0 text-xs tabular-nums text-muted-foreground">{note.length}/1,000</span>
                  </div>
                </Field>
                {!completion.askBeforeNext && (
                  <p className="text-sm text-muted-foreground">Saving or skipping starts your {phaseLabels[nextType].toLowerCase()} automatically. Choose Finish to stop here.</p>
                )}
              </FieldGroup>
            ) : (
              <section aria-label="Next session" className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", nextMeta.chip)} aria-hidden="true"><nextMeta.icon className="size-4" /></span>
                  <div className="grid min-w-0 gap-0.5">
                    <p className="text-xs text-muted-foreground">Up next</p>
                    <h3 className="font-semibold">{phaseLabels[nextType]} · {nextMinutes} min</h3>
                    <p className="text-sm text-muted-foreground">
                      {!canContinue ? "Add an active task to start another focus session."
                        : nextType === "focus" ? "Ready for another round? Choose when to begin."
                        : "Give yourself a little space before the next task."}
                    </p>
                  </div>
                </div>
                <FocusRoundDots
                  completed={stats.completed_focus_sessions}
                  perCycle={settings.sessions_before_long_break}
                  suggestedNext={suggestedNext}
                  className="justify-start"
                />
              </section>
            )}
            {completion.error && <Alert variant="destructive"><AlertDescription>{completion.error}</AlertDescription></Alert>}
            <FocusTodayStats stats={stats} />
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-4 sm:px-6">
            {needsReflection ? (
              <>
                {hasDraft && <Button variant="ghost" onClick={() => requestDismiss("skip")} disabled={pending}>Skip reflection</Button>}
                <Button variant="outline" onClick={() => hasDraft ? save("finish") : requestDismiss("finish")} disabled={pending}>
                  {hasDraft ? "Save & finish" : "Finish for now"}
                </Button>
                <Button onClick={() => hasDraft ? save("save") : requestDismiss("skip")} disabled={pending}>
                  {pending && <Loader2 data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />}
                  {pending ? "Saving…" : hasDraft ? "Save to Journal" : "Skip reflection"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onFinish} disabled={pending}>Finish for now</Button>
                <Button onClick={onContinue} disabled={pending || !canContinue}>
                  {pending ? <Loader2 data-icon="inline-start" className="animate-spin motion-reduce:animate-none" /> : <Play data-icon="inline-start" />}
                  {pending ? "Starting…" : "Start " + phaseLabels[nextType].toLowerCase()}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(discardIntent)} onOpenChange={(open) => !open && setDiscardIntent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this reflection?</AlertDialogTitle>
            <AlertDialogDescription>This reflection has not been saved to Journal.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep writing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => {
              const intent = discardIntent;
              setDiscardIntent(null);
              if (intent) onResolve(intent, null, null);
            }}>
              {discardIntent === "skip" ? "Discard & skip" : "Discard & finish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
