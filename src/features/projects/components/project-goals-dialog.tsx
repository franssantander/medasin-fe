"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, StarCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { GoalFormDialog } from "@/features/areas/components/goal-form-dialog";
import { GoalTracker } from "@/features/areas/components/goal-tracker";
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import type { Goal, GoalFilter, GoalInput } from "@/features/areas/type";
import { projectKeys } from "../queries/project-query";

export function ProjectGoalsDialog({
  open,
  onOpenChange,
  areaUuid,
  areaName,
  projectName,
  archived,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaUuid: string;
  areaName: string;
  projectName: string;
  archived: boolean;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [goalForm, setGoalForm] = useState<{ value?: Goal }>();
  const goalsQuery = useQuery({
    queryKey: areaKeys.section(areaUuid, "goals", page, filter),
    queryFn: () => areaService.goals(areaUuid, page, filter),
    enabled: open,
  });

  const refreshGoals = async (message: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: areaKeys.detail(areaUuid) }),
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    ]);
    toast.add({ type: "success", description: message });
  };
  const goalMutation = useMutation({
    mutationFn: (input: GoalInput) =>
      goalForm?.value
        ? areaService.updateGoal(areaUuid, goalForm.value.uuid, input)
        : areaService.createGoal(areaUuid, input),
    onSuccess: (response) => refreshGoals(response.message),
  });

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setPage(1);
      setFilter("all");
      setGoalForm(undefined);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="border-b pb-4">
            <div className="flex flex-col gap-4 pr-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <StarCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl">Project goals</DialogTitle>
                  <DialogDescription className="mt-1">
                    Manage the goals from {areaName} that support {projectName}.
                  </DialogDescription>
                </div>
              </div>
              {!archived && (
                <Button
                  size="sm"
                  className="shrink-0 self-start"
                  onClick={() => setGoalForm({})}
                >
                  <Plus />
                  Add goal
                </Button>
              )}
            </div>
          </DialogHeader>

          {goalsQuery.isLoading ? (
            <div className="grid gap-3" aria-label="Loading goals">
              <Skeleton className="h-9 w-full sm:w-96" />
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : goalsQuery.isError ? (
            <Card className="items-center py-12 text-center">
              <CardTitle>Goals could not be loaded</CardTitle>
              <CardDescription>
                Check your connection and try loading the goals again.
              </CardDescription>
              <Button variant="outline" onClick={() => goalsQuery.refetch()}>
                <RefreshCw />
                Try again
              </Button>
            </Card>
          ) : (
            <GoalTracker
              goals={goalsQuery.data?.data.items.data ?? []}
              counts={goalsQuery.data?.data.counts}
              filter={filter}
              archived={archived}
              areaUuid={areaUuid}
              page={page}
              pagination={goalsQuery.data?.data.items}
              setPage={setPage}
              onFilterChange={(nextFilter) => {
                setFilter(nextFilter);
                setPage(1);
              }}
              onAdd={() => setGoalForm({})}
              onEdit={(goal) => setGoalForm({ value: goal })}
              onChanged={refreshGoals}
              showHeader={false}
              allowDelete
            />
          )}
        </DialogContent>
      </Dialog>

      <GoalFormDialog
        open={Boolean(goalForm)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setGoalForm(undefined);
        }}
        goal={goalForm?.value}
        isPending={goalMutation.isPending}
        onSubmit={(input) =>
          goalMutation.mutateAsync(input).then(() => undefined)
        }
      />
    </>
  );
}
