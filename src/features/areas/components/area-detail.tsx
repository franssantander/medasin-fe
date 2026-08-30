"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Flame,
  FolderKanban,
  LucideLibraryBig,
  RefreshCw,
  StarCheck,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AreaNotesWorkspace } from "./area-notes-workspace";
import { AreaSectionContent } from "./area-section-content";
import { GoalFormDialog } from "./goal-form-dialog";
import { HabitFormDialog } from "./habit-form-dialog";

const tabs: { value: AreaTab; label: string; icon: typeof FolderKanban }[] = [
  { value: "projects", label: "Projects", icon: Target },
  { value: "goals", label: "Goals", icon: StarCheck },
  { value: "habits", label: "Habits", icon: Flame },
  { value: "notes", label: "Notes", icon: FileText },
  { value: "resources", label: "Resources", icon: LucideLibraryBig },
];

export function AreaDetail({
  initialTab = "projects",
  initialNoteUuid,
}: {
  initialTab?: AreaTab;
  initialNoteUuid?: string;
}) {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AreaTab>(initialTab);
  const [page, setPage] = useState(1);
  const [goalFilter, setGoalFilter] = useState<GoalFilter>("all");
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] =
    useState<AreaConfirmationAction>();
  const [goalForm, setGoalForm] = useState<{ value?: Goal }>();
  const [recordForm, setRecordForm] = useState<{
    kind: "habit";
    value?: Habit;
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
    mutationFn: async (input: HabitInput) => {
      if (!recordForm) throw new Error("No record selected.");
      return recordForm.value
        ? areaService.updateHabit(uuid, recordForm.value.uuid, input)
        : areaService.createHabit(uuid, input);
    },
    onSuccess: (response) => invalidate(response.message),
  });
  const deleteRecord = useMutation({
    mutationFn: ({ recordUuid }: { recordUuid: string }) =>
      areaService.removeHabit(uuid, recordUuid),
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
    router.replace(`/areas/${uuid}?tab=${tab}`, { scroll: false });
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
    <div className="flex min-h-full flex-col gap-5">
      <div>
        <Button
          render={<Link href={archived ? "/archives" : "/areas"} />}
          nativeButton={false}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft />
          Back to {archived ? "archives" : "areas"}
        </Button>
      </div>
      <div>
        <AreaDetailHeader
          area={area}
          archived={archived}
          restorePending={restoreArea.isPending}
          onRestore={() => restoreArea.mutate()}
          onEdit={() => setAreaFormOpen(true)}
          onAction={setConfirmationAction}
        />
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => changeTab(value as AreaTab)}
      >
        <TabsList variant="line">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex h-[48rem] min-h-0 min-w-0">
        {activeTab === "notes" ? (
          <AreaNotesWorkspace
            areaUuid={uuid}
            archived={archived}
            initialNoteUuid={initialNoteUuid}
          />
        ) : (
          <div className="h-full w-full">
            <AreaSectionContent
              tab={activeTab}
              data={
                (activeTab === "goals"
                  ? goalsQuery.data?.data.items
                  : sectionQuery.data?.data) as
                  | Paginated<Goal | Habit | Project | Resource>
                  | undefined
              }
              goalCounts={goalsQuery.data?.data.counts}
              goalFilter={goalFilter}
              loading={
                activeTab === "goals"
                  ? goalsQuery.isLoading
                  : sectionQuery.isLoading
              }
              error={
                activeTab === "goals"
                  ? goalsQuery.isError
                  : sectionQuery.isError
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
                else setRecordForm({ kind, value: value as Habit });
              }}
              onDelete={(kind, recordUuid) => {
                if (kind === "habit" && window.confirm("Delete this record?"))
                  deleteRecord.mutate({ recordUuid });
              }}
              onChanged={invalidate}
            />
          </div>
        )}
      </div>
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
      {recordForm && (
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
