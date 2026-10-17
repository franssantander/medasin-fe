"use client";

import { Target, Timer } from "lucide-react";
import { animate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useEffect } from "react";

import { ease } from "@/features/landing/motion/tokens";
import { cn } from "@/lib/utils";

const PROGRESS = 64;
const PROGRESS_DELAY = 0.9;

const week = [
  { day: "M", done: true },
  { day: "T", done: true },
  { day: "W", done: false },
  { day: "T", done: true },
  { day: "F", done: true, today: true },
  { day: "S", done: false },
  { day: "S", done: false },
];

function ProgressPercent() {
  const reduce = useReducedMotion();
  const value = useMotionValue(0);
  const label = useTransform(value, (latest) => `${Math.round(latest)}%`);

  useEffect(() => {
    if (reduce) {
      value.set(PROGRESS);
      return;
    }
    const controls = animate(value, PROGRESS, { duration: 1.4, delay: PROGRESS_DELAY, ease });
    return () => controls.stop();
  }, [reduce, value]);

  return <m.span className="text-xs tabular-nums text-muted-foreground">{label}</m.span>;
}

// Illustrative glimpse of the workspace; sample content, hidden from assistive tech.
// The cards settle in, the week's check-ins pop in, and the project bar fills.
export function AuthWorkspaceGlimpse() {
  const reduce = useReducedMotion();

  return (
    <m.div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-md select-none"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 6, delay: 1.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <m.div
        initial={{ opacity: 0, y: 18, rotate: 0 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.9, delay: 0.45, ease }}
        className="absolute inset-x-8 -top-14 h-28 rounded-xl bg-card/70 px-4 py-3 ring-1 ring-foreground/10 h-shorter:-top-12 h-shorter:py-2.5"
      >
        <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Journal</p>
        <p className="mt-1 truncate font-spectral text-sm italic text-muted-foreground">
          Slow mornings make for clearer afternoons.
        </p>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease }}
        className="relative grid gap-4 rounded-xl bg-card p-5 shadow-sm ring-1 ring-foreground/10 h-shorter:gap-3 h-shorter:p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Today</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <Timer className="size-3.5" />
            Deep work · 25:00
          </span>
        </div>

        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Read 20 pages</p>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map(({ day, done, today }, index) => (
              <div key={index} className="grid justify-items-center gap-1">
                <span className="relative grid place-items-center">
                  {today && !reduce ? (
                    <m.span
                      className="absolute inset-0 rounded-full bg-foreground/20"
                      initial={{ scale: 1, opacity: 0 }}
                      animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                      transition={{ duration: 1.8, delay: 1.4, repeat: Infinity, repeatDelay: 1.2, ease: "easeOut" }}
                    />
                  ) : null}
                  <m.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.6 + index * 0.06 }}
                    className={cn(
                      "relative size-6 rounded-full h-shorter:size-5",
                      done ? "bg-foreground" : "bg-muted",
                      today && "ring-2 ring-foreground/25 ring-offset-2 ring-offset-card",
                    )}
                  />
                </span>
                <span className="text-[0.625rem] text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t pt-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
            <Target className="size-4" />
          </span>
          <div className="grid min-w-0 flex-1 gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium">Launch portfolio site</p>
              <ProgressPercent />
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <m.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.4, delay: PROGRESS_DELAY, ease }}
                className="h-full w-[64%] origin-left rounded-full bg-foreground"
              />
            </div>
          </div>
        </div>
      </m.div>
    </m.div>
  );
}
