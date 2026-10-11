"use client";

import { formatCountdown, phaseMeta, phaseMinutes } from "../lib/focus-utils";
import { useFocusCountdown } from "../providers/focus-session-provider";
import type { FocusSession, FocusSessionType, FocusSettings, FocusTask } from "../type";

// Display state shared by the timer card and quiet view so both read the same.
export function useFocusTimerView({ session, phase, selectedTask, settings }: {
  session: FocusSession | null;
  phase: FocusSessionType;
  selectedTask?: FocusTask;
  settings: FocusSettings;
}) {
  const timer = useFocusCountdown();
  const activePhase = session?.type ?? phase;
  const minutes = phaseMinutes(settings);
  const remaining = session ? timer.remaining : minutes[activePhase] * 60;
  const paused = session?.status === "paused";
  const needsTask = !session && activePhase === "focus" && !selectedTask;
  return {
    activePhase,
    meta: phaseMeta[activePhase],
    minutes,
    remaining,
    time: formatCountdown(remaining),
    progress: session ? timer.progress : 0,
    paused,
    running: session?.status === "running" && remaining > 0,
    needsTask,
    status: paused ? "Paused" : session ? remaining === 0 ? "Finishing…" : "Running" : "Ready",
    title: activePhase === "focus"
      ? session?.task?.title ?? selectedTask?.title ?? "What will you focus on?"
      : activePhase === "long_break" ? "Take a longer breather" : "A moment to recharge",
    eyebrow: activePhase !== "focus" ? "Break time"
      : session?.task || selectedTask ? "Working on" : "No task selected",
    helper: needsTask ? "Add a task or bring one in from your Project Board."
      : paused ? "Your session is paused. Resume when you’re ready."
      : session ? "One thing at a time. Your progress is kept as you work."
      : activePhase === "focus" ? "Give this task your full attention."
      : "Step away and come back refreshed.",
  };
}

export type FocusTimerView = ReturnType<typeof useFocusTimerView>;
