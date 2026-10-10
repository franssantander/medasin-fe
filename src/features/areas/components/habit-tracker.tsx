"use client";

import { useQueries } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Link2,
  Moon,
  PartyPopper,
  Plus,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import {
  habitHistoryQueryOptions,
  habitHistoryRange,
} from "../hooks/use-habit-tracker";
import type { Habit, Paginated } from "../type";
import { TodaySummarySkeleton } from "./area-skeletons";
import { HabitCard } from "./habit-card";
import {
  dayState,
  localDate,
  startOfDay,
  streakLabel,
} from "./habit-tracker-utils";
import { ProgressRing } from "./progress-ring";

export type HabitTrackerProps = {
  habits: Habit[];
  pagination?: Paginated<Habit>;
  archived: boolean;
  areaUuid: string;
  page: number;
  setPage: (page: number) => void;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
  onDelete: (uuid: string) => void;
  onLink: () => void;
};

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
  onLink,
}: HabitTrackerProps) {
  const sortedHabits = [...habits].sort(
    (first, second) => Number(second.is_active) - Number(first.is_active),
  );
  const actions = !archived && (
    <>
      <Button variant="outline" onClick={onLink}>
        <Link2 />
        Link existing
      </Button>
      <Button onClick={onAdd}>
        <Plus />
        Add habit
      </Button>
    </>
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-0.5">
          <h2 className="text-base font-semibold">Habits</h2>
          <p className="text-sm text-muted-foreground">
            Small, repeatable actions that keep this area healthy.
          </p>
        </div>
        {habits.length > 0 && actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {habits.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Flame />
            </EmptyMedia>
            <EmptyTitle>Start a habit</EmptyTitle>
            <EmptyDescription>
              {archived
                ? "This area is archived, so habits can't be added."
                : "Pick one small action you can repeat, like a 10-minute walk or reviewing your budget."}
            </EmptyDescription>
          </EmptyHeader>
          {actions && (
            <EmptyContent className="flex-row flex-wrap justify-center">
              {actions}
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          <TodaySummary habits={sortedHabits} areaUuid={areaUuid} />
          <div className="grid gap-4 lg:grid-cols-2">
            {sortedHabits.map((habit) => (
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
        </>
      )}

      {pagination && pagination.last_page > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            Page {page} of {pagination.last_page}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={page >= pagination.last_page}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}

function TodaySummary({
  habits,
  areaUuid,
}: {
  habits: Habit[];
  areaUuid: string;
}) {
  const today = startOfDay(new Date());
  const range = habitHistoryRange(today);
  const todayKey = localDate(today);
  const histories = useQueries({
    queries: habits.map((habit) =>
      habitHistoryQueryOptions({ areaUuid, habitUuid: habit.uuid, ...range }),
    ),
  });

  if (histories.some((query) => query.isLoading)) {
    return <TodaySummarySkeleton />;
  }

  let due = 0;
  let done = 0;
  let best = 0;
  let longest: { habit: Habit; streak: number } | undefined;

  habits.forEach((habit, index) => {
    const history = histories[index].data?.data;
    if (!history) return;
    best = Math.max(best, history.best_streak);
    if (history.current_streak > (longest?.streak ?? 0)) {
      longest = { habit, streak: history.current_streak };
    }
    if (!habit.is_active) return;
    const entry = history.check_ins.find((item) => item.date === todayKey);
    const state = dayState(habit, today, entry, today);
    if (state === "rest") return;
    due += 1;
    if (state === "done") done += 1;
  });

  const restDay = due === 0;
  const perfect = !restDay && done === due;
  const percent = restDay ? 0 : Math.round((done / due) * 100);
  const message = restDay
    ? "Rest day. Nothing is scheduled today."
    : perfect
      ? "Perfect day. Every habit checked off."
      : done === 0
        ? `${due} to go today. Start with the easiest one.`
        : `${due - done} left today. You've got this.`;

  return (
    <Card
      className={cn(
        "gap-5 px-5 py-5 sm:flex-row sm:items-center sm:px-6",
        perfect && "border-emerald-500/40 bg-emerald-500/5",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-5">
        <ProgressRing
          percent={percent}
          complete={perfect}
          label={restDay ? "No habits scheduled today" : `${done} of ${due} habits done today`}
          className="size-16 sm:size-20"
        >
          {restDay ? (
            <Moon className="size-6 text-muted-foreground" aria-hidden="true" />
          ) : perfect ? (
            <PartyPopper className="size-6 text-emerald-600 motion-safe:animate-in motion-safe:zoom-in-50 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <span className="text-base">{percent}%</span>
          )}
        </ProgressRing>
        <div className="grid min-w-0 gap-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Today
          </p>
          <p className="text-base font-semibold">
            {restDay ? "Nothing scheduled" : `${done} of ${due} done`}
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:w-72">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="size-3.5 text-orange-500" aria-hidden="true" />
            Running streak
          </dt>
          <dd className="truncate text-sm font-semibold">
            {longest ? streakLabel(longest.habit, longest.streak) : "None yet"}
          </dd>
          {longest && (
            <dd className="truncate text-xs text-muted-foreground">
              {longest.habit.name}
            </dd>
          )}
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Trophy className="size-3.5 text-amber-500" aria-hidden="true" />
            Best streak
          </dt>
          <dd className="text-sm font-semibold tabular-nums">{best}</dd>
        </div>
      </dl>
    </Card>
  );
}
