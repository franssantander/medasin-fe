"use client";

import { Check, Flame, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaIcon } from "@/features/areas/components/area-icons";
import { cn } from "@/lib/utils";
import type { HabitInsights } from "../hooks/use-habit-insights";
import type { Habit, PendingHabitCheckIn } from "../type";
import { scheduleLabel } from "./habit-calendar-utils";
import { HabitProgressRing } from "./habit-progress-ring";

export function streakText(habit: Pick<Habit, "frequency">, count: number) {
  return habit.frequency === "daily"
    ? count + "-day streak"
    : count + " in a row";
}

// One component, two shapes: a compact strip above the calendar on narrow
// workspaces, and a full "Today" aside with a checklist on wide ones.
export function HabitTodayPanel({
  insights,
  loading,
  pending,
  pendingCheckIn,
  onCheckIn,
}: {
  insights: HabitInsights;
  loading: boolean;
  pending: boolean;
  pendingCheckIn?: PendingHabitCheckIn;
  onCheckIn: (habitUuid: string, date: string, completed: boolean) => void;
}) {
  const { due, done, topCurrent } = insights;
  const left = due.length - done;
  const allDone = due.length > 0 && left === 0;
  const dateLabel = insights.today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <Card
      data-slot="habit-today"
      aria-labelledby="habit-today-title"
      aria-busy={loading || insights.loading}
      className="habit-today-panel order-first min-w-0 shrink-0 gap-0 py-0 @4xl:order-none @4xl:min-h-0"
    >
      <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 @4xl:flex-col @4xl:gap-3 @4xl:px-5 @4xl:pt-5 @4xl:pb-4 @4xl:text-center">
        {loading ? (
          <RingSkeleton />
        ) : (
          <HabitProgressRing
            value={done}
            total={due.length}
            className={cn(
              "size-12 @4xl:size-28",
              allDone && "motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-300",
            )}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 @4xl:flex-none @4xl:items-center">
          <h2 id="habit-today-title" className="text-sm font-semibold">
            Today
            <span className="font-normal text-muted-foreground">
              {" · " + dateLabel}
            </span>
          </h2>
          {loading ? (
            <div className="flex flex-col gap-1.5 pt-1 @4xl:items-center">
              <Skeleton className="h-4 w-36 motion-reduce:animate-none" />
              <Skeleton className="h-3 w-48 max-w-full motion-reduce:animate-none" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {due.length
                  ? done + " of " + due.length + " done today"
                  : "Nothing scheduled today"}
              </p>
              <p
                className={cn(
                  "flex items-center gap-1.5 text-xs text-muted-foreground @4xl:justify-center",
                  allDone && "font-medium text-emerald-700 dark:text-emerald-400",
                )}
              >
                {allDone && (
                  <Sparkles
                    className="size-3.5 shrink-0 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {!due.length
                    ? "A rest day. Enjoy it."
                    : allDone
                      ? "All done for today"
                      : left === 1
                        ? "One more to go. You've got this."
                        : left + " habits left. Start with the easiest."}
                </span>
              </p>
            </>
          )}
        </div>
        {topCurrent && !loading && (
          <span className="hidden shrink-0 items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-700 sm:flex @4xl:hidden dark:text-orange-300">
            <Flame className="size-3.5" aria-hidden="true" />
            {streakText(topCurrent.habit, topCurrent.count)}
          </span>
        )}
      </div>

      <div className="hidden min-h-0 flex-1 flex-col border-t @4xl:flex">
        <p className="px-5 pt-3 pb-1 text-xs font-medium text-muted-foreground">
          Due today
        </p>
        {loading ? (
          <div className="flex flex-col gap-0.5 px-3 pb-3" aria-hidden="true">
            {["w-32", "w-40", "w-28"].map((width, row) => (
              <ChecklistRowSkeleton key={row} width={width} delay={row * 120} />
            ))}
          </div>
        ) : due.length ? (
          <ul className="workspace-list-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 pb-3">
            {due.map((habit) => {
              const checked = insights.isDone(habit);
              const saving =
                pendingCheckIn?.habitUuid === habit.uuid &&
                pendingCheckIn.date === insights.todayKey;
              const streak = insights.streaks.get(habit.uuid)?.current ?? 0;
              return (
                <li key={habit.uuid}>
                  <button
                    type="button"
                    aria-pressed={checked}
                    aria-label={"Check in " + habit.name + " for today"}
                    disabled={pending}
                    onClick={() =>
                      onCheckIn(habit.uuid, insights.todayKey, !checked)
                    }
                    className="group/today flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors",
                        checked &&
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      <AreaIcon name={habit.icon || "Repeat2"} className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          checked &&
                            "text-muted-foreground line-through decoration-muted-foreground/40",
                        )}
                      >
                        {habit.name}
                      </span>
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {streak > 0 ? (
                          <>
                            <Flame
                              className="size-3 shrink-0 text-orange-500"
                              aria-hidden="true"
                            />
                            {streakText(habit, streak)}
                          </>
                        ) : (
                          scheduleLabel(habit)
                        )}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-transparent transition-colors group-hover/today:border-emerald-500/60",
                        checked &&
                          "border-emerald-500 bg-emerald-500 text-white group-hover/today:border-emerald-500",
                        saving && "border-transparent bg-muted text-muted-foreground",
                      )}
                    >
                      {saving ? (
                        <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Check
                          className={cn(
                            "size-3.5",
                            checked &&
                              "motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200",
                          )}
                          strokeWidth={3}
                        />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 pt-1 pb-4 text-sm text-muted-foreground">
            No habits are due today.
          </p>
        )}
      </div>

      <dl className="hidden grid-cols-3 border-t @4xl:grid">
        <Highlight
          label="Current streak"
          pending={insights.loading}
          value={insights.failed ? "—" : String(topCurrent?.count ?? 0)}
          hint={topCurrent?.habit.name ?? "Start one today"}
          flame={Boolean(topCurrent)}
        />
        <Highlight
          label="Best streak"
          pending={insights.loading}
          value={insights.failed ? "—" : String(insights.best)}
          hint="Personal record"
        />
        <Highlight
          label="Last 7 days"
          pending={insights.loading}
          value={
            insights.failed || insights.last7Rate === null
              ? "—"
              : Math.round(insights.last7Rate * 100) + "%"
          }
          hint="completed"
        />
      </dl>
    </Card>
  );
}

function Highlight({
  label,
  value,
  hint,
  pending,
  flame = false,
}: {
  label: string;
  value: string;
  hint: string;
  pending: boolean;
  flame?: boolean;
}) {
  if (pending)
    return (
      <div className="flex min-w-0 flex-col gap-0.5 border-r px-3 py-3 last:border-r-0">
        <dt className="truncate text-xs text-muted-foreground">{label}</dt>
        <dd className="flex h-7 items-center">
          <Skeleton className="h-5 w-10 motion-reduce:animate-none" />
          <span className="sr-only">Loading</span>
        </dd>
        <dd className="flex h-4 items-center" aria-hidden="true">
          <Skeleton className="h-2.5 w-16 motion-reduce:animate-none" />
        </dd>
      </div>
    );
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-r px-3 py-3 last:border-r-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1 text-lg font-semibold tabular-nums">
        {flame && (
          <Flame className="size-4 text-orange-500" aria-hidden="true" />
        )}
        {value}
      </dd>
      <dd className="truncate text-xs text-muted-foreground" title={hint}>
        {hint}
      </dd>
    </div>
  );
}

function RingSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid size-12 shrink-0 animate-pulse place-items-center rounded-full border-[5px] border-muted motion-reduce:animate-none @4xl:size-28 @4xl:border-[11px]"
    >
      <span className="h-3 w-5 rounded-sm bg-muted @4xl:h-5 @4xl:w-10" />
    </div>
  );
}

function ChecklistRowSkeleton({ width, delay }: { width: string; delay: number }) {
  const style = { animationDelay: delay + "ms" };
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <Skeleton style={style} className="size-8 shrink-0 rounded-lg motion-reduce:animate-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton style={style} className={cn("h-3.5 max-w-full motion-reduce:animate-none", width)} />
        <Skeleton style={style} className="h-2.5 w-16 motion-reduce:animate-none" />
      </div>
      <Skeleton style={style} className="size-6 shrink-0 rounded-full motion-reduce:animate-none" />
    </div>
  );
}
