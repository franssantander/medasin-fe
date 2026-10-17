"use client";

import { Bell, CalendarClock, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { PLAN_ACCENTS } from "../plan-accent";
import {
  dayGroupLabel,
  formatPlanTime,
  formatPlanWhen,
  localDateKey,
  planAccent,
  planDayKey,
  reminderLabel,
} from "../plan-time";
import { useUpcomingPlansQuery } from "../queries/plan-query";
import type { CalendarPlan } from "../type";
import { UpcomingPlansSkeleton } from "./plans-skeletons";

export function UpcomingPlans({
  timezone,
  onOpenPlan,
  onCreate,
}: {
  timezone: string;
  onOpenPlan: (uuid: string) => void;
  onCreate: () => void;
}) {
  const query = useUpcomingPlansQuery(timezone);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const plans = useMemo(() => query.data?.data ?? [], [query.data]);
  const todayKey = localDateKey(now);
  const groups = useMemo(() => {
    const byDay = new Map<string, CalendarPlan[]>();
    plans.forEach((plan) => {
      const key = planDayKey(plan);
      byDay.set(key, [...(byDay.get(key) ?? []), plan]);
    });
    return [...byDay.entries()];
  }, [plans]);

  return (
    <Card className="gap-0 overflow-hidden py-0 lg:sticky lg:top-0 lg:self-start">
      <CardHeader className="gap-1 border-b px-4 py-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
          Upcoming
          {plans.length > 0 && (
            <Badge variant="secondary" className="ml-auto tabular-nums">{plans.length}</Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">Your next plans and reminders.</CardDescription>
      </CardHeader>

      {query.isLoading ? (
        <UpcomingPlansSkeleton />
      ) : query.isError ? (
        <div className="grid justify-items-start gap-3 p-4">
          <p className="text-sm text-destructive">Upcoming plans could not be loaded.</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw data-icon="inline-start" /> Try again
          </Button>
        </div>
      ) : plans.length === 0 ? (
        <Empty className="border-0 px-4 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarClock /></EmptyMedia>
            <EmptyTitle>Nothing coming up</EmptyTitle>
            <EmptyDescription>Plans you add will appear here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline" onClick={onCreate}>
              <Plus data-icon="inline-start" /> Add a plan
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="workspace-list-scrollbar max-h-[42rem] overflow-y-auto">
          {groups.map(([day, dayPlans]) => (
            <section key={day} aria-label={dayGroupLabel(day, todayKey)} className="grid gap-1 px-2 py-3 [&+&]:border-t">
              <h3 className={cn(
                "px-2 pb-1 text-xs font-medium",
                day === todayKey ? "text-foreground" : "text-muted-foreground",
              )}>
                {dayGroupLabel(day, todayKey)}
              </h3>
              {dayPlans.map((plan) => (
                <UpcomingRow key={plan.uuid} plan={plan} now={now} onOpen={() => onOpenPlan(plan.uuid)} />
              ))}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

function UpcomingRow({ plan, now, onOpen }: { plan: CalendarPlan; now: Date; onOpen: () => void }) {
  const accent = PLAN_ACCENTS[planAccent(plan)];
  const link = plan.project ?? plan.area;
  const LinkIcon = accent.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Open ${plan.title}, ${formatPlanWhen(plan)}`}
    >
      <span className="flex items-start gap-2 pt-px text-xs text-muted-foreground tabular-nums">
        <span aria-hidden="true" className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", accent.dotClass)} />
        {formatPlanTime(plan)}
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="line-clamp-2 text-sm leading-snug font-medium">{plan.title}</span>
        {(link || plan.reminder_status !== "none") && (
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {link && (
              <span className="flex min-w-0 items-center gap-1">
                <LinkIcon className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{link.name}</span>
              </span>
            )}
            {plan.reminder_status !== "none" && (
              <span className="flex items-center gap-1">
                <Bell className="size-3 shrink-0" aria-hidden="true" />
                {reminderLabel(plan, now)}
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}
