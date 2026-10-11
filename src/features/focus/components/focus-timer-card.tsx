"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useFocusTimerView } from "../hooks/use-focus-timer-view";
import { phaseLabels } from "../lib/focus-utils";
import type { AmbientSound, FocusDashboard, FocusSession, FocusSessionType, FocusSettings, FocusTask } from "../type";
import { FocusProgressRing } from "./focus-progress-ring";
import { FocusRoundDots } from "./focus-round-dots";
import { FocusSoundSelect } from "./focus-sound-select";
import { FocusPhaseStatus, FocusShortcutHint, FocusTimerControls } from "./focus-timer-controls";
import { FocusTodayStats } from "./focus-today-stats";

export function FocusTimerCard({
  session, phase, selectedTask, settings, stats, suggestedNext, pending, soundPending,
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
  onPhaseChange: (phase: FocusSessionType) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAmbientChange: (sound: AmbientSound) => void;
  onAddTask: () => void;
  onEnterQuiet: () => void;
}) {
  const view = useFocusTimerView({ session, phase, selectedTask, settings });

  return (
    <Card className={cn("min-w-0 gap-6 transition-colors motion-reduce:transition-none", view.meta.wash)} aria-label="Focus timer">
      <CardHeader className="flex min-w-0 items-center justify-between gap-3">
        <FocusPhaseStatus view={view} />
      </CardHeader>
      <CardContent className="items-center gap-6">
        <ToggleGroup
          aria-label="Session type"
          value={[view.activePhase]}
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
              <span className="text-xs leading-tight font-normal text-muted-foreground tabular-nums">{view.minutes[item]} min</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FocusProgressRing
          progress={view.progress}
          time={view.time}
          label={phaseLabels[view.activePhase]}
          caption={view.paused ? "paused" : "remaining"}
          toneClassName={view.meta.text}
          paused={view.paused}
        />
        <div className="flex w-full max-w-md min-w-0 flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium text-muted-foreground">{view.eyebrow}</p>
          <h2 className="line-clamp-2 max-w-full text-lg leading-snug font-semibold break-words" title={view.title}>{view.title}</h2>
        </div>
        <FocusRoundDots
          completed={stats.completed_focus_sessions}
          perCycle={settings.sessions_before_long_break}
          suggestedNext={suggestedNext}
        />
        <div className="flex flex-col items-center gap-3">
          <FocusTimerControls
            view={view}
            session={session}
            pending={pending}
            showQuietToggle
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onReset={onReset}
            onAddTask={onAddTask}
            onEnterQuiet={onEnterQuiet}
          />
          <p className="max-w-sm text-center text-sm text-muted-foreground">{view.helper}</p>
          <FocusShortcutHint view={view} session={session} />
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
        <FocusTodayStats stats={stats} className="sm:max-w-sm sm:flex-1" />
        <FocusSoundSelect value={settings.ambient_sound} disabled={soundPending} onChange={onAmbientChange} />
      </CardFooter>
    </Card>
  );
}
