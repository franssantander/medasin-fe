"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { HabitCalendarColumn, HabitCheckIn } from "../type";
import { checkInMap, startOfDay } from "../components/habit-calendar-utils";

export function useHabitCalendarState({
  columns,
  checkIns,
}: {
  columns: HabitCalendarColumn[];
  checkIns: Record<string, HabitCheckIn[]>;
}) {
  const [today] = useState(() => startOfDay(new Date()));
  const gridStyle = useMemo(
    () => ({ "--habit-columns": columns.length } as CSSProperties),
    [columns.length],
  );
  const entryMaps = useMemo(
    () =>
      new Map(
        Object.entries(checkIns).map(([habitUuid, entries]) => [
          habitUuid,
          checkInMap(entries),
        ]),
      ),
    [checkIns],
  );

  return { today, gridStyle, entryMaps };
}
