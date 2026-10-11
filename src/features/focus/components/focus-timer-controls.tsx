"use client";

import { Maximize2, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FocusTimerView } from "../hooks/use-focus-timer-view";
import { useFocusShortcuts } from "../hooks/use-focus-shortcuts";
import { phaseLabels } from "../lib/focus-utils";
import type { FocusSession } from "../type";

export function FocusPhaseStatus({ view }: { view: FocusTimerView }) {
  const PhaseIcon = view.meta.icon;
  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", view.meta.chip)} aria-hidden="true">
          <PhaseIcon className="size-4" />
        </span>
        <span className="truncate text-sm font-medium">{phaseLabels[view.activePhase]}</span>
      </div>
      <Badge variant="outline" className="shrink-0 gap-1.5 bg-background/70">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            view.running ? cn(view.meta.dot, "animate-pulse motion-reduce:animate-none") : view.paused ? "bg-amber-500" : "bg-muted-foreground/50",
          )}
        />
        {view.status}
      </Badge>
    </>
  );
}

export function FocusShortcutHint({ view, session, className }: { view: FocusTimerView; session: FocusSession | null; className?: string }) {
  if (view.needsTask) return null;
  return (
    <p className={cn("hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex", className)} aria-hidden="true">
      <span>Press</span><Kbd>Space</Kbd><span>to {!session ? "start" : view.paused ? "resume" : "pause"}</span>
    </p>
  );
}

export function FocusTimerControls({
  view, session, pending, showQuietToggle, onStart, onPause, onResume, onReset, onAddTask, onEnterQuiet,
}: {
  view: FocusTimerView;
  session: FocusSession | null;
  pending: boolean;
  showQuietToggle: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAddTask: () => void;
  onEnterQuiet?: () => void;
}) {
  const canToggle = !pending && !view.needsTask && (!session || view.remaining > 0);
  useFocusShortcuts(canToggle ? (!session ? onStart : view.paused ? onResume : onPause) : null);

  return (
    <div className="flex items-center justify-center gap-3">
      {session ? (
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Reset" onClick={onReset} disabled={pending} />}>
            <RotateCcw />
          </TooltipTrigger>
          <TooltipContent>Reset session</TooltipContent>
        </Tooltip>
      ) : <span className="size-9" aria-hidden="true" />}
      {view.needsTask ? (
        <Button id="focus-primary-action" className="min-w-36" onClick={onAddTask} disabled={pending}>
          <Plus data-icon="inline-start" />Add a task
        </Button>
      ) : (
        <Button
          id="focus-primary-action"
          className="min-w-36"
          aria-keyshortcuts="Space"
          onClick={!session ? onStart : view.paused ? onResume : onPause}
          disabled={pending}
        >
          {session?.status === "running" ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
          {!session ? "Start " + phaseLabels[view.activePhase].toLowerCase() : view.paused ? "Resume" : "Pause"}
        </Button>
      )}
      {session && showQuietToggle && onEnterQuiet ? (
        <Tooltip>
          <TooltipTrigger render={<Button id="focus-enter-quiet" variant="ghost" size="icon" aria-label="Quiet view" onClick={onEnterQuiet} disabled={pending} />}>
            <Maximize2 />
          </TooltipTrigger>
          <TooltipContent>Hide everything but the timer</TooltipContent>
        </Tooltip>
      ) : <span className="size-9" aria-hidden="true" />}
    </div>
  );
}
