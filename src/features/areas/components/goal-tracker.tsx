"use client";

import { useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { goalStatusBadgeClassNames, goalStatusLabels } from "../goal-status";
import { areaService } from "../services/area-service";
import type { Goal, GoalFilter, GoalStatus, Paginated } from "../type";
import { AreaIcon } from "./area-icons";

const goalFilters: { value: GoalFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const goalStatuses: { value: GoalStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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

  return (
    <div className="grid gap-4">
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Goals</h2>
            <p className="text-sm text-muted-foreground">
              Track what matters and keep moving forward.
            </p>
          </div>
          {!archived && (
            <Button size="sm" onClick={onAdd}>
              <Plus />
              Add goal
            </Button>
          )}
        </div>
      )}
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label="Filter goals"
      >
        {goalFilters.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "secondary" : "outline"}
            aria-pressed={filter === item.value}
            onClick={() => onFilterChange(item.value)}
          >
            {item.label}
            <Badge variant="secondary" className="ml-1 min-w-6 justify-center">
              {counts?.[item.value] ?? 0}
            </Badge>
          </Button>
        ))}
      </div>
      {goals.length === 0 ? (
        <Card className="items-center py-12 text-center">
          <CardTitle>
            No {filter === "all" ? "goals" : filter + " goals"}
          </CardTitle>
          <CardDescription>
            {filter === "all"
              ? "Add a goal when you are ready."
              : "Try another filter or update an existing goal."}
          </CardDescription>
        </Card>
      ) : (
        <Card className="gap-0 divide-y py-0">
          {goals.map((goal) => {
            const updating =
              statusMutation.isPending &&
              statusMutation.variables?.goal.uuid === goal.uuid;
            const overdue = isGoalOverdue(goal);
            return (
              <div
                key={goal.uuid}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <AreaIcon name={goal.icon || "Target"} className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium">{goal.title}</h3>
                      {overdue && <Badge variant="destructive">Overdue</Badge>}
                    </div>
                    {goal.description && (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {goal.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {goal.start_date && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          Started {formatDate(goal.start_date)}
                        </span>
                      )}
                      {goal.due_date && (
                        <span
                          className={
                            overdue ? "font-medium text-destructive" : ""
                          }
                        >
                          Due {formatDate(goal.due_date)}
                        </span>
                      )}
                      {!goal.start_date && !goal.due_date && (
                        <span>No dates set</span>
                      )}
                    </div>
                  </div>
                </div>
                <Select
                  items={goalStatuses}
                  value={goal.status}
                  disabled={archived || updating}
                  onValueChange={(value) =>
                    value && statusMutation.mutate({ goal, status: value })
                  }
                >
                  <SelectTrigger
                    className="w-full sm:w-36"
                    aria-label={`Status for ${goal.title}`}
                  >
                    <SelectValue>
                      <Badge
                        variant="outline"
                        className={goalStatusBadgeClassNames[goal.status]}
                      >
                        {goalStatusLabels[goal.status]}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {goalStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <Badge
                          variant="outline"
                          className={goalStatusBadgeClassNames[status.value]}
                        >
                          {status.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!archived && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${goal.title}`}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(goal)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      {allowDelete && (
                        <DropdownMenuItem
                          destructive
                          onClick={() => setGoalToDelete(goal)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </Card>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete goal?</DialogTitle>
            <DialogDescription>
              “{goalToDelete?.title}” will be permanently deleted. This action
              cannot be undone.
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
              {deleteMutation.isPending ? "Deleting…" : "Delete goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
        Page {page} of {lastPage}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= lastPage}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function isGoalOverdue(goal: Goal) {
  if (
    !goal.due_date ||
    goal.status === "completed" ||
    goal.status === "cancelled"
  )
    return false;
  return (
    new Date(`${goal.due_date.slice(0, 10)}T23:59:59`).getTime() < Date.now()
  );
}

function goalMatchesFilter(status: GoalStatus, filter: GoalFilter) {
  if (filter === "all") return true;
  if (filter === "active")
    return status === "pending" || status === "in_progress";
  return status === filter;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
