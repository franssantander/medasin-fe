"use client";

import { Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { useFocusTimerView } from "../hooks/use-focus-timer-view";
import { phaseLabels } from "../lib/focus-utils";
import type { AmbientSound, FocusDashboard, FocusSession, FocusSessionType, FocusSettings, FocusTask } from "../type";
import { FocusProgressRing } from "./focus-progress-ring";
import { FocusRoundDots } from "./focus-round-dots";
import { FocusSoundSelect } from "./focus-sound-select";
import { FocusPhaseStatus, FocusShortcutHint, FocusTimerControls } from "./focus-timer-controls";

// Distraction-free layout: everything sits in normal flow and is sized to the
// viewport, so nothing sticky overlaps the timer and desktop screens never scroll.
export function FocusQuietView({
  session, phase, selectedTask, settings, stats, suggestedNext, pending, soundPending,
  onStart, onPause, onResume, onReset, onAmbientChange, onAddTask, onExitQuiet, children,
}: {
  session: FocusSession | null;
  phase: FocusSessionType;
  selectedTask?: FocusTask;
  settings: FocusSettings;
  stats: FocusDashboard["today"];
  suggestedNext: FocusSessionType;
  pending: boolean;
  soundPending: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAmbientChange: (sound: AmbientSound) => void;
  onAddTask: () => void;
  onExitQuiet: () => void;
  children?: React.ReactNode;
}) {
  const view = useFocusTimerView({ session, phase, selectedTask, settings });

  return (
    <section
      aria-label="Focus timer"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
    >
      <h1 className="sr-only">Focus Timer</h1>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <FocusPhaseStatus view={view} />
        </div>
        <Button id="focus-exit-quiet" variant="outline" size="sm" onClick={onExitQuiet}>
          <Minimize2 data-icon="inline-start" />Show app
          <Kbd aria-hidden="true" className="ml-1 hidden sm:inline-flex">Esc</Kbd>
        </Button>
      </div>
      <div className="mx-auto grid w-full max-w-xl gap-3 empty:hidden">{children}</div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2 sm:gap-6">
        <div className="relative grid w-full place-items-center">
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute aspect-square w-full max-w-[min(22rem,42dvh)] scale-110 rounded-full blur-3xl transition-[background-color,opacity] duration-500 motion-reduce:transition-none",
              view.meta.glow,
              view.paused && "opacity-40",
            )}
          />
          <FocusProgressRing
            size="quiet"
            progress={view.progress}
            time={view.time}
            label={phaseLabels[view.activePhase]}
            caption={view.paused ? "paused" : "remaining"}
            toneClassName={view.meta.text}
            paused={view.paused}
          />
        </div>
        <div className="flex w-full max-w-lg min-w-0 flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium text-muted-foreground">{view.eyebrow}</p>
          <h2 className="line-clamp-2 max-w-full text-xl leading-snug font-semibold break-words sm:text-2xl" title={view.title}>{view.title}</h2>
        </div>
        <FocusRoundDots
          completed={stats.completed_focus_sessions}
          perCycle={settings.sessions_before_long_break}
          suggestedNext={suggestedNext}
        />
        <FocusTimerControls
          view={view}
          session={session}
          pending={pending}
          showQuietToggle={false}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onReset={onReset}
          onAddTask={onAddTask}
        />
      </div>
      <div className="flex items-center justify-center gap-3 border-t pt-4 sm:justify-between">
        <FocusShortcutHint view={view} session={session} />
        <FocusSoundSelect value={settings.ambient_sound} disabled={soundPending} onChange={onAmbientChange} />
      </div>
    </section>
  );
}
