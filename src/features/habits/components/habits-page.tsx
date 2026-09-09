"use client";

import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useHabitCalendarQuery,
  useHabitCheckInMutation,
  useHabitCreateMutation,
  useHabitDeleteMutation,
  useHabitsQuery,
  useHabitUpdateMutation,
} from "../queries/habit-query";
import type { Habit, HabitCalendarView, HabitInput } from "../type";
import { HabitCalendar } from "./habit-calendar";
import { HabitFormDialog } from "./habit-form-dialog";
import {
  getCalendarColumns,
  getCalendarRange,
  rangeLabel,
  shiftAnchor,
} from "./habit-calendar-utils";

const views: { value: HabitCalendarView; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];

export function HabitsPage() {
  const [view, setView] = useState<HabitCalendarView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [form, setForm] = useState<{
    habit?: Habit;
    areaUuid?: string | null;
  }>();
  const [deleteHabit, setDeleteHabit] = useState<Habit>();
  const habitsQuery = useHabitsQuery();
  const habits = useMemo(
    () => habitsQuery.data?.data ?? [],
    [habitsQuery.data?.data],
  );
  const range = useMemo(
    () => getCalendarRange(view, anchor, habits),
    [anchor, habits, view],
  );
  const columns = useMemo(() => getCalendarColumns(range), [range]);
  const calendarQuery = useHabitCalendarQuery(range);
  const createMutation = useHabitCreateMutation();
  const updateMutation = useHabitUpdateMutation();
  const deleteMutation = useHabitDeleteMutation();
  const checkInMutation = useHabitCheckInMutation();
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    checkInMutation.isPending;
  const calendarHabits = calendarQuery.data?.data.habits ?? habits;
  const checkIns = calendarQuery.data?.data.check_ins ?? {};

  const submitHabit = async (input: HabitInput) => {
    if (form?.habit) {
      await updateMutation.mutateAsync({ habitUuid: form.habit.uuid, input });
    } else {
      await createMutation.mutateAsync(input);
    }
    setForm(undefined);
  };

  const confirmDelete = async () => {
    if (!deleteHabit) return;
    await deleteMutation.mutateAsync(deleteHabit.uuid);
    setDeleteHabit(undefined);
  };

  const changeView = (next: string) => {
    const nextView = next as HabitCalendarView;
    setView(nextView);
    if (nextView === "all") setAnchor(new Date());
  };
  const goToday = () => setAnchor(new Date());
  const openMonth = (date: Date) => {
    setView("month");
    setAnchor(date);
  };

  if (habitsQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[34rem] rounded-xl" />
      </div>
    );
  }
  if (habitsQuery.isError) {
    return (
      <Card className="items-center gap-3 py-16 text-center">
        <CardTitle>Habits could not be loaded</CardTitle>
        <CardDescription>Check your connection and try again.</CardDescription>
        <Button variant="outline" onClick={() => habitsQuery.refetch()}>
          <RefreshCw />
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid w-full gap-4">
      <PageHeader
        title="Habits"
        description="Build consistency with small actions you can return to every day."
        action={
          <Button onClick={() => setForm({})}>
            <Plus />
            Add habit
          </Button>
        }
      />
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-xs sm:p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Tabs value={view} onValueChange={changeView} className="w-full">
            <TabsList variant="default" className="w-full min-w-max sm:w-fit">
              {views.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="px-3"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-1 border-t pt-2 sm:gap-2 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous range"
            disabled={view === "all"}
            onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-0 flex-1 truncate px-1 text-center text-sm font-semibold sm:min-w-36">
            {rangeLabel(range)}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next range"
            disabled={view === "all"}
            onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
          >
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>
      </div>
      {calendarHabits.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground">
          <Legend className="bg-primary" label="Completed" />
          <Legend
            className="border-destructive/50 bg-destructive/10"
            label="Missed"
          />
          <Legend className="border-primary/40" label="Scheduled" />
          <Legend
            className="border-muted-foreground/20 bg-muted/20"
            label="Not scheduled"
          />
          <Badge variant="outline" className="ml-auto">
            {calendarHabits.length}{" "}
            {calendarHabits.length === 1 ? "habit" : "habits"}
          </Badge>
        </div>
      )}
      {calendarQuery.isError ? (
        <Card className="items-center gap-3 py-16 text-center">
          <CardTitle>Habit history could not be loaded</CardTitle>
          <CardDescription>
            Try refreshing this range or come back later.
          </CardDescription>
          <Button variant="outline" onClick={() => calendarQuery.refetch()}>
            <RefreshCw />
            Refresh range
          </Button>
        </Card>
      ) : calendarHabits.length === 0 ? (
        <Card className="items-center gap-3 py-16 text-center">
          <CardTitle>No habits yet</CardTitle>
          <CardDescription>
            Add a habit here or create one from an Area.
          </CardDescription>
          <Button onClick={() => setForm({})}>
            <Plus />
            Add your first habit
          </Button>
        </Card>
      ) : (
        <HabitCalendar
          habits={calendarHabits}
          checkIns={checkIns}
          columns={columns}
          loading={calendarQuery.isLoading}
          pending={pending}
          onCheckIn={(habitUuid, date, completed) =>
            checkInMutation.mutate({ habitUuid, date, completed })
          }
          onOpenMonth={openMonth}
          onEdit={(habit) => setForm({ habit })}
          onDelete={setDeleteHabit}
        />
      )}

      {form && (
        <HabitFormDialog
          open
          habit={form.habit}
          initialAreaUuid={form.areaUuid}
          isPending={createMutation.isPending || updateMutation.isPending}
          onOpenChange={(open) => !open && setForm(undefined)}
          onSubmit={submitHabit}
        />
      )}
      <Dialog
        open={Boolean(deleteHabit)}
        onOpenChange={(open) =>
          !open && !deleteMutation.isPending && setDeleteHabit(undefined)
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete habit?</DialogTitle>
            <DialogDescription>
              “{deleteHabit?.name}” and its check-in history will move to Trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteHabit(undefined)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete habit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full border", className)} />
      {label}
    </span>
  );
}
