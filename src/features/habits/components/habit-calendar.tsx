"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Habit, HabitCalendarColumn, HabitCheckIn } from "../type";
import { useHabitCalendarState } from "../hooks/use-habit-calendar";
import { HabitCalendarHeader } from "./habit-calendar-header";
import { HabitCalendarRow } from "./habit-calendar-row";

export function HabitCalendar({
  habits,
  checkIns,
  columns,
  loading,
  pending,
  onCheckIn,
  onOpenMonth,
  onEdit,
  onDelete,
}: {
  habits: Habit[];
  checkIns: Record<string, HabitCheckIn[]>;
  columns: HabitCalendarColumn[];
  loading: boolean;
  pending: boolean;
  onCheckIn: (habitUuid: string, date: string, completed: boolean) => void;
  onOpenMonth: (date: Date) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}) {
  const { today, gridStyle, entryMaps } = useHabitCalendarState({
    columns,
    checkIns,
  });

  if (loading) {
    return <Skeleton className="h-[28rem] rounded-xl" />;
  }
  if (habits.length === 0) {
    return null;
  }

  return (
    <Card className="min-w-0 overflow-hidden p-0 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-auto overscroll-contain">
          <div className="min-w-max">
            <HabitCalendarHeader
              columns={columns}
              today={today}
              style={gridStyle}
            />
            {habits.map((habit) => (
              <HabitCalendarRow
                key={habit.uuid}
                habit={habit}
                entries={entryMaps.get(habit.uuid)}
                columns={columns}
                today={today}
                gridStyle={gridStyle}
                pending={pending}
                onCheckIn={onCheckIn}
                onOpenMonth={onOpenMonth}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
