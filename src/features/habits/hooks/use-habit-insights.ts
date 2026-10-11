"use client";

import { useMemo, useState } from "react";
import { useHabitCalendarQuery } from "../queries/habit-query";
import type { Habit, HabitCheckIn } from "../type";
import {
  addDays,
  checkInMap,
  getCalendarRange,
  getStreaks,
  isScheduled,
  localDate,
  startOfDay,
} from "../components/habit-calendar-utils";

export type HabitStreak = { current: number; best: number };

// Streaks need the whole history, so it loads in the background once the
// visible range is ready. It shares its cache with the "All time" view.
export function useHabitInsights({
  habits,
  rangeCheckIns,
  enabled,
}: {
  habits: Habit[];
  rangeCheckIns: Record<string, HabitCheckIn[]>;
  enabled: boolean;
}) {
  const [today] = useState(() => startOfDay(new Date()));
  const historyRange = useMemo(
    () => getCalendarRange("all", today, habits),
    [habits, today],
  );
  const historyQuery = useHabitCalendarQuery(historyRange, enabled);
  const history = historyQuery.data?.data.check_ins;

  return useMemo(() => {
    const entryMaps = new Map<string, Map<string, HabitCheckIn>>();
    for (const habit of habits) {
      const entries = checkInMap(history?.[habit.uuid]);
      for (const entry of rangeCheckIns[habit.uuid] ?? [])
        entries.set(entry.date, entry);
      entryMaps.set(habit.uuid, entries);
    }

    const streaks = new Map<string, HabitStreak>();
    if (history)
      for (const habit of habits)
        streaks.set(
          habit.uuid,
          getStreaks(habit, entryMaps.get(habit.uuid)!, today),
        );

    const todayKey = localDate(today);
    const due = habits.filter((habit) => isScheduled(habit, today));
    const done = due.filter(
      (habit) => entryMaps.get(habit.uuid)?.get(todayKey)?.completed,
    ).length;

    let topCurrent: { habit: Habit; count: number } | undefined;
    let best = 0;
    for (const habit of habits) {
      const streak = streaks.get(habit.uuid);
      if (!streak) continue;
      best = Math.max(best, streak.best);
      if (streak.current > (topCurrent?.count ?? 0))
        topCurrent = { habit, count: streak.current };
    }

    let scheduled = 0;
    let completed = 0;
    for (let offset = -6; offset <= 0; offset += 1) {
      const date = addDays(today, offset);
      for (const habit of habits) {
        if (!isScheduled(habit, date)) continue;
        const entry = entryMaps.get(habit.uuid)?.get(localDate(date));
        // Today only counts once it is done, so the rate never dips mid-day.
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
      done,
      isDone: (habit: Habit) =>
        Boolean(entryMaps.get(habit.uuid)?.get(todayKey)?.completed),
      topCurrent,
      best,
      last7Rate: scheduled ? completed / scheduled : null,
      historyReady: Boolean(history),
      loading: !history && !historyQuery.isError,
      failed: historyQuery.isError && !history,
    };
  }, [habits, history, historyQuery.isError, rangeCheckIns, today]);
}

export type HabitInsights = ReturnType<typeof useHabitInsights>;
