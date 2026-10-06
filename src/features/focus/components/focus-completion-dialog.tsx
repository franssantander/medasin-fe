"use client";

import { Check, Frown, Loader2, Meh, Moon, Play, Smile, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FocusCompletion, ReflectionAction } from "../hooks/use-focus-session-flow";
import { phaseLabels } from "../lib/focus-utils";
import type { FocusDashboard, FocusMood, FocusSettings } from "../type";
import { FocusJournalLink } from "./focus-journal-link";
import { FocusTodayStats } from "./focus-today-stats";

const moods = [
  { value: "calm", icon: Smile, label: "Calm" },
  { value: "frustrated", icon: Frown, label: "Frustrated" },
  { value: "neutral", icon: Meh, label: "Neutral" },
  { value: "tired", icon: Moon, label: "Tired" },
] as const;

export function FocusCompletionDialog({
  completion, settings, stats, hasActiveTask, onResolve, onContinue, onFinish, onDraftChange, pending,
}: {
  completion: FocusCompletion;
  settings: FocusSettings;
  stats: FocusDashboard["today"];
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
  const nextMinutes = nextType === "focus" ? settings.focus_minutes
    : nextType === "short_break" ? settings.short_break_minutes : settings.long_break_minutes;
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
          className="max-h-[92dvh] gap-0 overflow-hidden p-0 motion-reduce:transition-none"
        >
          <DialogHeader className="shrink-0 px-6 py-5">
            <span className="mb-2 grid size-11 place-items-center rounded-full bg-muted" aria-hidden="true"><Check className="size-5" /></span>
            <DialogTitle>{session.type === "focus" ? "Focus session complete" : "Break complete"}</DialogTitle>
            <DialogDescription>
              {Math.round(session.duration_seconds / 60)} minutes{session.task ? " on “" + session.task.title + "”" : " to reset and recharge"}.
            </DialogDescription>
          </DialogHeader>
          <Button variant="ghost" size="icon" className="absolute top-3 right-3 size-11" aria-label="Close" onClick={() => requestDismiss("finish")} disabled={pending}><X /></Button>
          <Separator />
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 py-5">
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
                      <ToggleGroupItem key={item.value} value={item.value} className="min-h-18 flex-col gap-2">
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
              <section aria-label="Next session" className="grid gap-1">
                <p className="text-sm text-muted-foreground">Up next</p>
                <h3 className="text-lg font-semibold">{phaseLabels[nextType]} · {nextMinutes} min</h3>
                <p className="text-sm text-muted-foreground">
                  {!canContinue ? "Add an active task to start another focus session."
                    : nextType === "focus" ? "Ready for another round? Choose when to begin."
                    : "Give yourself a little space before the next task."}
                </p>
              </section>
            )}
            {completion.error && <Alert variant="destructive"><AlertDescription>{completion.error}</AlertDescription></Alert>}
            <Separator />
            <FocusTodayStats stats={stats} />
          </div>
          <Separator />
          <DialogFooter className="shrink-0 px-6 py-4">
            {needsReflection ? (
              <>
                {hasDraft && <Button variant="ghost" className="min-h-11" onClick={() => requestDismiss("skip")} disabled={pending}>Skip reflection</Button>}
                <Button variant="outline" className="min-h-11" onClick={() => hasDraft ? save("finish") : requestDismiss("finish")} disabled={pending}>
                  {hasDraft ? "Save & finish" : "Finish for now"}
                </Button>
                <Button className="min-h-11" onClick={() => hasDraft ? save("save") : requestDismiss("skip")} disabled={pending}>
                  {pending && <Loader2 data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />}
                  {pending ? "Saving…" : hasDraft ? "Save to Journal" : "Skip reflection"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="min-h-11" onClick={onFinish} disabled={pending}>Finish for now</Button>
                <Button className="min-h-11" onClick={onContinue} disabled={pending || !canContinue}>
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
            <AlertDialogCancel className="min-h-11">Keep writing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="min-h-11" onClick={() => {
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
