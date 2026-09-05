"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ExternalLink,
  FolderKanban,
  Link2,
  LoaderCircle,
  Search,
  Target,
  Trash2,
  TriangleAlert,
  Unlink,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  projectStatusBadgeClassNames,
  projectStatusLabels,
} from "@/features/projects/project-status";
import { projectKeys } from "@/features/projects/queries/project-query";
import { ResourceDetailDialog } from "@/features/resources/components/resource-detail-dialog";
import {
  ResourceIcon,
  resourceBadgeStyle,
} from "@/features/resources/components/resource-icons";
import {
  useResourceQuery,
  useResourcesQuery,
} from "@/features/resources/queries/resource-query";
import type { Resource as ResourceDetail } from "@/features/resources/type";
import { areaKeys } from "../queries/area-query";
import { areaService } from "../services/area-service";
import type {
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
  onDelete: (kind: EditableAreaRecordKind, uuid: string) => Promise<void>;
  onChanged: (message: string) => Promise<void>;
}) {
  const [selectedResourceUuid, setSelectedResourceUuid] = useState<string>();
  const [habitToDelete, setHabitToDelete] = useState<Habit>();
  const [habitDeletePending, setHabitDeletePending] = useState(false);
  const selectedResourceQuery = useResourceQuery(selectedResourceUuid);

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
      <>
        <HabitTracker
          habits={records as Habit[]}
          pagination={data as Paginated<Habit> | undefined}
          archived={archived}
          areaUuid={areaUuid}
          page={page}
          setPage={setPage}
          onAdd={() => onAdd("habit")}
          onEdit={(habit) => onEdit("habit", habit)}
          onDelete={(uuid) =>
            setHabitToDelete(
              (records as Habit[]).find((habit) => habit.uuid === uuid),
            )
          }
        />
        <Dialog
          open={Boolean(habitToDelete)}
          onOpenChange={(open) => {
            if (!open && !habitDeletePending) setHabitToDelete(undefined);
          }}
        >
          <DialogContent className="w-full max-w-md overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>Delete habit?</DialogTitle>
              <DialogDescription>
                “{habitToDelete?.name}” and its check-in history will move to
                Trash for 30 days and can be restored from Settings.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={habitDeletePending}
                onClick={() => setHabitToDelete(undefined)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={habitDeletePending}
                onClick={async () => {
                  if (!habitToDelete) return;
                  setHabitDeletePending(true);
                  try {
                    await onDelete("habit", habitToDelete.uuid);
                    setHabitToDelete(undefined);
                  } finally {
                    setHabitDeletePending(false);
                  }
                }}
              >
                {habitDeletePending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                {habitDeletePending ? "Deleting…" : "Delete habit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
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
              onOpenResource={setSelectedResourceUuid}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
      {data && data.last_page > 1 && (
        <Pagination page={page} lastPage={data.last_page} setPage={setPage} />
      )}
      {selectedResourceQuery.data?.data && (
        <ResourceDetailDialog
          resource={selectedResourceQuery.data.data}
          onClose={() => setSelectedResourceUuid(undefined)}
        />
      )}
      {selectedResourceUuid && !selectedResourceQuery.data?.data && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setSelectedResourceUuid(undefined);
          }}
        >
          <DialogContent className="w-full max-w-md overflow-x-hidden">
            {selectedResourceQuery.isError ? (
              <>
                <DialogHeader>
                  <DialogTitle>Resource could not be loaded</DialogTitle>
                  <DialogDescription>
                    Check your connection and try opening the resource again.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedResourceUuid(undefined)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => selectedResourceQuery.refetch()}
                  >
                    Try again
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading resource…
              </div>
            )}
          </DialogContent>
        </Dialog>
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
  onOpenResource,
  onChanged,
}: {
  tab: AreaTab;
  record: AreaRecord;
  archived: boolean;
  areaUuid: string;
  projectDetailBasePath: string;
  onOpenResource: (resourceUuid: string) => void;
  onChanged: (message: string) => Promise<void>;
}) {
  const [detachConfirmationOpen, setDetachConfirmationOpen] = useState(false);
  const queryClient = useQueryClient();
  const detach = useMutation({
    mutationFn: () =>
      tab === "projects"
        ? areaService.detachProject(areaUuid, record.uuid)
        : areaService.detachResource(areaUuid, record.uuid),
    onSuccess: async (response) => {
      setDetachConfirmationOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: areaKeys.all }),
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      ]);
      await onChanged(response.message);
    },
    onError: (error) =>
      toast.add({ type: "error", description: error.message }),
  });
  const { title, description, badge, badgeClassName } = getRecordDisplay(
    tab,
    record,
  );
  const isProject = tab === "projects";
  const isResource = tab === "resources";
  const interactive = isProject || isResource;
  const resource = isResource ? (record as Resource) : undefined;

  return (
    <Card
      size="sm"
      className={
        interactive
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
      {isResource && (
        <button
          type="button"
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Open ${String(title)}`}
          aria-haspopup="dialog"
          onClick={() => onOpenResource(record.uuid)}
        />
      )}
      <CardHeader className={interactive ? "pointer-events-none" : undefined}>
        <CardTitle className="flex min-w-0 items-center gap-2">
          {isProject && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FolderKanban className="size-4" />
            </span>
          )}
          {resource && (
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
              style={resourceBadgeStyle(resource.background)}
            >
              <ResourceIcon name={resource.icon} className="size-4" />
            </span>
          )}
          <span className="truncate">{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {badge && (
          <CardAction>
            <Badge
              variant="secondary"
              className={badgeClassName ?? "capitalize"}
            >
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
            onClick={() =>
              isProject ? setDetachConfirmationOpen(true) : detach.mutate()
            }
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
      {isProject && (
        <Dialog
          open={detachConfirmationOpen}
          onOpenChange={(open) => {
            if (!detach.isPending) setDetachConfirmationOpen(open);
          }}
        >
          <DialogContent className="w-full max-w-md overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>Detach project?</DialogTitle>
              <DialogDescription>
                “{title}” will be removed from this area and moved to Inbox. The
                project and its contents will not be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={detach.isPending}
                onClick={() => setDetachConfirmationOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={detach.isPending}
                onClick={() => detach.mutate()}
              >
                {detach.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Unlink />
                )}
                {detach.isPending ? "Detaching…" : "Detach project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
  if (kind === "projects") {
    return (
      <ProjectLinkDialog
        areaUuid={areaUuid}
        linked={linked as Project[]}
        onChanged={onChanged}
      />
    );
  }

  return (
    <ResourceLinkPicker
      areaUuid={areaUuid}
      linked={linked}
      onChanged={onChanged}
    />
  );
}

function ProjectLinkDialog({
  areaUuid,
  linked,
  onChanged,
}: {
  areaUuid: string;
  linked: Project[];
  onChanged: (message: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({
    queryKey: ["projects", "available"],
    queryFn: () => areaService.allProjects(),
    enabled: open,
  });
  const linkedIds = new Set(linked.map((project) => project.uuid));
  const options = (projectsQuery.data?.data ?? []).filter(
    (project) =>
      !linkedIds.has(project.uuid) && project.area?.uuid !== areaUuid,
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredOptions = options.filter((project) =>
    [project.name, project.description, project.area?.name]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(normalizedSearch)),
  );
  const selectedProjects = options.filter((project) =>
    selectedUuids.includes(project.uuid),
  );
  const movingProjects = selectedProjects.filter((project) => project.area);
  const linkProjects = useMutation({
    mutationFn: async (projectUuids: string[]) => {
      const results = await Promise.allSettled(
        projectUuids.map((projectUuid) =>
          areaService.linkProject(areaUuid, projectUuid),
        ),
      );
      return {
        succeeded: projectUuids.filter(
          (_, index) => results[index].status === "fulfilled",
        ),
        failed: projectUuids.filter(
          (_, index) => results[index].status === "rejected",
        ),
      };
    },
    onSuccess: async ({ succeeded, failed }) => {
      if (succeeded.length > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: areaKeys.all }),
          queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        ]);
        await onChanged(
          `${succeeded.length} ${succeeded.length === 1 ? "project" : "projects"} linked successfully.`,
        );
      }
      if (failed.length > 0) {
        setSelectedUuids(failed);
        toast.add({
          type: "error",
          description: `${failed.length} ${failed.length === 1 ? "project could" : "projects could"} not be linked. Review your selection and try again.`,
        });
        return;
      }
      setSelectedUuids([]);
      setSearch("");
      setOpen(false);
    },
  });

  const toggleProject = (projectUuid: string) => {
    setSelectedUuids((current) =>
      current.includes(projectUuid)
        ? current.filter((uuid) => uuid !== projectUuid)
        : [...current, projectUuid],
    );
  };
  const closeDialog = () => {
    setOpen(false);
    setSearch("");
    setSelectedUuids([]);
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Link2 />
        Link projects
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (linkProjects.isPending) return;
          setOpen(nextOpen);
          if (!nextOpen) {
            setSearch("");
            setSelectedUuids([]);
          }
        }}
      >
        <DialogContent className="w-full max-w-2xl overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Link projects</DialogTitle>
            <DialogDescription>
              Select one or multiple projects to connect to this area.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              className="pl-9"
              placeholder="Search projects…"
              aria-label="Search available projects"
              disabled={linkProjects.isPending}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="grid max-h-[50vh] min-h-48 gap-2 overflow-y-auto overflow-x-hidden pr-1">
            {projectsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading projects…
              </div>
            ) : projectsQuery.isError ? (
              <div className="grid content-center justify-items-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Projects could not be loaded.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => projectsQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : filteredOptions.length === 0 ? (
              <p className="self-center text-center text-sm text-muted-foreground">
                {options.length === 0
                  ? "No projects are available to link."
                  : "No projects match your search."}
              </p>
            ) : (
              filteredOptions.map((project) => {
                const selected = selectedUuids.includes(project.uuid);
                return (
                  <button
                    key={project.uuid}
                    type="button"
                    aria-pressed={selected}
                    disabled={linkProjects.isPending}
                    className="flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 aria-pressed:border-primary aria-pressed:bg-primary/5 disabled:pointer-events-none disabled:opacity-60"
                    onClick={() => toggleProject(project.uuid)}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Target className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {project.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {project.area
                          ? `Currently in ${project.area.name} · linking will move it`
                          : project.description || "Currently in Inbox"}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className={`hidden sm:inline-flex ${projectStatusBadgeClassNames[project.status]}`}
                    >
                      {projectStatusLabels[project.status]}
                    </Badge>
                    <span className="flex size-5 shrink-0 items-center justify-center rounded border border-input bg-background">
                      {selected && <Check className="size-3.5" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {movingProjects.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {movingProjects.length} selected{" "}
                {movingProjects.length === 1 ? "project is" : "projects are"}{" "}
                already linked to another area and will be moved here.
              </span>
            </div>
          )}

          <DialogFooter className="sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedUuids.length} selected
            </span>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={linkProjects.isPending}
                onClick={closeDialog}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={selectedUuids.length === 0 || linkProjects.isPending}
                onClick={() => linkProjects.mutate(selectedUuids)}
              >
                {linkProjects.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Link2 />
                )}
                {linkProjects.isPending
                  ? "Linking…"
                  : `Link ${selectedUuids.length || "selected"}`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResourceLinkPicker({
  areaUuid,
  linked,
  onChanged,
}: {
  areaUuid: string;
  linked: AreaRecord[];
  onChanged: (message: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const resourcesQuery = useResourcesQuery({}, open);
  const available: ResourceDetail[] = [
    ...new Map(
      resourcesQuery.data?.pages
        .flatMap((page) => page.data.data)
        .map((resource) => [resource.uuid, resource]),
    ).values(),
  ];
  const linkedIds = new Set(linked.map((item) => item.uuid));
  const options = available.filter((item) => !linkedIds.has(item.uuid));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredOptions = options.filter((resource) =>
    [
      resource.title,
      resource.description,
      resource.author,
      resource.source,
      ...resource.types,
      ...resource.tags.map((tag) => tag.name),
    ]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(normalizedSearch)),
  );
  const linkResources = useMutation({
    mutationFn: async (resourceUuids: string[]) => {
      const results = await Promise.allSettled(
        resourceUuids.map((resourceUuid) =>
          areaService.linkResource(areaUuid, resourceUuid),
        ),
      );
      return {
        succeeded: resourceUuids.filter(
          (_, index) => results[index].status === "fulfilled",
        ),
        failed: resourceUuids.filter(
          (_, index) => results[index].status === "rejected",
        ),
      };
    },
    onSuccess: async ({ succeeded, failed }) => {
      if (succeeded.length > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: areaKeys.all }),
          queryClient.invalidateQueries({ queryKey: ["resources"] }),
          queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        ]);
        await onChanged(
          `${succeeded.length} ${succeeded.length === 1 ? "resource" : "resources"} linked successfully.`,
        );
      }
      if (failed.length > 0) {
        setSelectedUuids(failed);
        toast.add({
          type: "error",
          description: `${failed.length} ${failed.length === 1 ? "resource could" : "resources could"} not be linked. Review your selection and try again.`,
        });
        return;
      }
      setSelectedUuids([]);
      setSearch("");
      setOpen(false);
    },
  });

  const toggleResource = (resourceUuid: string) => {
    setSelectedUuids((current) =>
      current.includes(resourceUuid)
        ? current.filter((uuid) => uuid !== resourceUuid)
        : [...current, resourceUuid],
    );
  };
  const closeDialog = () => {
    setOpen(false);
    setSearch("");
    setSelectedUuids([]);
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Link2 />
        Link resources
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (linkResources.isPending) return;
          setOpen(nextOpen);
          if (!nextOpen) {
            setSearch("");
            setSelectedUuids([]);
          }
        }}
      >
        <DialogContent className="w-full max-w-2xl overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Link resources</DialogTitle>
            <DialogDescription>
              Select one or multiple resources to connect to this area.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              className="pl-9"
              placeholder="Search resources…"
              aria-label="Search available resources"
              disabled={linkResources.isPending}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="grid max-h-[50vh] min-h-48 gap-2 overflow-y-auto overflow-x-hidden pr-1">
            {resourcesQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading resources…
              </div>
            ) : resourcesQuery.isError ? (
              <div className="grid content-center justify-items-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Resources could not be loaded.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resourcesQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : filteredOptions.length === 0 ? (
              <p className="self-center text-center text-sm text-muted-foreground">
                {options.length === 0
                  ? "No resources are available to link."
                  : "No resources match your search."}
              </p>
            ) : (
              filteredOptions.map((resource) => {
                const selected = selectedUuids.includes(resource.uuid);
                return (
                  <button
                    key={resource.uuid}
                    type="button"
                    aria-pressed={selected}
                    disabled={linkResources.isPending}
                    className="flex min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 aria-pressed:border-primary aria-pressed:bg-primary/5 disabled:pointer-events-none disabled:opacity-60"
                    onClick={() => toggleResource(resource.uuid)}
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                      style={resourceBadgeStyle(resource.background)}
                    >
                      <ResourceIcon name={resource.icon} className="size-5" />
                    </span>
                    <span className="grid min-w-0 flex-1 gap-2">
                      <span className="block truncate text-sm font-medium">
                        {resource.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {resource.author ||
                          resource.source ||
                          resource.description ||
                          "No details."}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {resource.types.map((type) => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="capitalize"
                          >
                            {type}
                          </Badge>
                        ))}
                        {resource.tags.map((tag) => (
                          <Badge
                            key={tag.uuid}
                            variant="outline"
                            className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {resource.types.length === 0 &&
                          resource.tags.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              No types or tags
                            </span>
                          )}
                      </span>
                    </span>
                    <span className="mt-2 flex size-5 shrink-0 items-center justify-center rounded border border-input bg-background">
                      {selected && <Check className="size-3.5" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {resourcesQuery.hasNextPage && (
            <Button
              type="button"
              variant="outline"
              disabled={resourcesQuery.isFetchingNextPage}
              onClick={() => resourcesQuery.fetchNextPage()}
            >
              {resourcesQuery.isFetchingNextPage
                ? "Loading…"
                : resourcesQuery.isFetchNextPageError
                  ? "Retry loading more"
                  : "Load more resources"}
            </Button>
          )}

          <DialogFooter className="sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedUuids.length} selected
            </span>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={linkResources.isPending}
                onClick={closeDialog}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={selectedUuids.length === 0 || linkResources.isPending}
                onClick={() => linkResources.mutate(selectedUuids)}
              >
                {linkResources.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Link2 />
                )}
                {linkResources.isPending
                  ? "Linking…"
                  : `Link ${selectedUuids.length || "selected"}`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getRecordDisplay(
  tab: AreaTab,
  record: AreaRecord,
): {
  title: string;
  description: ReactNode;
  badge?: string;
  badgeClassName?: string;
} {
  if (tab === "projects") {
    const item = record as Project;
    return {
      title: item.name,
      description: item.description || "No description.",
      badge: projectStatusLabels[item.status],
      badgeClassName: projectStatusBadgeClassNames[item.status],
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
