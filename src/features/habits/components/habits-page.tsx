"use client";

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDashed,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
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
  HabitStatusFilter,
} from "../type";
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
const statuses: { value: HabitStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];
const emptyCheckIns: Record<string, HabitCheckIn[]> = {};
type HabitFormState = {
  open: boolean;
  habit?: Habit;
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
  const checkIns = calendarQuery.data?.data.check_ins ?? emptyCheckIns;
  const workspace = useHabitWorkspace(calendarHabits, checkIns, columns);
  const loading = habitsQuery.isLoading || calendarQuery.isLoading;
  const listFailed = habitsQuery.isError && !habitsQuery.data;
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

  return (
    <div className="habits-workspace mx-auto flex w-full max-w-[110rem] min-w-0 flex-col gap-4">
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
      <Card
        className="habits-workspace-card min-w-0 gap-0 py-0"
        aria-labelledby="habit-range-title"
      >
        <CardHeader className="shrink-0 gap-4 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
                <CalendarDays className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <CardTitle>
                  <h2
                    id="habit-range-title"
                    className="truncate"
                    title={rangeLabel(range)}
                  >
                    {rangeLabel(range)}
                  </h2>
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    {view === "week"
                      ? "Your weekly rhythm"
                      : view === "month"
                        ? "One check-in at a time"
                        : "Your consistency over time"}
                  </span>
                  {!loading && (
                    <Badge variant="secondary">
                      {workspace.filteredHabits.length}{" "}
                      {workspace.filteredHabits.length === 1
                        ? "habit"
                        : "habits"}
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {view !== "all" && (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Previous range"
                    onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Next range"
                    onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
            </div>
            <ToggleGroup
              aria-label="Calendar view"
              value={[view]}
              onValueChange={(values) => {
                if (values[0]) {
                  setView(values[0] as HabitCalendarView);
                  if (values[0] === "all") setAnchor(new Date());
                }
              }}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full xl:w-fit"
            >
              {views.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="flex-1 xl:flex-none"
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <InputGroup className="w-full sm:w-60 xl:flex-1 xl:max-w-80">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Search habits"
                placeholder="Search habits or Areas…"
                value={workspace.search}
                onChange={(event) => workspace.setSearch(event.target.value)}
              />
              {workspace.search && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => workspace.setSearch("")}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <ToggleGroup
              aria-label="Habit status"
              value={[workspace.status]}
              onValueChange={(values) =>
                values[0] && workspace.setStatus(values[0] as HabitStatusFilter)
              }
              variant="outline"
              size="sm"
              spacing={0}
            >
              {statuses.map((item) => (
                <ToggleGroupItem key={item.value} value={item.value}>
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Select
              items={workspace.areaOptions}
              value={workspace.area}
              onValueChange={(value) => value && workspace.setArea(value)}
            >
              <SelectTrigger
                size="sm"
                aria-label="Filter by Area"
                className="min-w-36 flex-1 sm:w-40 sm:flex-none"
              >
                <SelectValue>
                  {workspace.areaOptions.find(
                    (item) => item.value === workspace.area,
                  )?.label ?? "Selected Area"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {workspace.areaOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {workspace.hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={workspace.clearFilters}
              >
                <X data-icon="inline-start" />
                Clear filters
              </Button>
            )}
            {(refreshing || loading) && (
              <span
                className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                {refreshing ? (
                  <>
                    <Loader2
                      className="size-3.5 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    Updating…
                  </>
                ) : (
                  "Loading habits…"
                )}
              </span>
            )}
          </div>
        </CardHeader>
        <Separator />
        {((habitsQuery.isError && habitsQuery.data) ||
          (calendarQuery.isError && calendarQuery.data)) && (
          <Alert
            variant="destructive"
            className="shrink-0 rounded-none border-x-0 border-t-0"
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
        <CardContent className="min-h-0 flex-1 gap-0 p-0" aria-busy={loading}>
          {listFailed || calendarFailed ? (
            <Empty className="min-h-64 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RefreshCw />
                </EmptyMedia>
                <EmptyTitle>
                  {listFailed
                    ? "Habits could not be loaded"
                    : "Habit history could not be loaded"}
                </EmptyTitle>
                <EmptyDescription>
                  Check your connection and try again.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() =>
                    listFailed ? habitsQuery.refetch() : calendarQuery.refetch()
                  }
                >
                  <RefreshCw data-icon="inline-start" />
                  {listFailed ? "Try again" : "Refresh range"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : loading ? (
            <CalendarSkeleton />
          ) : calendarHabits.length === 0 ? (
            <Empty className="min-h-64 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays />
                </EmptyMedia>
                <EmptyTitle>A small habit is a good start</EmptyTitle>
                <EmptyDescription>
                  Add your first habit and choose when you want to practice it.
                  Habits created in Areas appear here too.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setForm({ open: true })}>
                  <Plus data-icon="inline-start" />
                  Add your first habit
                </Button>
              </EmptyContent>
            </Empty>
          ) : workspace.filteredHabits.length === 0 ? (
            <Empty className="min-h-64 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>No matching habits</EmptyTitle>
                <EmptyDescription>
                  Try another search or clear your filters to see all habits.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={workspace.clearFilters}>
                  Clear filters
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <HabitCalendar
              habits={workspace.filteredHabits}
              checkIns={checkIns}
              columns={columns}
              view={view}
              rangeKey={view + range.startDate + range.endDate}
              pending={pending}
              pendingCheckIn={
                checkInMutation.isPending
                  ? checkInMutation.variables
                  : undefined
              }
              onCheckIn={(habitUuid, date, completed) => {
                if (!pending)
                  checkInMutation.mutate({ habitUuid, date, completed });
              }}
              onOpenMonth={(date) => {
                setView("month");
                setAnchor(date);
              }}
              onEdit={(habit, opener) => setForm({ open: true, habit, opener })}
              onDelete={openDelete}
            />
          )}
        </CardContent>
        <Separator />
        <CardFooter className="shrink-0 flex-wrap justify-between gap-x-5 gap-y-3 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <Legend state="completed" label="Completed" />
            <Legend state="missed" label="Missed" />
            <Legend state="scheduled" label="Scheduled" />
            <Legend state="upcoming" label="Upcoming" />
            <Legend state="off" label="Not scheduled" />
          </div>
          {hasHistory && !loading && (
            <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                {workspace.summary.scheduled
                  ? workspace.summary.completed +
                    " of " +
                    workspace.summary.scheduled +
                    " check-ins completed"
                  : "No scheduled check-ins"}
              </span>
              {workspace.summary.scheduled > 0 && (
                <Progress
                  aria-label="Check-ins completed in this range"
                  value={Math.round(
                    (workspace.summary.completed /
                      workspace.summary.scheduled) *
                      100,
                  )}
                  className="h-1.5 w-20 [&_[data-slot=progress-indicator]]:motion-reduce:transition-none"
                />
              )}
            </div>
          )}
        </CardFooter>
      </Card>

      {form && (
        <HabitFormDialog
          open={form.open}
          habit={form.habit}
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

function CalendarSkeleton() {
  return (
    <div
      className="flex min-h-64 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-5"
      aria-label="Loading habit calendar"
    >
      <Skeleton className="h-10 w-full" />
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-4">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function Legend({
  state,
  label,
}: {
  state: "completed" | "missed" | "scheduled" | "upcoming" | "off";
  label: string;
}) {
  const Icon =
    state === "completed"
      ? Check
      : state === "missed"
        ? X
        : state === "scheduled"
          ? Circle
          : state === "upcoming"
            ? CircleDashed
            : Minus;
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 items-center justify-center rounded border",
          state === "completed" &&
            "border-primary bg-primary text-primary-foreground",
          state === "missed" &&
            "border-destructive/25 bg-destructive/5 text-destructive",
          state === "scheduled" && "border-primary/35 text-primary",
          state === "upcoming" && "border-dashed border-muted-foreground/35",
          state === "off" && "border-transparent",
        )}
      >
        <Icon className="size-2.5" />
      </span>
      {label}
    </span>
  );
}
