"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  goalMatchesFilter,
  goalStatusIcons,
  goalStatusOptions,
  goalStatusTintClassNames,
  goalTimeline,
  type GoalTimelineTone,
} from "../goal-status";
import { areaService } from "../services/area-service";
import type { Goal, GoalFilter, GoalStatus, Paginated } from "../type";
import { AreaIcon } from "./area-icons";
import { ProgressRing } from "./progress-ring";

const goalFilters: { value: GoalFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Achieved" },
  { value: "cancelled", label: "Cancelled" },
];

const goalSections: { status: GoalStatus; label: string }[] = [
  { status: "in_progress", label: "In progress" },
  { status: "pending", label: "Up next" },
  { status: "completed", label: "Achieved" },
  { status: "cancelled", label: "Cancelled" },
];

const nextStep: Partial<
  Record<GoalStatus, { status: GoalStatus; label: string; icon: typeof Play }>
> = {
  pending: { status: "in_progress", label: "Start", icon: Play },
  in_progress: { status: "completed", label: "Complete", icon: Check },
};

const timelineToneClassNames: Record<GoalTimelineTone, string> = {
  normal: "text-muted-foreground",
  soon: "text-amber-700 dark:text-amber-300",
  overdue: "font-medium text-destructive",
  done: "text-emerald-700 dark:text-emerald-300",
  muted: "text-muted-foreground",
};

const progressToneClassNames: Record<GoalTimelineTone, string> = {
  normal: "",
  soon: "[&_[data-slot=progress-indicator]]:bg-amber-500 [&_[data-slot=progress-track]]:bg-amber-500/15",
  overdue:
    "[&_[data-slot=progress-indicator]]:bg-destructive [&_[data-slot=progress-track]]:bg-destructive/15",
  done: "[&_[data-slot=progress-indicator]]:bg-emerald-500 [&_[data-slot=progress-track]]:bg-emerald-500/15",
  muted:
    "[&_[data-slot=progress-indicator]]:bg-muted-foreground/40 [&_[data-slot=progress-track]]:bg-muted",
};

const emptyFilterCopy: Record<Exclude<GoalFilter, "all">, string> = {
  active: "No active goals right now",
  completed: "No achieved goals yet",
  cancelled: "No cancelled goals",
};

export function GoalTracker({
  goals,
  counts,
  filter,
  archived,
  areaUuid,
  page,
  pagination,
  setPage,
  onFilterChange,
  onAdd,
  onEdit,
  onChanged,
  showHeader = true,
  allowDelete = true,
}: {
  goals: Goal[];
  counts?: Record<GoalFilter, number>;
  filter: GoalFilter;
  archived: boolean;
  areaUuid: string;
  page: number;
  pagination?: Paginated<Goal>;
  setPage: (page: number) => void;
  onFilterChange: (filter: GoalFilter) => void;
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
  onChanged: (message: string) => Promise<void>;
  showHeader?: boolean;
  allowDelete?: boolean;
}) {
  const [goalToDelete, setGoalToDelete] = useState<Goal>();
  const statusMutation = useMutation({
    mutationFn: ({ goal, status }: { goal: Goal; status: GoalStatus }) =>
      areaService.updateGoal(areaUuid, goal.uuid, { status }),
    onSuccess: (response, variables) => {
      if (
        !goalMatchesFilter(variables.status, filter) &&
        goals.length === 1 &&
        page > 1
      )
        setPage(page - 1);
      return onChanged(response.message);
    },
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });
  const deleteMutation = useMutation({
    mutationFn: (goal: Goal) => areaService.removeGoal(areaUuid, goal.uuid),
    onSuccess: async (response) => {
      setGoalToDelete(undefined);
      if (goals.length === 1 && page > 1) setPage(page - 1);
      await onChanged(response.message);
    },
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });

  const grouped = filter === "all" || filter === "active";
  const sections = grouped
    ? goalSections
        .map((section) => ({
          ...section,
          goals: goals.filter((goal) => goal.status === section.status),
        }))
        .filter((section) => section.goals.length > 0)
    : [{ status: undefined, label: undefined, goals }];

  const renderRow = (goal: Goal) => (
    <GoalRow
      key={goal.uuid}
      goal={goal}
      archived={archived}
      allowDelete={allowDelete}
      updatingStatus={
        statusMutation.isPending &&
        statusMutation.variables?.goal.uuid === goal.uuid
          ? statusMutation.variables.status
          : undefined
      }
      onStatusChange={(status) => statusMutation.mutate({ goal, status })}
      onEdit={() => onEdit(goal)}
      onDelete={() => setGoalToDelete(goal)}
    />
  );

  return (
    <div className="grid gap-5">
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-0.5">
            <h2 className="text-base font-semibold">Goals</h2>
            <p className="text-sm text-muted-foreground">
              Outcomes you&apos;re working toward in this area.
            </p>
          </div>
          {!archived && (counts?.all ?? 0) > 0 && (
            <Button onClick={onAdd}>
              <Plus />
              Add goal
            </Button>
          )}
        </div>
      )}

      {counts && counts.all > 0 && <GoalSummary counts={counts} />}

      {counts && counts.all > 0 && (
        <ToggleGroup
          aria-label="Filter goals"
          spacing={1}
          value={[filter]}
          onValueChange={(values) => {
            const next = values[0] as GoalFilter | undefined;
            if (next) onFilterChange(next);
          }}
          className="flex-wrap"
        >
          {goalFilters.map((item) => (
            <ToggleGroupItem
              key={item.value}
              value={item.value}
              size="sm"
              className="rounded-full px-3 font-normal text-muted-foreground aria-pressed:text-foreground"
            >
              {item.label}
              <span className="text-xs tabular-nums opacity-60">
                {counts[item.value] ?? 0}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {goals.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target />
            </EmptyMedia>
            <EmptyTitle>
              {filter === "all"
                ? "Set your first goal"
                : emptyFilterCopy[filter]}
            </EmptyTitle>
            <EmptyDescription>
              {filter === "all"
                ? archived
                  ? "This area is archived, so goals can't be added."
                  : "Name an outcome, give it a timeline, and track it from start to finish."
                : "Goals will show up here when their status matches this filter."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {filter === "all" ? (
              !archived && (
                <Button onClick={onAdd}>
                  <Plus />
                  Add goal
                </Button>
              )
            ) : (
              <Button variant="outline" onClick={() => onFilterChange("all")}>
                Show all goals
              </Button>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-5">
          {sections.map((section) => (
            <section
              key={section.status ?? "all"}
              className="grid gap-2"
              aria-label={section.label}
            >
              {section.label && (
                <div className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                  <span className="uppercase tracking-wide">{section.label}</span>
                  <span className="tabular-nums opacity-70">
                    {section.goals.length}
                  </span>
                </div>
              )}
              <ItemGroup className="gap-2">
                {section.goals.map(renderRow)}
              </ItemGroup>
            </section>
          ))}
        </div>
      )}

      {pagination && pagination.last_page > 1 && (
        <Pagination
          page={page}
          lastPage={pagination.last_page}
          setPage={setPage}
        />
      )}

      <Dialog
        open={Boolean(goalToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setGoalToDelete(undefined);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete goal?</DialogTitle>
            <DialogDescription>
              “{goalToDelete?.title}” will move to Trash for 30 days. You can
              restore it from Settings before it is permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setGoalToDelete(undefined)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !goalToDelete}
              onClick={() =>
                goalToDelete && deleteMutation.mutate(goalToDelete)
              }
            >
              {deleteMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              {deleteMutation.isPending ? "Deleting…" : "Delete goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalSummary({ counts }: { counts: Record<GoalFilter, number> }) {
  const tracked = counts.all - counts.cancelled;
  const percent = tracked > 0 ? Math.round((counts.completed / tracked) * 100) : 0;
  const message =
    tracked === 0
      ? "Pick a new goal to work toward."
      : percent === 100
        ? "Every goal achieved. Set the next one."
        : percent >= 50
          ? "Over halfway there. Keep going."
          : percent > 0
            ? "Momentum is building."
            : "Every goal starts with a first step.";
  const stats = [
    { label: "Active", value: counts.active, className: "text-blue-700 dark:text-blue-300" },
    { label: "Achieved", value: counts.completed, className: "text-emerald-700 dark:text-emerald-300" },
    { label: "Cancelled", value: counts.cancelled, className: "text-muted-foreground" },
  ];

  return (
    <Card className="flex-row items-center gap-5 px-5 py-5 sm:gap-6 sm:px-6">
      <ProgressRing
        percent={percent}
        label={`${counts.completed} of ${tracked} goals achieved`}
      />
      <div className="grid min-w-0 flex-1 gap-3">
        <div className="grid gap-0.5">
          <p className="text-base font-semibold">
            {counts.completed} of {tracked} {tracked === 1 ? "goal" : "goals"} achieved
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:max-w-sm">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg bg-muted/50 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className={cn("text-lg font-semibold tabular-nums", stat.className)}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

function GoalRow({
  goal,
  archived,
  allowDelete,
  updatingStatus,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  archived: boolean;
  allowDelete: boolean;
  updatingStatus?: GoalStatus;
  onStatusChange: (status: GoalStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const timeline = goalTimeline(goal);
  const step = nextStep[goal.status];
  const completed = goal.status === "completed";
  const cancelled = goal.status === "cancelled";

  return (
    <Item
      role="listitem"
      variant="outline"
      className={cn(
        "flex-nowrap items-start bg-card sm:items-center",
        cancelled && "bg-muted/30",
      )}
    >
      <ItemMedia
        className={cn(
          "relative size-10 rounded-lg",
          goalStatusTintClassNames[goal.status],
        )}
      >
        <AreaIcon name={goal.icon || "Target"} className="size-4.5" />
        {completed && (
          <span className="absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-card motion-safe:animate-in motion-safe:zoom-in-50">
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </ItemMedia>

      <ItemContent className="min-w-0 gap-1.5">
        <div className="grid gap-0.5">
          <ItemTitle
            className={cn(
              "w-full truncate font-semibold",
              cancelled &&
                "text-muted-foreground line-through decoration-muted-foreground/40",
            )}
          >
            {goal.title}
          </ItemTitle>
          {goal.description && (
            <ItemDescription className="line-clamp-1">
              {goal.description}
            </ItemDescription>
          )}
        </div>

        {timeline.progress !== undefined ? (
          <div className="grid max-w-md gap-1">
            <Progress
              value={timeline.progress}
              aria-label={`Time elapsed for ${goal.title}`}
              className={cn("h-1.5", progressToneClassNames[timeline.tone])}
            />
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-muted-foreground">{timeline.range}</span>
              <span className={cn("shrink-0", timelineToneClassNames[timeline.tone])}>
                {timeline.label}
              </span>
            </div>
          </div>
        ) : (
          <p className={cn("text-xs", timelineToneClassNames[timeline.tone])}>
            {timeline.label}
          </p>
        )}
      </ItemContent>

      <ItemActions className="shrink-0">
        {!archived && step && (
          <Button
            variant="outline"
            disabled={Boolean(updatingStatus)}
            aria-label={`${step.label} ${goal.title}`}
            onClick={() => onStatusChange(step.status)}
          >
            {updatingStatus ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <step.icon />
            )}
            <span className="hidden sm:inline">{step.label}</span>
          </Button>
        )}
        {!archived && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Actions for ${goal.title}`}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
                  Set status
                </p>
                {goalStatusOptions.map((option) => {
                  const Icon = goalStatusIcons[option.value];
                  const current = option.value === goal.status;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      disabled={current || Boolean(updatingStatus)}
                      onClick={() => onStatusChange(option.value)}
                    >
                      <Icon />
                      {option.label}
                      {current && <Check className="ml-auto" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
              {allowDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onClick={onDelete}>
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {archived && (
          <Badge variant="outline" className="hidden sm:inline-flex">
            {goalStatusOptions.find((option) => option.value === goal.status)?.label}
          </Badge>
        )}
      </ItemActions>
    </Item>
  );
}

function Pagination({
  page,
  lastPage,
  setPage,
}: {
  page: number;
  lastPage: number;
  setPage: (page: number) => void;
}) {
  return (
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
        Page {page} of {lastPage}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Next page"
        disabled={page >= lastPage}
        onClick={() => setPage(page + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
