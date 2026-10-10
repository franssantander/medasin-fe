import { cn } from "@/lib/utils";
import { getRoundProgress, phaseMeta } from "../lib/focus-utils";
import type { FocusSessionType } from "../type";

export function FocusRoundDots({ completed, perCycle, suggestedNext, className }: {
  completed: number;
  perCycle: number;
  suggestedNext: FocusSessionType;
  className?: string;
}) {
  const { size, filled, round } = getRoundProgress(completed, perCycle, suggestedNext);
  const longBreakNext = filled === size;
  const caption = longBreakNext ? "Long break earned" : `Round ${round} of ${size}`;

  return (
    <div className={cn("flex items-center justify-center gap-2.5 text-xs text-muted-foreground", className)}>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: size }, (_, index) => (
          <span
            key={index}
            className={cn(
              "size-2 rounded-full transition-colors motion-reduce:transition-none",
              index < filled ? phaseMeta.focus.dot : "bg-border",
            )}
          />
        ))}
      </span>
      <span aria-hidden="true" className="tabular-nums">{caption}</span>
      <span className="sr-only">
        {longBreakNext
          ? `All ${size} focus sessions in this cycle are done. A long break is next.`
          : `Focus round ${round} of ${size} before a long break.`}
      </span>
    </div>
  );
}
