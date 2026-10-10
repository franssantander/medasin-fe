"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  CloudOff,
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
import { LoadingRegion } from "@/components/shared/loading-region";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Resource } from "@/features/resources/type";
import { useAreaSectionQueries } from "../hooks/use-area-section-queries";
import { HabitLinkDialog } from "@/features/habits/components/habit-link-dialog";
import { useHabitsQuery } from "@/features/habits/queries/habit-query";
import type { Habit as GlobalHabit } from "@/features/habits/type";
import {
  useAreaGoalQuery,
  useAreaHabitLinkMutation,
  useAreaMutation,
  useAreaQuery,
} from "../queries/area-query";
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
import { TabContentSkeleton } from "./area-skeletons";
import { GoalFormDialog } from "./goal-form-dialog";
import { HabitFormDialog } from "./habit-form-dialog";

const tabs: { value: AreaTab; label: string; icon: typeof FolderKanban }[] = [
  { value: "projects", label: "Projects", icon: Target },
  { value: "goals", label: "Goals", icon: StarCheck },
  { value: "habits", label: "Habits", icon: Flame },
  { value: "notes", label: "Notes", icon: FileText },
  { value: "resources", label: "Resources", icon: LucideLibraryBig },
];

type AreaDetailRouteContext = "areas" | "archives" | "projects";

export function AreaDetail({
  initialTab = "projects",
  initialNoteUuid,
  initialGoalUuid,
  routeContext = "areas",
  areaUuid,
  sourceProjectUuid,
}: {
  initialTab?: AreaTab;
  initialNoteUuid?: string;
  initialGoalUuid?: string;
  routeContext?: AreaDetailRouteContext;
  areaUuid?: string;
  sourceProjectUuid?: string;
}) {
  const params = useParams<{ uuid?: string }>();
  const uuid = areaUuid ?? params.uuid ?? "";
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
  const [linkHabitOpen, setLinkHabitOpen] = useState(false);
  const areaQuery = useAreaQuery(uuid);
  const area = areaQuery.data?.data;
  const linkedGoalQuery = useAreaGoalQuery(uuid, initialGoalUuid, Boolean(area));
  const linkedGoal = linkedGoalQuery.data?.data;
  const archived = Boolean(area?.archived_at);
  const updateArea = useAreaMutation("update", uuid);
  const archiveArea = useAreaMutation("archive", uuid);
  const restoreArea = useAreaMutation("restore", uuid);
  const removeArea = useAreaMutation("remove", uuid);
  const globalHabitsQuery = useHabitsQuery(linkHabitOpen && Boolean(area));
  const linkHabitMutation = useAreaHabitLinkMutation(uuid);
  const areaActionPending = archiveArea.isPending || removeArea.isPending;
  const { goalsQuery, invalidate, sectionQuery } = useAreaSectionQueries({
    areaUuid: uuid,
    tab: activeTab,
    page,
    goalFilter,
    enabled: Boolean(area),
  });

  const goalMutation = useMutation({
    mutationFn: ({ input, goalUuid }: { input: GoalInput; goalUuid?: string }) =>
      goalUuid
        ? areaService.updateGoal(uuid, goalUuid, input)
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

  const backContext =
    routeContext === "areas" && area?.archived_at ? "archives" : routeContext;
  const backHref =
    backContext === "archives"
      ? "/archives"
      : backContext === "projects"
        ? sourceProjectUuid
          ? `/projects/${sourceProjectUuid}`
          : "/projects"
        : "/areas";
  const backLabel =
    backContext === "projects" && sourceProjectUuid
      ? "project details"
      : backContext;

  if (areaQuery.isLoading) return <AreaDetailSkeleton tab={activeTab} />;
  if (areaQuery.isError || !area)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CloudOff />
          </EmptyMedia>
          <EmptyTitle>Area could not be loaded</EmptyTitle>
          <EmptyDescription>
            It may have been deleted, or your connection dropped.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={backHref} />}
          >
            <ArrowLeft />
            Back to {backLabel}
          </Button>
          <Button
            disabled={areaQuery.isFetching}
            onClick={() => areaQuery.refetch()}
          >
            <RefreshCw />
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    );

  const changeTab = (tab: AreaTab) => {
    setActiveTab(tab);
    setPage(1);
    const detailPath =
      routeContext === "archives"
        ? `/archives/areas/${uuid}`
        : routeContext === "projects"
          ? sourceProjectUuid
            ? `/projects/${sourceProjectUuid}/areas/${uuid}`
            : `/projects/areas/${uuid}`
          : `/areas/${uuid}`;
    router.replace(`${detailPath}?tab=${tab}`, { scroll: false });
  };
  const restoreArchivedArea = () => {
    restoreArea.mutate(undefined, {
      onSuccess: () => {
        if (routeContext === "archives") {
          router.replace(`/areas/${uuid}?tab=${activeTab}`, { scroll: false });
        }
      },
    });
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
      router.replace(
        routeContext === "projects" && sourceProjectUuid
          ? `/projects/${sourceProjectUuid}`
          : routeContext === "projects"
            ? "/projects"
            : "/areas",
      );
    }
  };
  const linkHabit = async (habit: GlobalHabit) => {
    await linkHabitMutation.mutateAsync(habit.uuid);
  };

  const projectDetailBasePath =
    routeContext === "archives"
      ? "/archives/projects"
      : routeContext === "projects"
        ? "/projects"
        : `/areas/${uuid}/projects`;

  return (
    <div className="flex min-h-full flex-col gap-5">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1 text-sm"
      >
        <Link
          href={backHref}
          aria-label={`Back to ${backLabel}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="capitalize">{backLabel}</span>
        </Link>
        <ChevronRight
          className="size-3.5 shrink-0 text-muted-foreground/60"
          aria-hidden="true"
        />
        <span aria-current="page" className="truncate font-medium">
          {area.name}
        </span>
      </nav>
      <AreaDetailHeader
        area={area}
        archived={archived}
        restorePending={restoreArea.isPending}
        onRestore={restoreArchivedArea}
        onEdit={() => setAreaFormOpen(true)}
        onAction={setConfirmationAction}
      />
      <Tabs
        value={activeTab}
        onValueChange={(value) => changeTab(value as AreaTab)}
      >
        <div className="overflow-x-auto border-b">
          <TabsList variant="line" className="justify-start">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="flex-none px-3">
                <Icon />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      {initialGoalUuid && linkedGoalQuery.isError && (
        <Alert variant="destructive">
          <CloudOff aria-hidden="true" />
          <AlertTitle>Goal could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>The linked goal may have been removed.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void linkedGoalQuery.refetch()}
            >
              <RefreshCw />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div
        className={
          activeTab === "notes"
            ? "flex h-[min(48rem,calc(100dvh-14rem))] min-h-[32rem] min-w-0"
            : "min-w-0"
        }
      >
        {activeTab === "notes" ? (
          <AreaNotesWorkspace
            areaUuid={uuid}
            archived={archived}
            initialNoteUuid={initialNoteUuid}
          />
        ) : (
          <div className="w-full">
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
              projectDetailBasePath={projectDetailBasePath}
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
                if (kind !== "habit") return Promise.resolve();
                return deleteRecord
                  .mutateAsync({ recordUuid })
                  .then(() => undefined);
              }}
              onLinkHabit={() => setLinkHabitOpen(true)}
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
          goalMutation
            .mutateAsync({ input, goalUuid: goalForm?.value?.uuid })
            .then(() => undefined)
        }
      />
      {initialGoalUuid && linkedGoal && (
        <LinkedGoalDialog
          key={initialGoalUuid}
          goal={linkedGoal}
          isPending={goalMutation.isPending}
          onSubmit={(input) =>
            goalMutation
              .mutateAsync({ input, goalUuid: linkedGoal.uuid })
              .then(() => undefined)
          }
        />
      )}
      <HabitFormDialog
        open={Boolean(recordForm)}
        habit={recordForm?.value}
        onOpenChange={(open) => {
          if (!open) setRecordForm(undefined);
        }}
        isPending={recordMutation.isPending}
        onSubmit={(input) =>
          recordMutation.mutateAsync(input).then(() => undefined)
        }
      />
      <HabitLinkDialog
        open={linkHabitOpen}
        areaUuid={uuid}
        habits={globalHabitsQuery.data?.data ?? []}
        loading={globalHabitsQuery.isLoading}
        pending={linkHabitMutation.isPending}
        onOpenChange={setLinkHabitOpen}
        onLink={linkHabit}
      />
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

function LinkedGoalDialog({
  goal,
  isPending,
  onSubmit,
}: {
  goal: Goal;
  isPending: boolean;
  onSubmit: (input: GoalInput) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <GoalFormDialog
      open={open}
      goal={goal}
      isPending={isPending}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setOpen(false);
          const params = new URLSearchParams(window.location.search);
          params.delete("goal");
          const query = params.toString();
          router.replace(
            `${window.location.pathname}${query ? `?${query}` : ""}`,
            { scroll: false },
          );
        }
      }}
      onSubmit={onSubmit}
    />
  );
}

function AreaDetailSkeleton({ tab }: { tab: AreaTab }) {
  return (
    <LoadingRegion label="Loading area" className="flex flex-col gap-5">
      <div className="flex items-center gap-2 py-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Card className="gap-0 py-0">
        <Skeleton className="h-32 rounded-none sm:h-40" />
        <CardContent className="grid gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="relative z-1 -mt-12 size-16 rounded-2xl ring-4 ring-card sm:-mt-14" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="size-9" />
            </div>
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-1 overflow-hidden border-b pb-2">
        {tabs.map(({ value, label }) => (
          <Skeleton
            key={value}
            className="h-7 shrink-0"
            style={{ width: `${label.length * 0.5 + 2.5}rem` }}
          />
        ))}
      </div>
      {tab === "notes" ? (
        <div className="flex h-[min(48rem,calc(100dvh-14rem))] min-h-[32rem] min-w-0">
          <TabContentSkeleton tab={tab} />
        </div>
      ) : (
        <TabContentSkeleton tab={tab} />
      )}
    </LoadingRegion>
  );
}
