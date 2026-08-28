"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Flame,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/axios";
import { areaKeys } from "../queries/area-query";
import { areaService } from "../services/area-service";
import type { Habit, HabitCheckIn, HabitWeekday, Paginated } from "../type";
import { AreaIcon } from "./area-icons";

const weekdayNames: HabitWeekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HabitTracker({
  habits,
  pagination,
  archived,
  areaUuid,
  page,
  setPage,
  onAdd,
  onEdit,
  onDelete,
}: {
  habits: Habit[];
  pagination?: Paginated<Habit>;
  archived: boolean;
  areaUuid: string;
  page: number;
  setPage: (page: number) => void;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
  onDelete: (uuid: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Habit tracker</h2>
          <p className="text-sm text-muted-foreground">
            Build consistency one scheduled check-in at a time.
          </p>
        </div>
        {!archived && (
          <Button size="sm" onClick={onAdd}>
            <Plus />
            Add habit
          </Button>
        )}
      </div>
      {habits.length === 0 ? (
        <Card className="items-center py-12 text-center">
          <CardTitle>No habits yet</CardTitle>
          <CardDescription>
            Define a small, repeatable action to begin tracking.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {habits.map((habit) => (
            <HabitCard
              key={habit.uuid}
              habit={habit}
              archived={archived}
              areaUuid={areaUuid}
              onEdit={() => onEdit(habit)}
              onDelete={() => onDelete(habit.uuid)}
            />
          ))}
        </div>
      )}
      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.last_page}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function HabitCard({
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
  const queryClient = useQueryClient();
  const timezone = browserTimezone();
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -89);
  const historyQuery = useQuery({
    queryKey: [
      "areas",
      "detail",
      areaUuid,
      "habits",
      habit.uuid,
      "history",
      localDate(rangeStart),
      localDate(today),
    ],
    queryFn: () =>
      areaService.habitHistory(
        areaUuid,
        habit.uuid,
        localDate(rangeStart),
        localDate(today),
        timezone,
      ),
  });
  const history = historyQuery.data?.data;
  const checkIn = useMutation({
    mutationFn: ({ date, completed }: { date: string; completed: boolean }) =>
      areaService.checkInHabit(
        areaUuid,
        habit.uuid,
        date,
        completed,
        timezone,
      ),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: [
          "areas",
          "detail",
          areaUuid,
          "habits",
          habit.uuid,
          "history",
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: areaKeys.section(areaUuid, "habits"),
      });
      toast.add({ type: "success", description: response.message });
    },
    onError: (error) =>
      toast.add({ type: "error", description: validationMessage(error) }),
  });
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

function HabitHistoryDialog({
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
  const timezone = browserTimezone();
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState<Date>(today);
  const cells = useMemo(() => calendarCells(month), [month]);
  const historyQuery = useQuery({
    queryKey: [
      "areas",
      "detail",
      areaUuid,
      "habits",
      habit.uuid,
      "history",
      localDate(cells[0]),
      localDate(cells[cells.length - 1]),
    ],
    queryFn: () =>
      areaService.habitHistory(
        areaUuid,
        habit.uuid,
        localDate(cells[0]),
        localDate(cells[cells.length - 1]),
        timezone,
      ),
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

function DayCell({
  date,
  habit,
  entry,
  today,
  compact = false,
  label,
  outside,
  selected,
  onClick,
}: {
  date: Date;
  habit: Habit;
  entry?: HabitCheckIn;
  today: Date;
  compact?: boolean;
  label?: string;
  outside?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const scheduled = isScheduled(habit, date);
  const past = date < today;
  const state =
    entry?.completed === true
      ? "complete"
      : entry?.completed === false || (scheduled && past)
        ? "missed"
        : scheduled
          ? "pending"
          : "off";
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border text-xs transition-colors",
        compact ? "h-12 gap-1" : "h-10",
        outside && "opacity-30",
        selected && "ring-2 ring-primary ring-offset-1",
        state === "complete" && "border-emerald-500 bg-emerald-500 text-white",
        state === "missed" &&
          "border-destructive/40 bg-destructive/10 text-destructive",
        state === "pending" && "border-primary/30 bg-primary/10 text-primary",
        state === "off" &&
          "border-transparent bg-muted/50 text-muted-foreground",
        onClick && "hover:border-primary",
      )}
    >
      <span>{compact ? label : date.getDate()}</span>
      {compact && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            state === "complete"
              ? "bg-white"
              : state === "missed"
                ? "bg-destructive"
                : state === "pending"
                  ? "bg-primary"
                  : "bg-muted-foreground/30",
          )}
        />
      )}
    </button>
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
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", color)} />
      {label}
    </span>
  );
}
function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}
function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function isScheduled(habit: Habit, date: Date) {
  const created = startOfDay(new Date(habit.created_at));
  if (date < created) return false;
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "monthly")
    return (habit.schedule?.dates ?? [created.getDate()]).includes(
      date.getDate(),
    );
  const days = habit.schedule?.days ?? [weekdayNames[created.getDay()]];
  return days.includes(weekdayNames[date.getDay()]);
}
function scheduleLabel(habit: Habit) {
  if (habit.frequency === "daily") return "Every day";
  if (habit.frequency === "monthly")
    return `Monthly · ${(habit.schedule?.dates ?? []).join(", ") || "creation date"}`;
  const labels = (habit.schedule?.days ?? [])
    .map((day) => day.slice(0, 3))
    .join(", ");
  return habit.frequency === "weekly"
    ? `Weekly · ${labels || "creation day"}`
    : labels || "Selected weekdays";
}
function completionRate(
  habit: Habit,
  entries: Map<string, HabitCheckIn>,
  start: Date,
  end: Date,
) {
  let scheduled = 0;
  let complete = 0;
  for (let date = start; date <= end; date = addDays(date, 1))
    if (isScheduled(habit, date)) {
      scheduled += 1;
      if (entries.get(localDate(date))?.completed) complete += 1;
    }
  return scheduled ? Math.round((complete / scheduled) * 100) : 0;
}
function calendarCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function validationMessage(error: unknown) {
  if (error instanceof ApiError) {
    return Object.values(error.validationErrors ?? {})[0]?.[0] ?? error.message;
  }
  return error instanceof Error ? error.message : "The check-in could not be saved.";
}
