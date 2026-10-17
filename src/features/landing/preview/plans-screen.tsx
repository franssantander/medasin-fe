"use client";

import { Bell, CalendarClock, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLAN_ACCENTS } from "@/features/plans/plan-accent";
import {
  dayGroupLabel,
  formatPlanTime,
  localDateKey,
  planAccent,
  planDayKey,
  reminderLabel,
} from "@/features/plans/plan-time";
import type { CalendarPlan } from "@/features/plans/type";
import { cn } from "@/lib/utils";
import { buildPreviewPlans } from "./preview-fixtures";
import { PreviewPageHeader } from "./preview-page-header";

const MAX_EVENTS = 3;

/** FullCalendar's compact month-view times: "9a", "7:30a", "2p". */
function compactTime(plan: CalendarPlan) {
  const start = new Date(plan.starts_at);
  const hour = start.getHours() % 12 || 12;
  const minutes = start.getMinutes() ? `:${String(start.getMinutes()).padStart(2, "0")}` : "";
  return `${hour}${minutes}${start.getHours() < 12 ? "a" : "p"}`;
}

function monthWeeks(now: Date) {
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12);
  const days: Date[] = [];
  for (const day = new Date(start); day <= last || day.getDay() !== 0; day.setDate(day.getDate() + 1)) {
    days.push(new Date(day));
  }
  return Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));
}

// plans-page.tsx: a static month grid in the style of plans-calendar.tsx (so FullCalendar stays off the landing page)
// beside upcoming-plans.tsx. Dates come from the viewer's clock, so this renders in the browser.
export default function PlansScreen() {
  const [now] = useState(() => new Date());
  const plans = useMemo(() => buildPreviewPlans(now), [now]);
  const weeks = useMemo(() => monthWeeks(now), [now]);
  const todayKey = localDateKey(now);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarPlan[]>();
    plans.forEach((plan) => map.set(planDayKey(plan), [...(map.get(planDayKey(plan)) ?? []), plan]));
    return map;
  }, [plans]);
  const upcoming = useMemo(
    () => [...byDay.entries()].filter(([day]) => day >= todayKey).sort(([a], [b]) => a.localeCompare(b)),
    [byDay, todayKey],
  );
  const upcomingCount = upcoming.reduce((sum, [, dayPlans]) => sum + dayPlans.length, 0);
  const title = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now);
  const weekdays = weeks[0].map((day) => new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day));

  return (
    <div className="grid min-w-0 gap-6">
      <PreviewPageHeader
        title="Plans"
        description="See what is ahead and make space for what matters."
        action={
          <Button>
            <Plus data-icon="inline-start" /> New plan
          </Button>
        }
      />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        {/* A month grid is unreadable on a phone, so phones get only the upcoming list, like the app's agenda start. */}
        <section className="hidden min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs sm:block">
          <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="outline" size="icon-sm">
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon-sm">
                  <ChevronRight />
                </Button>
              </div>
              <p className="min-w-0 truncate text-base font-semibold">{title}</p>
              <Button variant="outline" size="sm" className="ml-auto sm:ml-1">
                Today
              </Button>
            </div>
            <Tabs value="Month">
              <TabsList className="w-full sm:w-auto">
                {["Month", "Week", "Day", "Agenda"].map((view) => (
                  <TabsTrigger key={view} value={view}>
                    {view}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
            {weekdays.map((weekday) => (
              <span key={weekday} className="border-l border-border/80 py-2 text-center first:border-l-0">
                {weekday}
              </span>
            ))}
          </div>
          <div className="grid">
            {weeks.map((week) => (
              <div key={localDateKey(week[0])} className="grid grid-cols-7 border-b border-border/80 last:border-b-0">
                {week.map((day) => {
                  const key = localDateKey(day);
                  const dayPlans = byDay.get(key) ?? [];
                  const outside = day.getMonth() !== now.getMonth();
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex min-h-24 min-w-0 flex-col gap-0.5 border-l border-border/80 p-1 first:border-l-0",
                        outside && "bg-muted/45",
                      )}
                    >
                      <span
                        className={cn(
                          "ml-auto grid size-6 place-items-center rounded-full text-xs tabular-nums",
                          key === todayKey ? "bg-primary font-semibold text-primary-foreground" : outside && "text-muted-foreground",
                        )}
                      >
                        {day.getDate()}
                      </span>
                      {dayPlans.slice(0, MAX_EVENTS).map((plan) => (
                        <span
                          key={plan.uuid}
                          className="truncate rounded-sm px-1.5 py-0.5 text-[11px] leading-4 text-foreground"
                          style={{ backgroundColor: PLAN_ACCENTS[planAccent(plan)].eventColor }}
                        >
                          {!plan.is_all_day && <span className="mr-1 font-medium">{compactTime(plan)}</span>}
                          {plan.title}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <Card className="gap-0 self-start overflow-hidden py-0">
          <CardHeader className="gap-1 border-b px-4 py-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="size-4 text-muted-foreground" />
              Upcoming
              <Badge variant="secondary" className="ml-auto tabular-nums">
                {upcomingCount}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">Your next plans and reminders.</CardDescription>
          </CardHeader>
          <div>
            {upcoming.map(([day, dayPlans]) => (
              <div key={day} className="grid gap-1 px-2 py-3 [&+&]:border-t">
                <p
                  className={cn(
                    "px-2 pb-1 text-xs font-medium",
                    day === todayKey ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {dayGroupLabel(day, todayKey)}
                </p>
                {dayPlans.map((plan) => {
                  const accent = PLAN_ACCENTS[planAccent(plan)];
                  const link = plan.project ?? plan.area;
                  return (
                    <div key={plan.uuid} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 rounded-lg px-2 py-2">
                      <span className="flex items-start gap-2 pt-px text-xs text-muted-foreground tabular-nums">
                        <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", accent.dotClass)} />
                        {formatPlanTime(plan)}
                      </span>
                      <span className="grid min-w-0 gap-1">
                        <span className="line-clamp-2 text-sm leading-snug font-medium">{plan.title}</span>
                        {(link || plan.reminder_status !== "none") && (
                          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {link && (
                              <span className="flex min-w-0 items-center gap-1">
                                <accent.icon className="size-3 shrink-0" />
                                <span className="truncate">{link.name}</span>
                              </span>
                            )}
                            {plan.reminder_status !== "none" && (
                              <span className="flex items-center gap-1">
                                <Bell className="size-3 shrink-0" />
                                {reminderLabel(plan, now)}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
