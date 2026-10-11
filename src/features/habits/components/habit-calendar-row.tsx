"use client";

import { Ellipsis, Flame, Pencil, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AreaIcon } from "@/features/areas/components/area-icons";
import { cn } from "@/lib/utils";
import type { HabitStreak } from "../hooks/use-habit-insights";
import type {
  Habit,
  HabitCalendarColumn,
  HabitCheckIn,
  PendingHabitCheckIn,
} from "../type";
import { HabitCalendarCell } from "./habit-calendar-cell";
import { describeSchedule, scheduleLabel } from "./habit-calendar-utils";
import { streakText } from "./habit-today-panel";

const emptyEntryMap = new Map<string, HabitCheckIn>();

export function HabitCalendarRow({
  habit,
  entries,
  columns,
  today,
  streak,
  pending,
  pendingCheckIn,
  onCheckIn,
  onOpenMonth,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  entries?: Map<string, HabitCheckIn>;
  columns: HabitCalendarColumn[];
  today: Date;
  streak?: HabitStreak;
  pending: boolean;
  pendingCheckIn?: PendingHabitCheckIn;
  onCheckIn: (habitUuid: string, date: string, completed: boolean) => void;
  onOpenMonth: (date: Date) => void;
  onEdit: (habit: Habit, opener: HTMLElement | null) => void;
  onDelete: (habit: Habit, opener: HTMLElement | null) => void;
}) {
  const actionsRef = useRef<HTMLButtonElement>(null);
  const map = entries ?? emptyEntryMap;
  const done = (index: number) =>
    Boolean(columns[index] && map.get(columns[index].key)?.completed);
  const doneToday = Boolean(
    map.get(
      columns.find((column) => column.date.getTime() === today.getTime())
        ?.key ?? "",
    )?.completed,
  );

  return (
    <div
      role="row"
      className="habit-calendar-grid habit-calendar-row group/row border-b transition-colors last:border-b-0 hover:bg-muted/30"
    >
      <div
        role="rowheader"
        className="habit-identity sticky left-0 z-10 flex min-w-0 items-center gap-3 border-r bg-card px-3 py-3 md:px-4"
      >
        <div
          className={cn(
            "habit-identity-icon hidden size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors md:flex",
            doneToday &&
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            !habit.is_active && "opacity-60",
          )}
        >
          <AreaIcon name={habit.icon || "Repeat2"} className="size-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p
            className={cn(
              "line-clamp-2 text-sm font-medium break-words",
              !habit.is_active && "text-muted-foreground",
            )}
            title={habit.name}
          >
            {habit.name}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            {streak && streak.current > 0 && habit.is_active && (
              <span
                className="flex shrink-0 items-center gap-0.5 font-medium text-orange-600 dark:text-orange-400"
                title={"Best: " + streak.best}
              >
                <Flame className="size-3.5" aria-hidden="true" />
                <span aria-hidden="true">{streak.current}</span>
                <span className="sr-only">
                  {streakText(habit, streak.current) + "."}
                </span>
              </span>
            )}
            <span
              className="truncate"
              title={describeSchedule(habit.frequency, habit.schedule)}
            >
              {scheduleLabel(habit)}
            </span>
            {!habit.is_active && <Badge variant="outline">Paused</Badge>}
            {habit.area && (
              <Badge
                variant="secondary"
                className="max-w-32"
                title={habit.area.name}
                aria-label={"Area: " + habit.area.name}
              >
                <span className="truncate">{habit.area.name}</span>
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                ref={actionsRef}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={habit.name + " actions"}
                disabled={pending}
                className="text-muted-foreground transition-opacity aria-expanded:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:group-focus-within/row:opacity-100"
              />
            }
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => onEdit(habit, actionsRef.current)}
              >
                <Pencil />
                Edit habit
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onClick={() => onDelete(habit, actionsRef.current)}
              >
                <Trash2 />
                Move to Trash
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="habit-date-cells" role="presentation">
        {columns.map((column, index) => (
          <HabitCalendarCell
            key={column.key}
            habit={habit}
            entries={map}
            column={column}
            today={today}
            compact={columns.length > 7}
            chainBefore={!column.aggregate && done(index - 1)}
            chainAfter={!column.aggregate && done(index + 1)}
            pending={pending}
            saving={
              pendingCheckIn?.habitUuid === habit.uuid &&
              pendingCheckIn.date === column.key
            }
            onCheckIn={onCheckIn}
            onOpenMonth={onOpenMonth}
          />
        ))}
      </div>
    </div>
  );
}
