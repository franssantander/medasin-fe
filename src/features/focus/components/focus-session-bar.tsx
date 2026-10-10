"use client";

import { ArrowUpRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCountdown, phaseLabels, phaseMeta } from "../lib/focus-utils";
import { useFocusCountdown, useFocusSession } from "../providers/focus-session-provider";

export function FocusSessionBar({ pathname }: { pathname: string }) {
  const flow = useFocusSession();
  const countdown = useFocusCountdown();
  const { timerSession: session, completion, completionFailure, requestError, pending } = flow;
  if (pathname === "/focus" || (!session && !completion && !completionFailure)) return null;

  const completedSession = completion?.session ?? completionFailure?.session;
  const type = session?.type ?? completedSession?.type ?? "focus";
  const title = session?.task?.title ?? completedSession?.task?.title ?? phaseLabels[type];
  const review = Boolean(completion || completionFailure);
  const status = completionFailure ? "Needs attention" : completion ? "Complete"
    : session?.status === "paused" ? "Paused" : countdown.remaining === 0 ? "Finishing…" : "Running";
  const error = completionFailure?.message ?? requestError?.message;
  const meta = phaseMeta[type];

  return (
    <section aria-label="Focus session" className="relative flex shrink-0 flex-col gap-2 border-b bg-background px-4 py-3 sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className={cn("hidden size-8 shrink-0 place-items-center rounded-lg sm:grid", meta.chip)} aria-hidden="true"><meta.icon className="size-4" /></span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-sm font-medium" title={title}>{title}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="hidden text-xs text-muted-foreground sm:inline">{phaseLabels[type]}</span>
              <Badge variant="secondary" className="max-w-full truncate">{status}</Badge>
              {!review && <span role="timer" aria-live="off" aria-label={`${phaseLabels[type]}, ${formatCountdown(countdown.remaining)} remaining`} className="shrink-0 text-xs font-medium tabular-nums">{formatCountdown(countdown.remaining)}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session && !review && (
            <Button variant="outline" size="sm" disabled={pending || countdown.remaining === 0} onClick={() => void flow.runAction(session.status === "paused" ? "resume" : "pause")}>
              {session.status === "paused" ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
              {session.status === "paused" ? "Resume" : "Pause"}
            </Button>
          )}
          <Link href="/focus" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {review ? "Review session" : "Open Focus"}<ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" disabled={pending} onClick={completionFailure ? flow.retryCompletion : flow.retryAction}>
              {completionFailure ? "Retry completion" : "Try again"}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {flow.dashboard.isError && !error && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>The timer is still shown, but could not be refreshed.</span>
            <Button variant="outline" size="sm" disabled={flow.dashboard.isFetching} onClick={() => void flow.dashboard.refetch()}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      {!review && session && (
        <Progress
          value={Math.round(countdown.progress * 100)}
          aria-label={phaseLabels[type] + " progress"}
          className="absolute inset-x-0 -bottom-px h-0.5 [&_[data-slot=progress-track]]:rounded-none [&_[data-slot=progress-track]]:bg-transparent"
        />
      )}
    </section>
  );
}
