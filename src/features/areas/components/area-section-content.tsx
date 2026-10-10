"use client";

import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { Resource } from "@/features/resources/type";
import type { Goal, GoalFilter, Habit, Paginated, Project } from "../type";
import type {
  AreaTab,
  EditableAreaRecord,
  EditableAreaRecordKind,
} from "./area-detail-types";
import { TabContentSkeleton } from "./area-skeletons";
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
  onLinkHabit,
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
  onLinkHabit: () => void;
  onChanged: (message: string) => Promise<void>;
}) {
  if (loading) {
    return (
      <TabContentSkeleton tab={tab} />
    );
  }
  if (error) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CloudOff />
          </EmptyMedia>
          <EmptyTitle>Could not load {tab}</EmptyTitle>
          <EmptyDescription>Check your connection and try again.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={refetch}>
            Try again
          </Button>
        </EmptyContent>
      </Empty>
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
        onLink={onLinkHabit}
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
