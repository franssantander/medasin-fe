"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FocusMood, FocusSession, FocusSessionType } from "../type";

const moods: { value: FocusMood; emoji: string; label: string }[] = [
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "frustrated", emoji: "😤", label: "Frustrated" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "tired", emoji: "🥱", label: "Tired" },
];

export function FocusCompletionDialog({
  session,
  reflectionEnabled,
  nextType,
  stats,
  onSkip,
  onContinue,
  pending,
}: {
  session: FocusSession | null;
  reflectionEnabled: boolean;
  nextType: FocusSessionType;
  stats: { completed_focus_sessions: number; focused_seconds: number };
  onSkip: () => void;
  onContinue: (mood: FocusMood | null, note: string | null) => void;
  pending: boolean;
}) {
  const [mood, setMood] = useState<FocusMood | null>(null);
  const [note, setNote] = useState("");
  if (!session) return null;
  const isFocus = session.type === "focus";
  const nextLabel = !isFocus
    ? "Start another focus"
    : nextType === "long_break"
      ? "Take a long break"
      : "Take a short break";
  return (
    <Dialog open onOpenChange={(open) => !open && onSkip()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto grid size-11 place-items-center rounded-full bg-muted text-xl">
            ✓
          </div>
          <DialogTitle className="text-center">
            {isFocus ? "Focus session complete" : "Break complete"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {Math.round(session.duration_seconds / 60)} minutes
            {session.task
              ? ` on “${session.task.title}”`
              : " to reset and recharge"}
            .
          </DialogDescription>
        </DialogHeader>
        {isFocus && reflectionEnabled && (
          <div className="grid gap-4">
            <div>
              <p className="mb-2 text-center text-sm font-medium">
                How did that go?
              </p>
              <div className="grid grid-cols-4 gap-2">
                {moods.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-label={item.label}
                    aria-pressed={mood === item.value}
                    onClick={() => setMood(item.value)}
                    className={cn(
                      "grid min-h-16 place-items-center rounded-xl border text-2xl transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      mood === item.value && "border-foreground bg-muted",
                    )}
                  >
                    {item.emoji}
                    <span className="text-[10px] text-muted-foreground">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              placeholder="A short private note (optional)"
            />
          </div>
        )}
        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          <strong className="text-foreground">
            {stats.completed_focus_sessions}
          </strong>{" "}
          sessions today ·{" "}
          <strong className="text-foreground">
            {formatFocused(stats.focused_seconds)}
          </strong>{" "}
          focused
        </div>
        <DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
          <Button variant="outline" onClick={onSkip} disabled={pending}>
            Skip
          </Button>
          <Button
            onClick={() => onContinue(mood, note.trim() || null)}
            disabled={pending}
          >
            {pending ? "Starting…" : nextLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatFocused(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
}
