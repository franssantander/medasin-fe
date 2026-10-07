"use client";

import { useEffect, useRef } from "react";
import type {
  Habit,
  HabitCalendarColumn,
  HabitCalendarView,
  HabitCheckIn,
  PendingHabitCheckIn,
} from "../type";
import { useHabitCalendarState } from "../hooks/use-habit-calendar";
import { HabitCalendarHeader } from "./habit-calendar-header";
import { HabitCalendarRow } from "./habit-calendar-row";

export function HabitCalendar({
  habits,
  checkIns,
  columns,
  view,
  rangeKey,
  pending,
  pendingCheckIn,
  onCheckIn,
  onOpenMonth,
  onEdit,
  onDelete,
}: {
  habits: Habit[];
  checkIns: Record<string, HabitCheckIn[]>;
  columns: HabitCalendarColumn[];
  view: HabitCalendarView;
  rangeKey: string;
  pending: boolean;
  pendingCheckIn?: PendingHabitCheckIn;
  onCheckIn: (habitUuid: string, date: string, completed: boolean) => void;
  onOpenMonth: (date: Date) => void;
  onEdit: (habit: Habit, opener: HTMLElement | null) => void;
  onDelete: (habit: Habit, opener: HTMLElement | null) => void;
}) {
  const { today, gridStyle, entryMaps } = useHabitCalendarState({
    columns,
    checkIns,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      scroller.scrollTop = 0;
      const current = scroller.querySelector<HTMLElement>(
        '[aria-current="date"]',
      );
      const identity = scroller.querySelector<HTMLElement>(
        '[role="columnheader"]',
      );
      if (!current?.offsetWidth || !identity) {
        scroller.scrollLeft = 0;
        return;
      }
      const labelWidth = identity.offsetWidth;
      const currentLeft =
        scroller.scrollLeft +
        current.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left;
      scroller.scrollLeft = Math.max(
        0,
        currentLeft -
          labelWidth -
          (scroller.clientWidth - labelWidth - current.offsetWidth) / 2,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [rangeKey]);

  return (
    <div
      ref={scrollRef}
      className="habit-calendar-scroll workspace-list-scrollbar min-w-0 overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      role="region"
      aria-label="Habit calendar"
      tabIndex={0}
    >
      <div
        className="habit-calendar-table w-full"
        role="table"
        aria-label="Habit check-in history"
        data-view={view}
        style={gridStyle}
      >
        <HabitCalendarHeader columns={columns} today={today} />
        <div role="rowgroup">
          {habits.map((habit) => (
            <HabitCalendarRow
              key={habit.uuid}
              habit={habit}
              entries={entryMaps.get(habit.uuid)}
              columns={columns}
              today={today}
              pending={pending}
              pendingCheckIn={pendingCheckIn}
              onCheckIn={onCheckIn}
              onOpenMonth={onOpenMonth}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
