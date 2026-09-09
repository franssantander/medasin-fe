"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useHabitHistory } from "../hooks/use-habit-tracker";
import type { Habit } from "../type";
import { DayCell } from "./habit-day-cell";
import {
  calendarCells,
  isScheduled,
  localDate,
  startOfDay,
  weekdayLabels,
} from "./habit-tracker-utils";

export function HabitHistoryDialog({
  open,
  onOpenChange,
  habit,
  archived,
  areaUuid,
  isPending,
  onCheckIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit;
  archived: boolean;
  areaUuid: string;
  isPending: boolean;
  onCheckIn: (date: string, completed: boolean) => void;
}) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState<Date>(today);
  const cells = useMemo(() => calendarCells(month), [month]);
  const historyQuery = useHabitHistory({
    areaUuid,
    habitUuid: habit.uuid,
    startDate: localDate(cells[0]),
    endDate: localDate(cells[cells.length - 1]),
    enabled: open,
  });
  const checkIns = new Map(
    (historyQuery.data?.data.check_ins ?? []).map((item) => [item.date, item]),
  );
  const selectedEligible = selected <= today && isScheduled(habit, selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{habit.name}</DialogTitle>
          <DialogDescription>
            Review scheduled days and correct a Yes or No check-in when needed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeft />
          </Button>
          <p className="font-medium">
            {month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            disabled={
              month.getFullYear() === today.getFullYear() &&
              month.getMonth() >= today.getMonth()
            }
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayLabels.map((label) => (
            <span key={label} className="py-1 text-xs text-muted-foreground">
              {label}
            </span>
          ))}
          {cells.map((date) => (
            <DayCell
              key={localDate(date)}
              date={date}
              habit={habit}
              entry={checkIns.get(localDate(date))}
              today={today}
              outside={date.getMonth() !== month.getMonth()}
              selected={localDate(date) === localDate(selected)}
              onClick={() => setSelected(date)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {selected.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {selected > today
                ? "Future check-ins are disabled."
                : selectedEligible
                  ? "Scheduled check-in"
                  : "Not scheduled"}
            </p>
          </div>
          {!archived && habit.is_active && selectedEligible && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={
                  checkIns.get(localDate(selected))?.completed === true
                    ? "default"
                    : "outline"
                }
                disabled={isPending}
                onClick={() => onCheckIn(localDate(selected), true)}
              >
                <Check />
                Yes
              </Button>
              <Button
                size="sm"
                variant={
                  checkIns.get(localDate(selected))?.completed === false
                    ? "destructive"
                    : "outline"
                }
                disabled={isPending}
                onClick={() => onCheckIn(localDate(selected), false)}
              >
                <X />
                No
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <Legend color="bg-emerald-500" label="Completed" />
          <Legend color="bg-destructive" label="Missed" />
          <Legend color="bg-muted" label="Pending" />
          <Legend color="border bg-background" label="Unscheduled" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", color)} />
      {label}
    </span>
  );
}
