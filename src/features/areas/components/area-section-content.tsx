"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Link2,
  Pencil,
  Pin,
  Plus,
  Trash2,
  Unlink,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { areaService } from "../services/area-service";
import type {
  ApiResponse,
  Goal,
  GoalFilter,
  Habit,
  Note,
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

type AreaRecord = Goal | Habit | Note | Project | Resource;

export function AreaSectionContent({
  tab,
  data,
  goalCounts,
  goalFilter,
  loading,
  error,
  archived,
  areaUuid,
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

  const singular = "note";
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold capitalize">{tab}</h2>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} connected
          </p>
        </div>
        {!archived && tab === "notes" && (
          <Button size="sm" onClick={() => onAdd(singular)}>
            <Plus />
            Add {singular}
          </Button>
        )}
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
              onEdit={onEdit}
              onDelete={onDelete}
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
  onEdit,
  onDelete,
  onChanged,
}: {
  tab: AreaTab;
  record: AreaRecord;
  archived: boolean;
  areaUuid: string;
  onEdit: (kind: EditableAreaRecordKind, value: EditableAreaRecord) => void;
  onDelete: (kind: EditableAreaRecordKind, uuid: string) => void;
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
  const nested = tab === "habits" || tab === "notes";
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {tab === "notes" && (record as Note).is_pinned && (
            <Pin className="size-3" />
          )}
          {title}
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
        <CardContent className="flex-row justify-end">
          {nested ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onEdit(
                    tab.slice(0, -1) as "habit" | "note",
                    record as Habit | Note,
                  )
                }
              >
                <Pencil />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  onDelete(tab.slice(0, -1) as "habit" | "note", record.uuid)
                }
              >
                <Trash2 />
                Delete
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={detach.isPending}
              onClick={() => detach.mutate()}
            >
              <Unlink />
              Detach
            </Button>
          )}
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
  const query = useQuery<ApiResponse<(Project | Resource)[]>>({
    queryKey: [kind, "available"],
    queryFn: () =>
      kind === "projects"
        ? areaService.allProjects()
        : areaService.allResources(),
  });
  const linkedIds = new Set(linked.map((item) => item.uuid));
  const options = (query.data?.data ?? []).filter(
    (item) => !linkedIds.has(item.uuid),
  );
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
    <div className="flex max-w-md flex-1 justify-end gap-2">
      <select
        aria-label={`Select ${kind}`}
        className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        disabled={query.isLoading}
      >
        <option value="">
          {query.isLoading
            ? "Loading…"
            : `Select ${kind === "projects" ? "a project" : "a resource"}`}
        </option>
        {options.map((item) => (
          <option key={item.uuid} value={item.uuid}>
            {"name" in item ? item.name : item.title}
            {kind === "projects" && "area" in item && item.area
              ? ` (move from ${item.area.name})`
              : ""}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!selected || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        <Link2 />
        Link
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
  const item = record as Note;
  return {
    title: item.title,
    description: (
      <span className="line-clamp-3 whitespace-pre-wrap">{item.content}</span>
    ),
    badge: item.is_pinned ? "Pinned" : undefined,
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
