"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HabitCalendar } from "@/features/habits/components/habit-calendar";
import { HabitCalendarFooter } from "@/features/habits/components/habit-calendar-footer";
import {
  checkInMap,
  getCalendarColumns,
  getCalendarRange,
  getStreaks,
  isScheduled,
  localDate,
  startOfDay,
} from "@/features/habits/components/habit-calendar-utils";
import { HabitTodayPanel } from "@/features/habits/components/habit-today-panel";
import { HabitToolbar } from "@/features/habits/components/habit-toolbar";
import type { HabitInsights, HabitStreak } from "@/features/habits/hooks/use-habit-insights";
import { useHabitWorkspace } from "@/features/habits/hooks/use-habit-workspace";
import { PreviewPageHeader } from "./preview-page-header";
import { buildPreviewHabits } from "./preview-fixtures";

const noop = () => {};

// The real habits-page.tsx layout and components, fed sample habits dated around today.
// Only rendered in the browser (the preview mounts this screen on demand).
export default function HabitsScreen() {
  const [now] = useState(() => new Date());
  const { habits, checkIns } = useMemo(() => buildPreviewHabits(now), [now]);
  const range = useMemo(() => getCalendarRange("week", now, habits), [habits, now]);
  const columns = useMemo(() => getCalendarColumns(range), [range]);
  const workspace = useHabitWorkspace(habits, checkIns, columns);
  const insights = useMemo(() => buildInsights(habits, checkIns, now), [checkIns, habits, now]);

  return (
    <div className="habits-workspace @container mx-auto flex w-full max-w-[110rem] min-w-0 flex-col gap-4">
      <div className="shrink-0">
        <PreviewPageHeader
          title="Habits"
          description="Small actions, a little more consistent every day."
          action={
            <Button>
              <Plus data-icon="inline-start" />
              Add habit
            </Button>
          }
        />
      </div>
      <div className="habits-layout flex min-h-0 min-w-0 flex-1 flex-col gap-4 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:grid-rows-[minmax(0,1fr)]">
        <Card className="habits-workspace-card min-w-0 gap-0 py-0">
          <HabitToolbar
            view="week"
            range={range}
            workspace={workspace}
            loading={false}
            refreshing={false}
            onViewChange={noop}
            onShift={noop}
            onToday={noop}
          />
          <div className="flex min-h-0 flex-1 flex-col border-t">
            <HabitCalendar
              habits={workspace.filteredHabits}
              checkIns={checkIns}
              columns={columns}
              view="week"
              rangeKey={"week" + range.startDate + range.endDate}
              streaks={insights.streaks}
              pending={false}
              onCheckIn={noop}
              onOpenMonth={noop}
              onEdit={noop}
              onDelete={noop}
            />
          </div>
          <HabitCalendarFooter summary={workspace.summary} loading={false} showSummary />
        </Card>
        <HabitTodayPanel insights={insights} loading={false} pending={false} onCheckIn={noop} />
      </div>
    </div>
  );
}

// Same numbers useHabitInsights derives, computed from the sample history instead of a query.
function buildInsights(
  habits: ReturnType<typeof buildPreviewHabits>["habits"],
  checkIns: ReturnType<typeof buildPreviewHabits>["checkIns"],
  now: Date,
): HabitInsights {
  const today = startOfDay(now);
  const todayKey = localDate(today);
  const entryMaps = new Map(habits.map((habit) => [habit.uuid, checkInMap(checkIns[habit.uuid])]));
  const streaks = new Map<string, HabitStreak>(
    habits.map((habit) => [habit.uuid, getStreaks(habit, entryMaps.get(habit.uuid)!, today)]),
  );
  const due = habits.filter((habit) => isScheduled(habit, today));
  const isDone = (habit: (typeof habits)[number]) => Boolean(entryMaps.get(habit.uuid)?.get(todayKey)?.completed);

  let topCurrent: HabitInsights["topCurrent"];
  let best = 0;
  for (const habit of habits) {
    const streak = streaks.get(habit.uuid)!;
    best = Math.max(best, streak.best);
    if (streak.current > (topCurrent?.count ?? 0)) topCurrent = { habit, count: streak.current };
  }

  let scheduled = 0;
  let completed = 0;
  for (let offset = -6; offset <= 0; offset += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    for (const habit of habits) {
      if (!isScheduled(habit, date)) continue;
      const entry = entryMaps.get(habit.uuid)?.get(localDate(date));
      if (offset === 0 && !entry?.completed) continue;
      scheduled += 1;
      if (entry?.completed) completed += 1;
    }
  }

  return {
    today,
    todayKey,
    streaks,
    due,
    done: due.filter(isDone).length,
    isDone,
    topCurrent,
    best,
    last7Rate: scheduled ? completed / scheduled : null,
    historyReady: true,
    loading: false,
    failed: false,
  };
}
