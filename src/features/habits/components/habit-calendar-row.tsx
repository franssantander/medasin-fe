"use client";

import type { CSSProperties } from "react";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AreaIcon } from "@/features/areas/components/area-icons";
import type { Habit, HabitCalendarColumn, HabitCheckIn } from "../type";
import { HabitCalendarCell } from "./habit-calendar-cell";
import { scheduleLabel } from "./habit-calendar-utils";

const emptyEntryMap = new Map<string, HabitCheckIn>();

export function HabitCalendarRow({
  habit,
  entries,
  columns,
  today,
  gridStyle,
  pending,
  onCheckIn,
  onOpenMonth,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  entries?: Map<string, HabitCheckIn>;
  columns: HabitCalendarColumn[];
  today: Date;
  gridStyle: CSSProperties;
  pending: boolean;
  onCheckIn: (habitUuid: string, date: string, completed: boolean) => void;
  onOpenMonth: (date: Date) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}) {
  const entryMap = entries ?? emptyEntryMap;

  return (
    <div
      className="group/row grid grid-cols-[minmax(16rem,1.80fr)_repeat(var(--habit-columns),minmax(3.25rem,1fr))] border-b transition-colors last:border-b-0 hover:bg-muted/30"
      style={gridStyle}
    >
      <div
        className={cn(
          "sticky left-0 z-10 flex min-w-0 items-center gap-3 border-r bg-background/95 px-4 py-2.5 backdrop-blur group-hover/row:bg-muted/50",
          !habit.is_active && "opacity-60",
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AreaIcon name={habit.icon || "Repeat2"} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className="min-w-0 flex-1 truncate text-sm font-semibold"
              title={habit.name}
            >
              {habit.name}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label={`${habit.name} actions`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  />
                }
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onEdit(habit)}>
                  <Pencil />
                  Edit habit
                </DropdownMenuItem>
                <DropdownMenuItem destructive onClick={() => onDelete(habit)}>
                  <Trash2 />
                  Delete habit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="min-w-0 flex-1 truncate"
              title={habit.is_active ? scheduleLabel(habit) : "Paused"}
            >
              {habit.is_active ? scheduleLabel(habit) : "Paused"}
            </span>
            {habit.area && (
              <Badge
                variant="outline"
                title={habit.area.name}
                aria-label={`Area: ${habit.area.name}`}
                className="min-w-0 max-w-32 gap-1 px-1.5"
              >
                <AreaIcon name={habit.area.icon} />
                <span className="min-w-0 truncate">{habit.area.name}</span>
              </Badge>
            )}
          </div>
        </div>
      </div>
      {columns.map((column) => (
        <HabitCalendarCell
          key={column.key}
          habit={habit}
          entries={entryMap}
          column={column}
          today={today}
          pending={pending}
          onCheckIn={onCheckIn}
          onOpenMonth={onOpenMonth}
        />
      ))}
    </div>
  );
}
