"use client";

import { useMemo, useState } from "react";
import type {
  Habit,
  HabitCalendarColumn,
  HabitCheckIn,
  HabitStatusFilter,
} from "../type";
import {
  aggregateMonth,
  checkInMap,
  isScheduled,
  startOfDay,
} from "../components/habit-calendar-utils";

export function useHabitWorkspace(
  habits: Habit[],
  checkIns: Record<string, HabitCheckIn[]>,
  columns: HabitCalendarColumn[],
) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<HabitStatusFilter>("all");
  const [area, setArea] = useState("all");
  const areaOptions = useMemo(
    () => [
      { value: "all", label: "All Areas" },
      { value: "unassigned", label: "Unassigned" },
      ...Array.from(
        new Map(
          habits.flatMap((habit) =>
            habit.area ? [[habit.area.uuid, habit.area.name] as const] : [],
          ),
        ).entries(),
      )
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    ],
    [habits],
  );
  const filteredHabits = useMemo(() => {
    const query = search.trim().toLowerCase();
    return habits.filter(
      (habit) =>
        (!query ||
          [habit.name, habit.area?.name].some((value) =>
            value?.toLowerCase().includes(query),
          )) &&
        (status === "all" || habit.is_active === (status === "active")) &&
        (area === "all" ||
          (area === "unassigned" ? !habit.area : habit.area?.uuid === area)),
    );
  }, [area, habits, search, status]);
  const summary = useMemo(() => {
    const today = startOfDay(new Date());
    let scheduled = 0;
    let completed = 0;
    for (const habit of filteredHabits) {
      if (!habit.is_active) continue;
      const entries = checkInMap(checkIns[habit.uuid]);
      for (const column of columns) {
        if (column.aggregate) {
          const month = aggregateMonth(habit, entries, column.date, today);
          scheduled += month.scheduled;
          completed += month.completed;
        } else if (column.date <= today && isScheduled(habit, column.date)) {
          scheduled += 1;
          if (entries.get(column.key)?.completed) completed += 1;
        }
      }
    }
    return { scheduled, completed };
  }, [checkIns, columns, filteredHabits]);
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setArea("all");
  };

  return {
    search,
    setSearch,
    status,
    setStatus,
    area,
    setArea,
    areaOptions,
    filteredHabits,
    summary,
    clearFilters,
    hasFilters: Boolean(search || status !== "all" || area !== "all"),
  };
}
