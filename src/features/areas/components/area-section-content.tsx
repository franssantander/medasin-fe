"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FolderKanban, Link2, Unlink } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { areaService } from "../services/area-service";
import { useResourcesQuery } from "@/features/resources/queries/resource-query";
import type {
  ApiResponse,
  Goal,
  GoalFilter,
  Habit,
  Paginated,
  Project,
  Resource,
} from "../type";
import type {
  AreaTab,
  EditableAreaRecord,
  EditableAreaRecordKind,
} from "./area-detail-types";
import { GoalTracker } from "./goal-tracker";
import { HabitTracker } from "./habit-tracker";

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
  onDelete: (kind: EditableAreaRecordKind, uuid: string) => void;
  onChanged: (message: string) => Promise<void>;
}) {
  if (loading) return <Skeleton className="h-64 rounded-xl" />;
  if (error)
    return (
      <Card className="items-center py-12">
        <CardTitle>Could not load {tab}</CardTitle>
        <Button variant="outline" onClick={refetch}>
          Try again
        </Button>
      </Card>
    );
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
      <HabitTracker
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
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold capitalize">{tab}</h2>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} connected
          </p>
        </div>
        {!archived && (tab === "projects" || tab === "resources") && (
          <LinkPicker
            areaUuid={areaUuid}
            kind={tab}
            linked={records}
            onChanged={onChanged}
          />
        )}
      </div>
      {records.length === 0 ? (
        <Card className="items-center py-12 text-center">
          <CardTitle>No {tab} yet</CardTitle>
          <CardDescription>Add or link one when you are ready.</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {records.map((record) => (
            <RecordCard
              key={record.uuid}
              tab={tab}
              record={record}
              archived={archived}
              areaUuid={areaUuid}
              projectDetailBasePath={projectDetailBasePath}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
      {data && data.last_page > 1 && (
        <Pagination page={page} lastPage={data.last_page} setPage={setPage} />
      )}
    </div>
  );
}

function RecordCard({
  tab,
  record,
  archived,
  areaUuid,
  projectDetailBasePath,
  onChanged,
}: {
  tab: AreaTab;
  record: AreaRecord;
  archived: boolean;
  areaUuid: string;
  projectDetailBasePath: string;
  onChanged: (message: string) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const detach = useMutation({
    mutationFn: () =>
      tab === "projects"
        ? areaService.detachProject(areaUuid, record.uuid)
        : areaService.detachResource(areaUuid, record.uuid),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ["areas", "detail", areaUuid],
      });
      await onChanged(response.message);
    },
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });
  const { title, description, badge } = getRecordDisplay(tab, record);
  const isProject = tab === "projects";

  return (
    <Card
      size="sm"
      className={
        isProject
          ? "relative gap-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          : undefined
      }
    >
      {isProject && (
        <Link
          href={`${projectDetailBasePath}/${record.uuid}`}
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Open ${String(title)}`}
        />
      )}
      <CardHeader className={isProject ? "pointer-events-none" : undefined}>
        <CardTitle className="flex min-w-0 items-center gap-2">
          {isProject && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FolderKanban className="size-4" />
            </span>
          )}
          <span className="truncate">{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {badge && (
          <CardAction>
            <Badge variant="secondary" className="capitalize">
              {badge}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {!archived && (
        <CardContent className="pointer-events-none relative z-10 flex-row justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="pointer-events-auto"
            disabled={detach.isPending}
            onClick={() => detach.mutate()}
          >
            <Unlink />
            Detach
          </Button>
          {tab === "resources" && (record as Resource).url && (
            <Button
              render={
                <a
                  href={(record as Resource).url!}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              nativeButton={false}
              variant="ghost"
              size="icon-sm"
              className="pointer-events-auto"
              aria-label="Open resource"
            >
              <ExternalLink />
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function LinkPicker({
  areaUuid,
  kind,
  linked,
  onChanged,
}: {
  areaUuid: string;
  kind: "projects" | "resources";
  linked: AreaRecord[];
  onChanged: (message: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  const projectsQuery = useQuery({
    queryKey: ["projects", "available"],
    queryFn: () => areaService.allProjects(),
    enabled: kind === "projects",
  });
  const resourcesQuery = useResourcesQuery({}, kind === "resources");
  const query = kind === "projects" ? projectsQuery : resourcesQuery;
  const available: (Project | Resource)[] =
    kind === "projects"
      ? (projectsQuery.data?.data ?? [])
      : [
          ...new Map(
            resourcesQuery.data?.pages
              .flatMap((page) => page.data.data)
              .map((resource) => [resource.uuid, resource]),
          ).values(),
        ];
  const linkedIds = new Set(linked.map((item) => item.uuid));
  const options = available.filter((item) => !linkedIds.has(item.uuid));
  const selectedItem = options.find((item) => item.uuid === selected);
  const selectedLabel = selectedItem
    ? "name" in selectedItem
      ? selectedItem.name
      : selectedItem.title
    : undefined;
  const selectPlaceholder = query.isLoading
    ? `Loading ${kind}…`
    : query.isError
      ? `${kind === "projects" ? "Projects" : "Resources"} unavailable`
      : options.length === 0
        ? `No ${kind} available`
        : `Choose ${kind === "projects" ? "a project" : "a resource"}`;
  const mutation = useMutation<ApiResponse<Project | Resource>>({
    mutationFn: () =>
      kind === "projects"
        ? areaService.linkProject(areaUuid, selected)
        : areaService.linkResource(areaUuid, selected),
    onSuccess: async (response) => {
      setSelected("");
      await onChanged(response.message);
    },
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });
  return (
    <div className="flex w-full gap-2 sm:max-w-md sm:flex-1 sm:justify-end">
      <Select
        value={selected}
        onValueChange={(value) => setSelected(value ?? "")}
        disabled={query.isLoading || options.length === 0}
      >
        <SelectTrigger
          size="sm"
          className="min-w-0 flex-1 bg-background"
          aria-label={`Select ${kind === "projects" ? "a project" : "a resource"} to link`}
        >
          {kind === "projects" && <FolderKanban />}
          <SelectValue placeholder={selectPlaceholder}>
            {selectedLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((item) => {
            const label = "name" in item ? item.name : item.title;
            return (
              <SelectItem key={item.uuid} value={item.uuid}>
                <span className="min-w-0">
                  <span className="block truncate">{label}</span>
                  {kind === "projects" && "area" in item && item.area && (
                    <span className="block truncate text-xs text-muted-foreground">
                      Move from {item.area.name}
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {kind === "resources" && resourcesQuery.hasNextPage && (
        <Button
          size="sm"
          variant="outline"
          disabled={resourcesQuery.isFetchingNextPage}
          onClick={() => resourcesQuery.fetchNextPage()}
        >
          {resourcesQuery.isFetchingNextPage
            ? "Loading…"
            : resourcesQuery.isFetchNextPageError
              ? "Retry more"
              : "Load more"}
        </Button>
      )}
      {query.isError && (
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          Retry
        </Button>
      )}
      <Button
        size="sm"
        disabled={!selected || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        <Link2 />
        {mutation.isPending ? "Linking…" : "Link"}
      </Button>
    </div>
  );
}

function getRecordDisplay(
  tab: AreaTab,
  record: AreaRecord,
): { title: string; description: ReactNode; badge?: string } {
  if (tab === "projects") {
    const item = record as Project;
    return {
      title: item.name,
      description: item.description || "No description.",
      badge: item.status,
    };
  }
  if (tab === "resources") {
    const item = record as Resource;
    return {
      title: item.title,
      description:
        item.author || item.source || item.description || "No details.",
      badge: item.type || undefined,
    };
  }
  if (tab === "habits") {
    const item = record as Habit;
    return {
      title: item.name,
      description: item.description || "No description.",
      badge: `${item.frequency}${item.is_active ? "" : " · paused"}`,
    };
  }
  const item = record as Habit;
  return {
    title: item.name,
    description: item.description || "No description.",
    badge: item.frequency,
  };
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
