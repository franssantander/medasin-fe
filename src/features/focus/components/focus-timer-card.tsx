"use client";

import { Pause, Play, Plus, RotateCcw, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFocusTimer } from "../hooks/use-focus-timer";
import { ambientOptions, phaseLabels } from "../lib/focus-utils";
import type { AmbientSound, FocusDashboard, FocusSession, FocusSessionType, FocusSettings, FocusTask } from "../type";
import { FocusProgressRing } from "./focus-progress-ring";
import { FocusTodayStats } from "./focus-today-stats";

export function FocusTimerCard({
  session, phase, selectedTask, settings, stats, pending, soundPending,
  onPhaseChange, onStart, onPause, onResume, onReset, onAmbientChange, onAddTask, onElapsed,
}: {
  session: FocusSession | null;
  phase: FocusSessionType;
  selectedTask?: FocusTask;
  settings: FocusSettings;
  stats: FocusDashboard["today"];
  pending: boolean;
  soundPending: boolean;
  onPhaseChange: (phase: FocusSessionType) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAmbientChange: (sound: AmbientSound) => void;
  onAddTask: () => void;
  onElapsed: (session: FocusSession) => void;
}) {
  const timer = useFocusTimer(session, onElapsed);
  const activePhase = session?.type ?? phase;
  const minutes: Record<FocusSessionType, number> = {
    focus: settings.focus_minutes,
    short_break: settings.short_break_minutes,
    long_break: settings.long_break_minutes,
  };
  const remaining = session ? timer.remaining : minutes[activePhase] * 60;
  const time = String(Math.floor(remaining / 60)).padStart(2, "0") + ":" + String(remaining % 60).padStart(2, "0");
  const needsTask = !session && activePhase === "focus" && !selectedTask;
  const status = session?.status === "paused" ? "Paused" : session ? "Running" : "Ready";
  const title = activePhase === "focus"
    ? session?.task?.title ?? selectedTask?.title ?? "What will you focus on?"
    : activePhase === "long_break" ? "Take a longer breather" : "A moment to recharge";

  return (
    <Card className="min-w-0 gap-5 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]" aria-label="Focus timer">
      <CardHeader className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm text-muted-foreground">
            {activePhase === "focus" ? "Current task" : phaseLabels[activePhase]}
          </p>
          <h2 className="line-clamp-2 text-lg leading-snug font-semibold" title={title}>{title}</h2>
        </div>
        <Badge variant="secondary" className="mt-1 shrink-0">{status}</Badge>
      </CardHeader>
      <CardContent className="items-center gap-5 sm:gap-6">
        <ToggleGroup
          aria-label="Session type"
          value={[activePhase]}
          onValueChange={(values) => values[0] && onPhaseChange(values[0] as FocusSessionType)}
          disabled={Boolean(session) || pending}
          variant="outline"
          spacing={0}
          className="w-full max-w-md"
        >
          {(Object.keys(phaseLabels) as FocusSessionType[]).map((item) => (
            <ToggleGroupItem key={item} value={item} className="min-h-14 min-w-0 flex-1 flex-col gap-0.5 px-1">
              <span>{phaseLabels[item]}</span>
              <span className="text-xs font-normal text-muted-foreground">{minutes[item]} min</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FocusProgressRing
          progress={session ? timer.progress : 0}
          time={time}
          label={phaseLabels[activePhase]}
        />
        <div className="flex w-full flex-wrap justify-center gap-2">
          {needsTask ? (
            <Button id="focus-primary-action" className="min-h-12 min-w-40" onClick={onAddTask} disabled={pending}>
              <Plus data-icon="inline-start" />Add a task
            </Button>
          ) : (
            <Button
              id="focus-primary-action"
              className="min-h-12 min-w-40"
              onClick={!session ? onStart : session.status === "paused" ? onResume : onPause}
              disabled={pending}
            >
              {session?.status === "running" ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
              {!session ? "Start " + phaseLabels[activePhase].toLowerCase() : session.status === "paused" ? "Resume" : "Pause"}
            </Button>
          )}
          {session && (
            <Button variant="outline" className="min-h-12 px-4" onClick={onReset} disabled={pending}>
              <RotateCcw data-icon="inline-start" />Reset
            </Button>
          )}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {needsTask ? "Add a task or bring one in from your Project Board."
            : session?.status === "paused" ? "Your session is paused. Resume when you’re ready."
            : session ? "One thing at a time. Your progress is kept as you work."
            : activePhase === "focus" ? "Give this task your full attention."
            : "Step away and come back refreshed."}
        </p>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4">
        <Separator />
        <FocusTodayStats stats={stats} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Long break every {settings.sessions_before_long_break} focus sessions</p>
          <div className="flex items-center gap-2">
            <Volume2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="focus-ambient" className="text-sm text-muted-foreground">Sound</label>
            <Select
              items={ambientOptions}
              value={settings.ambient_sound}
              onValueChange={(value) => value && onAmbientChange(value as AmbientSound)}
              disabled={soundPending}
            >
              <SelectTrigger id="focus-ambient" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ambientOptions.map((item) => <SelectItem key={item.value} value={item.value} className="min-h-11">{item.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
