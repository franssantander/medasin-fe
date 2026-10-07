"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
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
import type {
  Habit,
  HabitCalendarColumn,
  HabitCheckIn,
  PendingHabitCheckIn,
} from "../type";
import { HabitCalendarCell } from "./habit-calendar-cell";
import { scheduleLabel } from "./habit-calendar-utils";

const emptyEntryMap = new Map<string, HabitCheckIn>();

export function HabitCalendarRow({
  habit,
  entries,
  columns,
  today,
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
  pending: boolean;
  pendingCheckIn?: PendingHabitCheckIn;
  onCheckIn: (habitUuid: string, date: string, completed: boolean) => void;
  onOpenMonth: (date: Date) => void;
  onEdit: (habit: Habit, opener: HTMLElement | null) => void;
  onDelete: (habit: Habit, opener: HTMLElement | null) => void;
}) {
  const actionsRef = useRef<HTMLButtonElement>(null);
  return (
    <div
      role="row"
      className="habit-calendar-grid habit-calendar-row group/row border-b last:border-b-0"
    >
      <div
        role="rowheader"
        className="habit-identity sticky left-0 z-10 flex min-w-0 items-center gap-2.5 border-r bg-card px-3 py-3 md:px-4"
      >
        <div className="habit-identity-icon hidden size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground md:flex">
          <AreaIcon name={habit.icon || "Repeat2"} className="size-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p
            className="line-clamp-2 break-words text-sm font-semibold"
            title={habit.name}
          >
            {habit.name}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            <span className="truncate" title={scheduleLabel(habit)}>
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
        {columns.map((column) => (
          <HabitCalendarCell
            key={column.key}
            habit={habit}
            entries={entries ?? emptyEntryMap}
            column={column}
            today={today}
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
