"use client";

import { CalendarClock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingPlansQuery } from "../queries/plan-query";
import { formatPlanWhen, reminderLabel } from "../plan-time";

export function UpcomingPlans({
  timezone,
  onOpenPlan,
}: {
  timezone: string;
  onOpenPlan: (uuid: string) => void;
}) {
  const query = useUpcomingPlansQuery(timezone);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const plans = query.data?.data ?? [];

  return (
    <Card className="gap-0 py-0 lg:sticky lg:top-0 lg:self-start">
      <CardHeader className="border-b py-5">
        <CardTitle className="flex items-center gap-2"><CalendarClock className="size-4" aria-hidden="true" /> Upcoming</CardTitle>
        <CardDescription>Your next plans and reminder status.</CardDescription>
      </CardHeader>
      {query.isLoading ? (
        <CardContent className="gap-3 py-5">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 rounded-lg" />)}
        </CardContent>
      ) : query.isError ? (
        <CardContent className="items-start py-6">
          <p className="text-sm text-destructive">Upcoming plans could not be loaded.</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}><RefreshCw /> Try again</Button>
        </CardContent>
      ) : plans.length === 0 ? (
        <CardContent className="items-center py-10 text-center">
          <CalendarClock className="size-7 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Nothing coming up</p>
          <p className="text-sm text-muted-foreground">Plans you add will appear here.</p>
        </CardContent>
      ) : (
        <div className="max-h-[42rem] divide-y overflow-y-auto">
          {plans.map((plan) => (
            <button
              key={plan.uuid}
              type="button"
              onClick={() => onOpenPlan(plan.uuid)}
              className="flex w-full flex-col gap-1 px-6 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              aria-label={`Open ${plan.title}, ${formatPlanWhen(plan)}`}
            >
              <span className="line-clamp-2 font-medium">{plan.title}</span>
              <span className="text-xs text-muted-foreground">{formatPlanWhen(plan)}</span>
              <span className="text-xs font-medium text-foreground/80">{reminderLabel(plan, now)}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
