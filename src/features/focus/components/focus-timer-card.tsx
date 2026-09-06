"use client";

import { Pause, Play, RotateCcw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  AmbientSound,
  FocusSession,
  FocusSessionType,
  FocusSettings,
  FocusTask,
} from "../type";
import { FocusProgressRing } from "./focus-progress-ring";

const labels: Record<FocusSessionType, string> = {
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

export function FocusTimerCard({
  session,
  phase,
  selectedTask,
  settings,
  remaining,
  progress,
  todayCount,
  pending,
  onPhaseChange,
  onStart,
  onPause,
  onResume,
  onReset,
  onAmbientChange,
  onOpenSettings,
}: {
  session: FocusSession | null;
  phase: FocusSessionType;
  selectedTask?: FocusTask;
  settings: FocusSettings;
  remaining: number;
  progress: number;
  todayCount: number;
  pending: boolean;
  onPhaseChange: (phase: FocusSessionType) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAmbientChange: (sound: AmbientSound) => void;
  onOpenSettings: () => void;
}) {
  const activePhase = session?.type ?? phase;
  const idleDuration =
    (activePhase === "focus"
      ? settings.focus_minutes
      : activePhase === "short_break"
        ? settings.short_break_minutes
        : settings.long_break_minutes) * 60;
  const shownRemaining = session ? remaining : idleDuration;
  const time = `${String(Math.floor(shownRemaining / 60)).padStart(2, "0")}:${String(shownRemaining % 60).padStart(2, "0")}`;
  return (
    <Card className="order-1 min-h-[34rem] items-center justify-between gap-6 p-5 py-6 lg:order-2 sm:p-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {activePhase === "focus" ? "Working on" : "Time to recharge"}
        </p>
        <h2 className="mt-1 min-h-7 text-lg font-semibold">
          {activePhase === "focus"
            ? (session?.task?.title ?? selectedTask?.title ?? "Choose a task")
            : labels[activePhase]}
        </h2>
      </div>
      <div
        className="grid w-full max-w-md grid-cols-3 rounded-lg bg-muted p-1"
        role="tablist"
        aria-label="Focus phase"
      >
        {(["focus", "short_break", "long_break"] as FocusSessionType[]).map(
          (item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={activePhase === item}
              disabled={Boolean(session)}
              onClick={() => onPhaseChange(item)}
              className={cn(
                "h-9 rounded-md px-2 text-xs font-medium text-muted-foreground disabled:cursor-not-allowed sm:text-sm",
                activePhase === item &&
                  "bg-background font-semibold text-foreground shadow-xs",
              )}
            >
              {labels[item]}
            </button>
          ),
        )}
      </div>
      <FocusProgressRing
        progress={session ? progress : 0}
        time={time}
        label={labels[activePhase]}
      />
      <div className="flex items-center gap-2">
        {!session && (
          <Button
            size="lg"
            onClick={onStart}
            disabled={pending || (activePhase === "focus" && !selectedTask)}
          >
            <Play />
            Start
          </Button>
        )}
        {session?.status === "running" && (
          <Button size="lg" onClick={onPause} disabled={pending}>
            <Pause />
            Pause
          </Button>
        )}
        {session?.status === "paused" && (
          <Button size="lg" onClick={onResume} disabled={pending}>
            <Play />
            Resume
          </Button>
        )}
        {session && (
          <Button
            size="lg"
            variant="outline"
            onClick={onReset}
            disabled={pending}
          >
            <RotateCcw />
            Reset
          </Button>
        )}
      </div>
      <div
        className="flex min-h-4 flex-wrap justify-center gap-2"
        aria-label={`${todayCount} completed sessions today`}
      >
        {Array.from({
          length: Math.max(settings.sessions_before_long_break, todayCount),
        }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "size-3 rounded-full border",
              index < todayCount && "border-foreground bg-foreground",
            )}
          />
        ))}
      </div>
      <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
        <div className="flex gap-3">
          <span>
            <strong className="text-foreground">
              {settings.focus_minutes}min
            </strong>{" "}
            Focus
          </span>
          <span>
            <strong className="text-foreground">
              {settings.short_break_minutes}min
            </strong>{" "}
            Short
          </span>
          <span>
            <strong className="text-foreground">
              {settings.long_break_minutes}min
            </strong>{" "}
            Long
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={settings.ambient_sound}
            onValueChange={(value) => onAmbientChange(value as AmbientSound)}
          >
            <SelectTrigger size="sm" aria-label="Ambient sound">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="brown">Brown noise</SelectItem>
              <SelectItem value="pink">Pink noise</SelectItem>
              <SelectItem value="white">White noise</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onOpenSettings}
            aria-label="Timer settings"
          >
            <Settings />
          </Button>
        </div>
      </div>
    </Card>
  );
}
