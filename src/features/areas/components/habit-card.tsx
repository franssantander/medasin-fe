"use client";

import { useState } from "react";
import {
  CalendarDays,
  Check,
  Ellipsis,
  Flame,
  History,
  LoaderCircle,
  Moon,
  Pause,
  Pencil,
  Repeat,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  habitHistoryRange,
  useHabitCheckIn,
  useHabitHistory,
} from "../hooks/use-habit-tracker";
import type { Habit } from "../type";
import { AreaIcon } from "./area-icons";
import { HabitHistorySkeleton } from "./area-skeletons";
import { HabitHeatmap } from "./habit-heatmap";
import { HabitHistoryDialog } from "./habit-history-dialog";
import {
  addDays,
  completionRate,
  dayState,
  dayStateLabels,
  localDate,
  scheduleLabel,
  startOfDay,
  streakLabel,
  weekdayLabels,
  type HabitDayState,
} from "./habit-tracker-utils";

const longDayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const weekCellClassNames: Record<HabitDayState, string> = {
  done: "border-emerald-500 bg-emerald-500 text-white",
  missed: "border-destructive/30 bg-destructive/10 text-destructive",
  skipped: "border-border bg-muted text-muted-foreground",
  due: "border-2 border-primary text-primary",
  upcoming: "border-dashed border-muted-foreground/40 text-muted-foreground",
  rest: "border-transparent text-muted-foreground/40",
};

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
  const historyQuery = useHabitHistory({
    areaUuid,
    habitUuid: habit.uuid,
    ...habitHistoryRange(today),
  });
  const checkIn = useHabitCheckIn({ areaUuid, habitUuid: habit.uuid });
  const history = historyQuery.data?.data;
  const checkIns = new Map(
    (history?.check_ins ?? []).map((item) => [item.date, item]),
  );
  const todayKey = localDate(today);
  const todayState = dayState(habit, today, checkIns.get(todayKey), today);
  const weekStart = addDays(today, -today.getDay());
  const week = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const rate7 = completionRate(habit, checkIns, weekStart, today);
  const rate30 = completionRate(habit, checkIns, addDays(today, -29), today);
  const currentStreak = history?.current_streak ?? 0;
  const bestStreak = history?.best_streak ?? 0;
  const canCheckIn = !archived && habit.is_active && Boolean(history);
  const pendingDate = checkIn.isPending ? checkIn.variables?.date : undefined;

  const toggleDay = (date: Date, state: HabitDayState) =>
    checkIn.mutate({ date: localDate(date), completed: state !== "done" });

  return (
    <Card className={cn("gap-0 py-0", !habit.is_active && "bg-muted/30")}>
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              !habit.is_active
                ? "bg-muted text-muted-foreground"
                : currentStreak > 0
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  : "bg-primary/10 text-primary",
            )}
          >
            <AreaIcon name={habit.icon || "Repeat2"} className="size-5" />
          </div>

          <div className="grid min-w-0 flex-1 gap-1">
            <div className="flex min-w-0 items-center gap-1">
              <h3 className="truncate font-semibold">{habit.name}</h3>
              {!archived && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground"
                        aria-label={`Actions for ${habit.name}`}
                      />
                    }
                  >
                    <Ellipsis />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-44">
                    <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                      <History />
                      View history
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil />
                      Edit habit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onClick={onDelete}>
                      <Trash2 />
                      Delete habit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {habit.description && (
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {habit.description}
              </p>
            )}
            <div>
              {habit.is_active ? (
                <Badge variant="secondary" className="font-normal">
                  <Repeat aria-hidden="true" />
                  {scheduleLabel(habit)}
                </Badge>
              ) : (
                <Badge variant="outline" className="font-normal">
                  <Pause aria-hidden="true" />
                  Paused
                </Badge>
              )}
            </div>
          </div>

          <CheckInButton
            habitName={habit.name}
            state={todayState}
            paused={!habit.is_active}
            disabled={!canCheckIn || checkIn.isPending}
            loading={pendingDate === todayKey}
            onClick={() => toggleDay(today, todayState)}
          />
        </div>

        {historyQuery.isLoading ? (
          <HabitHistorySkeleton />
        ) : historyQuery.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            History couldn&apos;t load.
            <Button variant="outline" size="sm" onClick={() => historyQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2 text-xs">
              <li
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
                  currentStreak > 0
                    ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300"
                    : "text-muted-foreground",
                )}
              >
                <Flame className="size-3.5" aria-hidden="true" />
                {streakLabel(habit, currentStreak)}
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-muted-foreground">
                <Trophy className="size-3.5" aria-hidden="true" />
                Best {bestStreak}
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">{rate30}%</span>
                last 30 days
              </li>
            </ul>

            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>This week</span>
                <span className="tabular-nums">{rate7}%</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {week.map((date, index) => {
                  const state = dayState(habit, date, checkIns.get(localDate(date)), today);
                  const isToday = date.getTime() === today.getTime();
                  const tappable =
                    canCheckIn && date <= today && state !== "rest";
                  const label = `${longDayFormat.format(date)}: ${dayStateLabels[state]}`;
                  return (
                    <div key={localDate(date)} className="flex flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[11px] text-muted-foreground",
                          isToday && "font-semibold text-foreground",
                        )}
                        aria-hidden="true"
                      >
                        {weekdayLabels[index].slice(0, 1)}
                      </span>
                      <button
                        type="button"
                        disabled={!tappable || checkIn.isPending}
                        title={label}
                        aria-label={
                          tappable
                            ? `${label}. Tap to mark ${state === "done" ? "not done" : "done"}`
                            : label
                        }
                        aria-pressed={tappable ? state === "done" : undefined}
                        onClick={() => toggleDay(date, state)}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full border text-xs outline-none transition-[transform,background-color] focus-visible:ring-3 focus-visible:ring-ring/50",
                          weekCellClassNames[state],
                          tappable && "hover:scale-105 active:scale-95 motion-reduce:hover:scale-100",
                          !tappable && "cursor-default",
                        )}
                      >
                        {pendingDate === localDate(date) ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : state === "done" ? (
                          <Check className="size-4 motion-safe:animate-in motion-safe:zoom-in-50" strokeWidth={3} />
                        ) : state === "missed" || state === "skipped" ? (
                          <X className="size-3.5" />
                        ) : state === "rest" ? (
                          <span className="size-1 rounded-full bg-current" />
                        ) : (
                          <span className="tabular-nums">{date.getDate()}</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <HabitHeatmap habit={habit} checkIns={checkIns} today={today} />
          </>
        )}

        <Button
          variant="ghost"
          className="-mx-2.5 justify-self-start text-muted-foreground"
          onClick={() => setHistoryOpen(true)}
        >
          <CalendarDays />
          View full history
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

function CheckInButton({
  habitName,
  state,
  paused,
  disabled,
  loading,
  onClick,
}: {
  habitName: string;
  state: HabitDayState;
  paused: boolean;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const rest = state === "rest";
  const done = state === "done";
  const caption = paused ? "Paused" : rest ? "Rest day" : done ? "Done" : "Today";

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        disabled={disabled || rest}
        aria-pressed={rest || paused ? undefined : done}
        aria-label={
          done ? `Undo today's check-in for ${habitName}` : `Check in ${habitName} for today`
        }
        title={rest ? "Not scheduled today" : undefined}
        onClick={onClick}
        className={cn(
          "flex size-14 items-center justify-center rounded-full border-2 outline-none transition-[transform,background-color,border-color] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed",
          done && "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25",
          state === "skipped" && "border-border bg-muted text-muted-foreground",
          state === "due" && "border-dashed border-primary/50 text-muted-foreground hover:border-primary hover:text-primary",
          (rest || paused) && "border-border bg-muted/50 text-muted-foreground/60",
          !disabled && !rest && "hover:scale-105 active:scale-95 motion-reduce:hover:scale-100",
        )}
      >
        {loading ? (
          <LoaderCircle className="size-6 animate-spin" />
        ) : paused ? (
          <Pause className="size-5" />
        ) : rest ? (
          <Moon className="size-5" />
        ) : state === "skipped" ? (
          <X className="size-6" />
        ) : (
          <Check
            className={cn("size-6", done && "motion-safe:animate-in motion-safe:zoom-in-50")}
            strokeWidth={done ? 3 : 2}
          />
        )}
      </button>
      <span
        className={cn(
          "text-[11px] font-medium text-muted-foreground",
          done && "text-emerald-700 dark:text-emerald-300",
        )}
      >
        {caption}
      </span>
    </div>
  );
}
