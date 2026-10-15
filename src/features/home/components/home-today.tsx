"use client";

import { ArrowRight, Circle, Plus, RefreshCw, Timer } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFocusCountdown,
  useFocusSession,
} from "@/features/focus/providers/focus-session-provider";
import type { FocusSessionType } from "@/features/focus/type";
import {
  dayGroupLabel,
  formatPlanTime,
  localDateKey,
  planDayKey,
} from "@/features/plans/plan-time";
import { useUpcomingPlansQuery } from "@/features/plans/queries/plan-query";
import { cn } from "@/lib/utils";

const sessionLabels: Record<FocusSessionType, string> = {
  focus: "Focus session",
  short_break: "Short break",
  long_break: "Long break",
};

function formatFocusedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function PanelHeading({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <Link
        href={href}
        aria-label={label}
        className="-my-2 inline-flex min-h-9 items-center gap-1 rounded-md px-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        Open
        <ArrowRight className="size-3" aria-hidden="true" />
      </Link>
    </div>
  );
}

function UpNext({ timezone }: { timezone: string }) {
  const query = useUpcomingPlansQuery(timezone);
  const plans = Array.isArray(query.data?.data) ? query.data.data.slice(0, 4) : [];
  const todayKey = localDateKey(new Date());

  return (
    <div className="grid min-w-0 content-start gap-3 p-4 sm:p-5">
      <PanelHeading title="Up next" href="/plans" label="Open plans" />
      {query.isLoading ? (
        <div className="grid gap-2" aria-hidden="true">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : query.isError ? (
        <div className="grid justify-items-start gap-2">
          <p className="text-sm text-muted-foreground">Plans could not be loaded.</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Retry plans
          </Button>
        </div>
      ) : plans.length ? (
        <ul className="-mx-2 grid min-w-0 gap-0.5">
          {plans.map((plan) => {
            const day = planDayKey(plan);
            const isToday = day === todayKey;
            return (
              <li key={plan.uuid} className="min-w-0">
                <Link
                  href={`/plans?plan=${encodeURIComponent(plan.uuid)}`}
                  className="grid min-h-11 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  <span className="grid text-xs leading-4 tabular-nums">
                    <span className={cn(isToday ? "text-foreground" : "text-muted-foreground")}>
                      {formatPlanTime(plan)}
                    </span>
                    {!isToday && (
                      <span className="truncate text-muted-foreground">{dayGroupLabel(day, todayKey)}</span>
                    )}
                  </span>
                  <span className="truncate text-sm font-medium" title={plan.title}>
                    {plan.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="grid justify-items-start gap-2">
          <p className="text-sm text-muted-foreground">Nothing scheduled. Your day is open.</p>
          <Link
            href="/plans"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-medium transition-colors hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add a plan
          </Link>
        </div>
      )}
    </div>
  );
}

function ActiveSessionCountdown() {
  const { remaining } = useFocusCountdown();
  return <span className="tabular-nums">{formatCountdown(remaining)}</span>;
}

function FocusToday() {
  const flow = useFocusSession();
  const data = flow.data && !Array.isArray(flow.data) ? flow.data : null;
  const session = flow.activeSession;
  const tasks = (data?.tasks ?? []).filter((task) => !task.completed_at).slice(0, 3);

  return (
    <div className="grid min-w-0 content-start gap-3 p-4 sm:p-5">
      <PanelHeading title="Focus" href="/focus" label="Open focus" />
      {session ? (
        <Link
          href="/focus"
          className="flex min-w-0 items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
            {session.status === "running" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60 motion-reduce:animate-none" />
            )}
            <span
              className={cn(
                "relative size-2.5 rounded-full",
                session.status === "running" ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
          </span>
          <span className="grid min-w-0 flex-1">
            <span className="text-xs text-muted-foreground">
              {sessionLabels[session.type]}
              {session.status === "paused" && " · Paused"}
            </span>
            <span className="truncate text-sm font-medium">
              {session.task?.title ?? "No task linked"}
            </span>
          </span>
          <span className="text-lg font-semibold">
            <ActiveSessionCountdown />
          </span>
        </Link>
      ) : (
        <p className="flex items-baseline gap-2">
          <span className="text-2xl leading-none font-semibold tabular-nums">
            {formatFocusedTime(data?.today.focused_seconds ?? 0)}
          </span>
          <span className="text-xs text-muted-foreground">
            focused today · {data?.today.completed_focus_sessions ?? 0}{" "}
            {data?.today.completed_focus_sessions === 1 ? "session" : "sessions"}
          </span>
        </p>
      )}
      {tasks.length ? (
        <ul className="grid gap-1.5" aria-label="Next focus tasks">
          {tasks.map((task) => (
            <li key={task.uuid} className="flex min-w-0 items-center gap-2 text-sm">
              <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate" title={task.title}>{task.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        !session && (
          <Link
            href="/focus"
            className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-md text-sm font-medium transition-colors hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Timer className="size-4" aria-hidden="true" />
            Start a session
          </Link>
        )
      )}
    </div>
  );
}

export function TodayPanel({ timezone }: { timezone: string | null }) {
  return (
    <section aria-labelledby="home-today" className="grid min-w-0 gap-3">
      <h2 id="home-today" className="text-sm font-semibold">Today</h2>
      <Card className="gap-0 py-0">
        <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          {timezone ? (
            <UpNext timezone={timezone} />
          ) : (
            <div className="grid gap-3 p-4 sm:p-5" aria-hidden="true">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}
          <FocusToday />
        </div>
      </Card>
    </section>
  );
}
