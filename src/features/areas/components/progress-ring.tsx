import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProgressRing({
  percent,
  label,
  complete = percent >= 100,
  className,
  children,
}: {
  percent: number;
  label: string;
  complete?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative size-20 shrink-0 sm:size-24", className)}
    >
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className={cn(
            "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out",
            complete ? "stroke-emerald-500" : "stroke-primary",
          )}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums sm:text-xl">
        {children ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
