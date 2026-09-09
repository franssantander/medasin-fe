"use client";

import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  Ellipsis,
  Flame,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useHabitCheckIn, useHabitHistory } from "../hooks/use-habit-tracker";
import type { Habit } from "../type";
import { AreaIcon } from "./area-icons";
import { DayCell } from "./habit-day-cell";
import { HabitHistoryDialog } from "./habit-history-dialog";
import {
  addDays,
  completionRate,
  isScheduled,
  localDate,
  scheduleLabel,
  startOfDay,
  weekdayLabels,
} from "./habit-tracker-utils";

export function HabitCard({
  habit,
  archived,
  areaUuid,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  archived: boolean;
  areaUuid: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -89);
  const historyQuery = useHabitHistory({
    areaUuid,
    habitUuid: habit.uuid,
    startDate: localDate(rangeStart),
    endDate: localDate(today),
  });
  const checkIn = useHabitCheckIn({
    areaUuid,
    habitUuid: habit.uuid,
  });
  const history = historyQuery.data?.data;
  const weekStart = addDays(today, -today.getDay());
  const week = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const checkIns = new Map(
    (history?.check_ins ?? []).map((item) => [item.date, item]),
  );
  const todayKey = localDate(today);
  const todayEntry = checkIns.get(todayKey);
  const dueToday = isScheduled(habit, today);
  const rate7 = completionRate(habit, checkIns, addDays(today, -6), today);
  const rate30 = completionRate(habit, checkIns, addDays(today, -29), today);

  return (
    <Card className={cn(!habit.is_active && "opacity-70")}>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AreaIcon name={habit.icon || "Repeat2"} className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate">{habit.name}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {habit.description || scheduleLabel(habit)}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={habit.is_active ? "secondary" : "outline"}>
              {habit.is_active ? scheduleLabel(habit) : "Paused"}
            </Badge>
            {!archived && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Habit actions"
                    />
                  }
                >
                  <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil />
                    Edit habit
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive onClick={onDelete}>
                    <Trash2 />
                    Delete habit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-center">
          <Metric
            label="Current"
            value={`${history?.current_streak ?? 0} days`}
            icon={<Flame className="size-3.5 text-orange-500" />}
          />
          <Metric label="Best" value={`${history?.best_streak ?? 0} days`} />
          <Metric label="30 days" value={`${rate30}%`} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {historyQuery.isLoading ? (
          <Skeleton className="h-16" />
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>This week</span>
              <span>{rate7}% complete</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {week.map((date, index) => (
                <DayCell
                  key={localDate(date)}
                  date={date}
                  habit={habit}
                  entry={checkIns.get(localDate(date))}
                  today={today}
                  compact
                  label={weekdayLabels[index]}
                />
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {!habit.is_active
                ? "Habit is paused"
                : dueToday
                  ? todayEntry?.completed === true
                    ? "Completed today"
                    : todayEntry?.completed === false
                      ? "Marked missed today"
                      : "Ready for today’s check-in?"
                  : "Not scheduled today"}
            </p>
            <p className="text-xs text-muted-foreground">
              {dueToday
                ? "Your answer can be changed later."
                : `Next check-in follows ${scheduleLabel(habit).toLowerCase()}.`}
            </p>
          </div>
          {!archived && habit.is_active && dueToday && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={todayEntry?.completed === true ? "default" : "outline"}
                disabled={checkIn.isPending}
                onClick={() =>
                  checkIn.mutate({ date: todayKey, completed: true })
                }
              >
                <Check />
                Yes
              </Button>
              <Button
                size="sm"
                variant={
                  todayEntry?.completed === false ? "destructive" : "outline"
                }
                disabled={checkIn.isPending}
                onClick={() =>
                  checkIn.mutate({ date: todayKey, completed: false })
                }
              >
                <X />
                No
              </Button>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => setHistoryOpen(true)}
        >
          <CalendarDays />
          Open calendar history
        </Button>
      </CardContent>
      <HabitHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        habit={habit}
        archived={archived}
        areaUuid={areaUuid}
        isPending={checkIn.isPending}
        onCheckIn={(date, completed) => checkIn.mutate({ date, completed })}
      />
    </Card>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1 text-sm font-semibold">
        {icon}
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
