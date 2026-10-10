"use client";

import { Maximize2, Pause, Play, Plus, RotateCcw, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ambientOptions, formatCountdown, phaseLabels, phaseMeta, phaseMinutes } from "../lib/focus-utils";
import { useFocusShortcuts } from "../hooks/use-focus-shortcuts";
import { useFocusCountdown } from "../providers/focus-session-provider";
import type { AmbientSound, FocusDashboard, FocusSession, FocusSessionType, FocusSettings, FocusTask } from "../type";
import { FocusProgressRing } from "./focus-progress-ring";
import { FocusRoundDots } from "./focus-round-dots";
import { FocusTodayStats } from "./focus-today-stats";

export function FocusTimerCard({
  session, phase, selectedTask, settings, stats, suggestedNext, pending, soundPending, quiet,
  onPhaseChange, onStart, onPause, onResume, onReset, onAmbientChange, onAddTask, onEnterQuiet,
}: {
  session: FocusSession | null;
  phase: FocusSessionType;
  selectedTask?: FocusTask;
  settings: FocusSettings;
  stats: FocusDashboard["today"];
  suggestedNext: FocusSessionType;
  pending: boolean;
  soundPending: boolean;
  quiet: boolean;
  onPhaseChange: (phase: FocusSessionType) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAmbientChange: (sound: AmbientSound) => void;
  onAddTask: () => void;
  onEnterQuiet: () => void;
}) {
  const timer = useFocusCountdown();
  const activePhase = session?.type ?? phase;
  const meta = phaseMeta[activePhase];
  const minutes = phaseMinutes(settings);
  const remaining = session ? timer.remaining : minutes[activePhase] * 60;
  const time = formatCountdown(remaining);
  const needsTask = !session && activePhase === "focus" && !selectedTask;
  const paused = session?.status === "paused";
  const running = session?.status === "running" && remaining > 0;
  const status = paused ? "Paused" : session ? remaining === 0 ? "Finishing…" : "Running" : "Ready";
  const title = activePhase === "focus"
    ? session?.task?.title ?? selectedTask?.title ?? "What will you focus on?"
    : activePhase === "long_break" ? "Take a longer breather" : "A moment to recharge";
  const eyebrow = activePhase !== "focus" ? "Break time"
    : session?.task || selectedTask ? "Working on" : "No task selected";
  const helper = needsTask ? "Add a task or bring one in from your Project Board."
    : paused ? "Your session is paused. Resume when you’re ready."
    : session ? "One thing at a time. Your progress is kept as you work."
    : activePhase === "focus" ? "Give this task your full attention."
    : "Step away and come back refreshed.";
  const PhaseIcon = meta.icon;
  const canToggle = !pending && !needsTask && (!session || remaining > 0);
  useFocusShortcuts(canToggle ? (!session ? onStart : paused ? onResume : onPause) : null);

  return (
    <Card className={cn("min-w-0 gap-6 transition-colors motion-reduce:transition-none", meta.wash)} aria-label="Focus timer">
      <CardHeader className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", meta.chip)} aria-hidden="true">
            <PhaseIcon className="size-4" />
          </span>
          <span className="truncate text-sm font-medium">{phaseLabels[activePhase]}</span>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1.5 bg-background/70">
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 rounded-full",
              running ? cn(meta.dot, "animate-pulse motion-reduce:animate-none") : paused ? "bg-amber-500" : "bg-muted-foreground/50",
            )}
          />
          {status}
        </Badge>
      </CardHeader>
      <CardContent className="items-center gap-6">
        {!quiet && (
          <ToggleGroup
            aria-label="Session type"
            value={[activePhase]}
            onValueChange={(values) => values[0] && onPhaseChange(values[0] as FocusSessionType)}
            disabled={Boolean(session) || pending}
            spacing={1}
            className="w-full max-w-md rounded-lg bg-muted p-[3px]"
          >
            {(Object.keys(phaseLabels) as FocusSessionType[]).map((item) => (
              <ToggleGroupItem
                key={item}
                value={item}
                className="h-auto min-w-0 flex-1 flex-col gap-0.5 py-1.5 text-muted-foreground hover:bg-transparent aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm dark:aria-pressed:bg-input/30"
              >
                <span className="max-w-full truncate leading-tight">{phaseLabels[item]}</span>
                <span className="text-xs leading-tight font-normal text-muted-foreground tabular-nums">{minutes[item]} min</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        <FocusProgressRing
          progress={session ? timer.progress : 0}
          time={time}
          label={phaseLabels[activePhase]}
          caption={paused ? "paused" : "remaining"}
          toneClassName={meta.text}
          paused={paused}
          large={quiet}
        />
        <div className="flex w-full max-w-md min-w-0 flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>
          <h2 className="line-clamp-2 max-w-full text-lg leading-snug font-semibold break-words" title={title}>{title}</h2>
        </div>
        <FocusRoundDots
          completed={stats.completed_focus_sessions}
          perCycle={settings.sessions_before_long_break}
          suggestedNext={suggestedNext}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-3">
            {session ? (
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Reset" onClick={onReset} disabled={pending} />}>
                  <RotateCcw />
                </TooltipTrigger>
                <TooltipContent>Reset session</TooltipContent>
              </Tooltip>
            ) : <span className="size-9" aria-hidden="true" />}
            {needsTask ? (
              <Button id="focus-primary-action" className="min-w-36" onClick={onAddTask} disabled={pending}>
                <Plus data-icon="inline-start" />Add a task
              </Button>
            ) : (
              <Button
                id="focus-primary-action"
                className="min-w-36"
                aria-keyshortcuts="Space"
                onClick={!session ? onStart : paused ? onResume : onPause}
                disabled={pending}
              >
                {session?.status === "running" ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
                {!session ? "Start " + phaseLabels[activePhase].toLowerCase() : paused ? "Resume" : "Pause"}
              </Button>
            )}
            {session && !quiet ? (
              <Tooltip>
                <TooltipTrigger render={<Button id="focus-enter-quiet" variant="ghost" size="icon" aria-label="Quiet view" onClick={onEnterQuiet} disabled={pending} />}>
                  <Maximize2 />
                </TooltipTrigger>
                <TooltipContent>Hide everything but the timer</TooltipContent>
              </Tooltip>
            ) : <span className="size-9" aria-hidden="true" />}
          </div>
          <p className="max-w-sm text-center text-sm text-muted-foreground">{helper}</p>
          {!needsTask && (
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" aria-hidden="true">
              <span>Press</span><Kbd>Space</Kbd><span>to {!session ? "start" : paused ? "resume" : "pause"}</span>
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className={cn("flex-col items-stretch gap-3 border-t sm:flex-row sm:items-center sm:justify-between", quiet && "sm:justify-center")}>
        {!quiet && <FocusTodayStats stats={stats} className="sm:max-w-sm sm:flex-1" />}
        <div className="flex items-center justify-center gap-2">
          <Volume2 className="size-4 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="focus-ambient" className="text-sm text-muted-foreground">Sound</label>
          <Select
            items={ambientOptions}
            value={settings.ambient_sound}
            onValueChange={(value) => value && onAmbientChange(value as AmbientSound)}
            disabled={soundPending}
          >
            <SelectTrigger id="focus-ambient" size="sm" className="min-w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ambientOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardFooter>
    </Card>
  );
}
