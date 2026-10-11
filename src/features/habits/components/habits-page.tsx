"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHabitInsights } from "../hooks/use-habit-insights";
import { useHabitWorkspace } from "../hooks/use-habit-workspace";
import {
  useHabitCalendarQuery,
  useHabitCheckInMutation,
  useHabitCreateMutation,
  useHabitDeleteMutation,
  useHabitsQuery,
  useHabitUpdateMutation,
} from "../queries/habit-query";
import type {
  Habit,
  HabitCalendarView,
  HabitCheckIn,
  HabitInput,
} from "../type";
import { HabitCalendar } from "./habit-calendar";
import { HabitCalendarFooter } from "./habit-calendar-footer";
import {
  HabitCalendarSkeleton,
  HabitFirstRun,
  HabitLoadError,
  HabitNoMatches,
} from "./habit-empty-states";
import { HabitFormDialog } from "./habit-form-dialog";
import {
  getCalendarColumns,
  getCalendarRange,
  shiftAnchor,
} from "./habit-calendar-utils";
import { HabitTodayPanel } from "./habit-today-panel";
import { HabitToolbar } from "./habit-toolbar";

const emptyCheckIns: Record<string, HabitCheckIn[]> = {};
type HabitFormState = {
  open: boolean;
  habit?: Habit;
  defaults?: { name: string; icon: string };
  opener?: HTMLElement | null;
};

export function HabitsPage({
  initialHabitUuid,
}: {
  initialHabitUuid?: string;
}) {
  const [view, setView] = useState<HabitCalendarView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [form, setForm] = useState<HabitFormState>();
  const [deletion, setDeletion] = useState<{
    open: boolean;
    habit: Habit;
    opener: HTMLElement | null;
  }>();
  const habitsQuery = useHabitsQuery();
  const habits = useMemo(
    () => habitsQuery.data?.data ?? [],
    [habitsQuery.data?.data],
  );
  const linkedHabit = initialHabitUuid
    ? habits.find((habit) => habit.uuid === initialHabitUuid)
    : undefined;
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
  const listFailed = habitsQuery.isError && !habitsQuery.data;
  const checkIns = calendarQuery.data?.data.check_ins ?? emptyCheckIns;
  const workspace = useHabitWorkspace(calendarHabits, checkIns, columns);
  const insights = useHabitInsights({
    habits: calendarHabits,
    rangeCheckIns: checkIns,
    enabled: Boolean(calendarQuery.data) && !listFailed,
  });
  const loading = habitsQuery.isLoading || calendarQuery.isLoading;
  const calendarFailed = calendarQuery.isError && !calendarQuery.data;
  const refreshing =
    !loading && (habitsQuery.isFetching || calendarQuery.isFetching);

  const closeForm = () =>
    setForm((current) => current && { ...current, open: false });
  const submitHabit = async (input: HabitInput) => {
    if (form?.habit)
      await updateMutation.mutateAsync({ habitUuid: form.habit.uuid, input });
    else await createMutation.mutateAsync(input);
    closeForm();
  };
  const openDelete = (habit: Habit, opener: HTMLElement | null) => {
    deleteMutation.reset();
    setDeletion({ open: true, habit, opener });
  };
  const closeDelete = () =>
    setDeletion((current) => current && { ...current, open: false });
  const confirmDelete = () => {
    if (!deletion || deleteMutation.isPending) return;
    deleteMutation.mutate(deletion.habit.uuid, { onSuccess: closeDelete });
  };
  const goToday = () => {
    setAnchor(new Date());
    if (view === "all") setView("week");
  };
  const hasHistory =
    Boolean(calendarQuery.data) && !calendarFailed && !listFailed;

  const checkIn = (habitUuid: string, date: string, completed: boolean) => {
    if (!pending) checkInMutation.mutate({ habitUuid, date, completed });
  };
  const pendingCheckIn = checkInMutation.isPending
    ? checkInMutation.variables
    : undefined;
  const showToday = !listFailed && (loading || calendarHabits.length > 0);

  return (
    <div className="habits-workspace @container mx-auto flex w-full max-w-[110rem] min-w-0 flex-col gap-4">
      <div className="shrink-0">
        <PageHeader
          title="Habits"
          description="Small actions, a little more consistent every day."
          action={
            <Button
              id="add-habit-trigger"
              disabled={pending || habitsQuery.isLoading}
              onClick={() => setForm({ open: true })}
            >
              <Plus data-icon="inline-start" />
              Add habit
            </Button>
          }
        />
      </div>
      <div
        className={
          "habits-layout flex min-h-0 min-w-0 flex-1 flex-col gap-4" +
          (showToday
            ? " @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:grid-rows-[minmax(0,1fr)]"
            : "")
        }
      >
        <Card
          className="habits-workspace-card min-w-0 gap-0 py-0"
          aria-labelledby="habit-range-title"
        >
          <HabitToolbar
            view={view}
            range={range}
            workspace={workspace}
            loading={loading}
            refreshing={refreshing}
            onViewChange={(next) => {
              setView(next);
              if (next === "all") setAnchor(new Date());
            }}
            onShift={(amount) => setAnchor(shiftAnchor(view, anchor, amount))}
            onToday={goToday}
          />
          {((habitsQuery.isError && habitsQuery.data) ||
            (calendarQuery.isError && calendarQuery.data)) && (
            <Alert
              variant="destructive"
              className="shrink-0 rounded-none border-x-0 border-b-0"
            >
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                The latest updates could not be loaded.
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void habitsQuery.refetch();
                    void calendarQuery.refetch();
                  }}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div
            className="flex min-h-0 flex-1 flex-col border-t"
            aria-busy={loading}
          >
            {listFailed || calendarFailed ? (
              <HabitLoadError
                kind={listFailed ? "list" : "calendar"}
                onRetry={() =>
                  listFailed ? habitsQuery.refetch() : calendarQuery.refetch()
                }
              />
            ) : loading ? (
              <HabitCalendarSkeleton columns={columns} view={view} />
            ) : calendarHabits.length === 0 ? (
              <HabitFirstRun
                onAdd={(defaults) => setForm({ open: true, defaults })}
              />
            ) : workspace.filteredHabits.length === 0 ? (
              <HabitNoMatches onClear={workspace.clearFilters} />
            ) : (
              <HabitCalendar
                habits={workspace.filteredHabits}
                checkIns={checkIns}
                columns={columns}
                view={view}
                rangeKey={view + range.startDate + range.endDate}
                streaks={insights.streaks}
                pending={pending}
                pendingCheckIn={pendingCheckIn}
                onCheckIn={checkIn}
                onOpenMonth={(date) => {
                  setView("month");
                  setAnchor(date);
                }}
                onEdit={(habit, opener) =>
                  setForm({ open: true, habit, opener })
                }
                onDelete={openDelete}
              />
            )}
          </div>
          <HabitCalendarFooter
            summary={workspace.summary}
            loading={loading}
            showSummary={hasHistory && !loading}
          />
        </Card>
        {showToday && (
          <HabitTodayPanel
            insights={insights}
            loading={loading}
            pending={pending}
            pendingCheckIn={pendingCheckIn}
            onCheckIn={checkIn}
          />
        )}
      </div>

      {form && (
        <HabitFormDialog
          open={form.open}
          habit={form.habit}
          defaults={form.defaults}
          opener={form.opener}
          isPending={createMutation.isPending || updateMutation.isPending}
          onOpenChange={(open) => !open && closeForm()}
          onClosed={() => setForm(undefined)}
          onSubmit={submitHabit}
        />
      )}
      {linkedHabit && (
        <LinkedHabitDialog
          key={initialHabitUuid}
          habit={linkedHabit}
          isPending={updateMutation.isPending}
          onSubmit={(input) =>
            updateMutation
              .mutateAsync({ habitUuid: linkedHabit.uuid, input })
              .then(() => undefined)
          }
        />
      )}
      <AlertDialog
        open={Boolean(deletion?.open)}
        onOpenChange={(open) =>
          !open && !deleteMutation.isPending && closeDelete()
        }
        onOpenChangeComplete={(open) => !open && setDeletion(undefined)}
      >
        <AlertDialogContent
          finalFocus={() =>
            deletion?.opener?.isConnected
              ? deletion.opener
              : document.getElementById("add-habit-trigger")
          }
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Move habit to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deletion?.habit.name}” and its check-in history will move to
              Trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {deleteMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              {deleteMutation.isPending && (
                <Loader2
                  data-icon="inline-start"
                  className="animate-spin motion-reduce:animate-none"
                />
              )}
              {deleteMutation.isPending ? "Moving…" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LinkedHabitDialog({
  habit,
  isPending,
  onSubmit,
}: {
  habit: Habit;
  isPending: boolean;
  onSubmit: (input: HabitInput) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <HabitFormDialog
      open={open}
      habit={habit}
      isPending={isPending}
      onOpenChange={setOpen}
      onClosed={() => router.replace("/habits", { scroll: false })}
      onSubmit={onSubmit}
    />
  );
}
