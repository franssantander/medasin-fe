"use client";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Resource } from "@/features/resources/type";
import type { Goal, GoalFilter, Habit, Paginated, Project } from "../type";
import type {
  AreaTab,
  EditableAreaRecord,
  EditableAreaRecordKind,
} from "./area-detail-types";
import { GoalTracker } from "./goal-tracker";
import { HabitSectionContent } from "./habit-section-content";
import { LinkedRecordsSection } from "./linked-records-section";

type AreaRecord = Goal | Habit | Project | Resource;

export function AreaSectionContent({
  tab,
  data,
  goalCounts,
  goalFilter,
  loading,
  error,
  archived,
  areaUuid,
  projectDetailBasePath,
  page,
  setPage,
  refetch,
  onGoalFilterChange,
  onAdd,
  onEdit,
  onDelete,
  onChanged,
}: {
  tab: AreaTab;
  data?: Paginated<AreaRecord>;
  goalCounts?: Record<GoalFilter, number>;
  goalFilter: GoalFilter;
  loading: boolean;
  error: boolean;
  archived: boolean;
  areaUuid: string;
  projectDetailBasePath: string;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
  onGoalFilterChange: (filter: GoalFilter) => void;
  onAdd: (kind: EditableAreaRecordKind) => void;
  onEdit: (kind: EditableAreaRecordKind, value: EditableAreaRecord) => void;
  onDelete: (kind: EditableAreaRecordKind, uuid: string) => Promise<void>;
  onChanged: (message: string) => Promise<void>;
}) {
  if (loading) return <Skeleton className="h-64 rounded-xl" />;
  if (error) {
    return (
      <Card className="items-center py-12">
        <CardTitle>Could not load {tab}</CardTitle>
        <Button variant="outline" onClick={refetch}>
          Try again
        </Button>
      </Card>
    );
  }

  const records = data?.data ?? [];

  if (tab === "goals") {
    return (
      <GoalTracker
        goals={records as Goal[]}
        counts={goalCounts}
        filter={goalFilter}
        archived={archived}
        areaUuid={areaUuid}
        page={page}
        pagination={data as Paginated<Goal> | undefined}
        setPage={setPage}
        onFilterChange={onGoalFilterChange}
        onAdd={() => onAdd("goal")}
        onEdit={(goal) => onEdit("goal", goal)}
        onChanged={onChanged}
      />
    );
  }

  if (tab === "habits") {
    return (
      <HabitSectionContent
        habits={records as Habit[]}
        pagination={data as Paginated<Habit> | undefined}
        archived={archived}
        areaUuid={areaUuid}
        page={page}
        setPage={setPage}
        onAdd={() => onAdd("habit")}
        onEdit={(habit) => onEdit("habit", habit)}
        onDelete={(uuid) => onDelete("habit", uuid)}
      />
    );
  }

  return (
    <LinkedRecordsSection
      kind={tab as "projects" | "resources"}
      data={data as Paginated<Project | Resource> | undefined}
      archived={archived}
      areaUuid={areaUuid}
      projectDetailBasePath={projectDetailBasePath}
      page={page}
      setPage={setPage}
      onChanged={onChanged}
    />
  );
}
