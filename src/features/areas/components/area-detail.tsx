"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  FolderKanban,
  Link2,
  ListChecks,
  RefreshCw,
  Repeat2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreaSectionQueries } from "../hooks/use-area-section-queries";
import { useAreaMutation, useAreaQuery } from "../queries/area-query";
import { areaService } from "../services/area-service";
import type {
  AreaInput,
  Goal,
  GoalFilter,
  GoalInput,
  Habit,
  HabitInput,
  Note,
  NoteInput,
  Paginated,
  Project,
  Resource,
} from "../type";
import {
  AreaActionDialog,
  type AreaConfirmationAction,
} from "./area-action-dialog";
import type { AreaTab } from "./area-detail-types";
import { AreaDetailHeader } from "./area-detail-header";
import { AreaFormDialog } from "./area-form-dialog";
import { AreaSectionContent } from "./area-section-content";
import { GoalFormDialog } from "./goal-form-dialog";
import { HabitFormDialog } from "./habit-form-dialog";
import { RecordFormSheet } from "./record-form-sheet";

const tabs: { value: AreaTab; label: string; icon: typeof FolderKanban }[] = [
  { value: "projects", label: "Projects", icon: FolderKanban },
  { value: "goals", label: "Goals", icon: ListChecks },
  { value: "habits", label: "Habits", icon: Repeat2 },
  { value: "notes", label: "Notes", icon: FileText },
  { value: "resources", label: "Resources", icon: Link2 },
];

export function AreaDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AreaTab>("projects");
  const [page, setPage] = useState(1);
  const [goalFilter, setGoalFilter] = useState<GoalFilter>("all");
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] =
    useState<AreaConfirmationAction>();
  const [goalForm, setGoalForm] = useState<{ value?: Goal }>();
  const [recordForm, setRecordForm] = useState<{
    kind: "habit" | "note";
    value?: Habit | Note;
  }>();
  const areaQuery = useAreaQuery(uuid);
  const area = areaQuery.data?.data;
  const archived = Boolean(area?.archived_at);
  const updateArea = useAreaMutation("update", uuid);
  const archiveArea = useAreaMutation("archive", uuid);
  const restoreArea = useAreaMutation("restore", uuid);
  const removeArea = useAreaMutation("remove", uuid);
  const areaActionPending = archiveArea.isPending || removeArea.isPending;
  const { goalsQuery, invalidate, sectionQuery } = useAreaSectionQueries({
    areaUuid: uuid,
    tab: activeTab,
    page,
    goalFilter,
    enabled: Boolean(area),
  });

  const goalMutation = useMutation({
    mutationFn: (input: GoalInput) =>
      goalForm?.value
        ? areaService.updateGoal(uuid, goalForm.value.uuid, input)
        : areaService.createGoal(uuid, input),
    onSuccess: (response) => invalidate(response.message),
  });
  const recordMutation = useMutation({
    mutationFn: async (input: HabitInput | NoteInput) => {
      if (!recordForm) throw new Error("No record selected.");
      if (recordForm.kind === "habit")
        return recordForm.value
          ? areaService.updateHabit(
              uuid,
              recordForm.value.uuid,
              input as HabitInput,
            )
          : areaService.createHabit(uuid, input as HabitInput);
      return recordForm.value
        ? areaService.updateNote(
            uuid,
            recordForm.value.uuid,
            input as NoteInput,
          )
        : areaService.createNote(uuid, input as NoteInput);
    },
    onSuccess: (response) => invalidate(response.message),
  });
  const deleteRecord = useMutation({
    mutationFn: ({
      kind,
      recordUuid,
    }: {
      kind: "habit" | "note";
      recordUuid: string;
    }) =>
      kind === "habit"
        ? areaService.removeHabit(uuid, recordUuid)
        : areaService.removeNote(uuid, recordUuid),
    onSuccess: (response) => invalidate(response.message),
  });

  if (areaQuery.isLoading)
    return (
      <div className="grid gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  if (areaQuery.isError || !area)
    return (
      <Card className="items-center py-14 text-center">
        <CardTitle>Area could not be loaded</CardTitle>
        <Button variant="outline" onClick={() => areaQuery.refetch()}>
          <RefreshCw />
          Try again
        </Button>
      </Card>
    );

  const changeTab = (tab: AreaTab) => {
    setActiveTab(tab);
    setPage(1);
  };
  const confirmAreaAction = async () => {
    if (confirmationAction === "archive") {
      await archiveArea.mutateAsync();
      setConfirmationAction(undefined);
      return;
    }
    if (confirmationAction === "delete") {
      await removeArea.mutateAsync();
      setConfirmationAction(undefined);
      router.replace("/areas");
    }
  };

  return (
    <div className="grid gap-5">
      <div>
        <Button
          render={<Link href={archived ? "/archives" : "/areas"} />}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft />
          Back to {archived ? "archives" : "areas"}
        </Button>
      </div>
      <AreaDetailHeader
        area={area}
        archived={archived}
        restorePending={restoreArea.isPending}
        onRestore={() => restoreArea.mutate()}
        onEdit={() => setAreaFormOpen(true)}
        onAction={setConfirmationAction}
      />
      <div
        className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1"
        role="tablist"
      >
        {tabs.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={activeTab === value ? "secondary" : "ghost"}
            className="flex-1"
            onClick={() => changeTab(value)}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </div>
      <AreaSectionContent
        tab={activeTab}
        data={
          (activeTab === "goals"
            ? goalsQuery.data?.data.items
            : sectionQuery.data?.data) as
            | Paginated<Goal | Habit | Note | Project | Resource>
            | undefined
        }
        goalCounts={goalsQuery.data?.data.counts}
        goalFilter={goalFilter}
        loading={
          activeTab === "goals" ? goalsQuery.isLoading : sectionQuery.isLoading
        }
        error={
          activeTab === "goals" ? goalsQuery.isError : sectionQuery.isError
        }
        archived={archived}
        areaUuid={uuid}
        page={page}
        setPage={setPage}
        refetch={() => {
          if (activeTab === "goals") void goalsQuery.refetch();
          else void sectionQuery.refetch();
        }}
        onGoalFilterChange={(filter) => {
          setGoalFilter(filter);
          setPage(1);
        }}
        onAdd={(kind) => {
          if (kind === "goal") setGoalForm({});
          else setRecordForm({ kind });
        }}
        onEdit={(kind, value) => {
          if (kind === "goal") setGoalForm({ value: value as Goal });
          else setRecordForm({ kind, value: value as Habit | Note });
        }}
        onDelete={(kind, recordUuid) => {
          if (kind !== "goal" && window.confirm("Delete this record?"))
            deleteRecord.mutate({ kind, recordUuid });
        }}
        onChanged={invalidate}
      />
      <AreaFormDialog
        open={areaFormOpen}
        onOpenChange={setAreaFormOpen}
        area={area}
        isPending={updateArea.isPending}
        onSubmit={(input: AreaInput) =>
          updateArea.mutateAsync(input).then(() => undefined)
        }
      />
      <GoalFormDialog
        open={Boolean(goalForm)}
        onOpenChange={(open) => {
          if (!open) setGoalForm(undefined);
        }}
        goal={goalForm?.value}
        isPending={goalMutation.isPending}
        onSubmit={(input) =>
          goalMutation.mutateAsync(input).then(() => undefined)
        }
      />
      {recordForm?.kind === "habit" && (
        <HabitFormDialog
          open
          habit={recordForm.value as Habit | undefined}
          onOpenChange={(open) => {
            if (!open) setRecordForm(undefined);
          }}
          isPending={recordMutation.isPending}
          onSubmit={(input) =>
            recordMutation.mutateAsync(input).then(() => undefined)
          }
        />
      )}
      {recordForm?.kind === "note" && (
        <RecordFormSheet
          kind={recordForm.kind}
          value={recordForm.value}
          open
          onOpenChange={(open) => {
            if (!open) setRecordForm(undefined);
          }}
          isPending={recordMutation.isPending}
          onSubmit={(input) =>
            recordMutation.mutateAsync(input).then(() => undefined)
          }
        />
      )}
      <AreaActionDialog
        action={confirmationAction}
        area={area}
        isPending={areaActionPending}
        onConfirm={confirmAreaAction}
        onOpenChange={(open) => {
          if (!open && !areaActionPending) setConfirmationAction(undefined);
        }}
      />
    </div>
  );
}
