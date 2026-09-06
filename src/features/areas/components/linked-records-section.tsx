"use client";

import { ExternalLink, FolderKanban, LoaderCircle, Unlink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import {
  projectStatusBadgeClassNames,
  projectStatusLabels,
} from "@/features/projects/project-status";
import { ResourceDetailDialog } from "@/features/resources/components/resource-detail-dialog";
import {
  ResourceIcon,
  resourceBadgeStyle,
} from "@/features/resources/components/resource-icons";
import { resourceTypeOptions } from "@/features/resources/components/resource-list-options";
import { useResourceQuery } from "@/features/resources/queries/resource-query";
import type { Resource } from "@/features/resources/type";
import { useDetachAreaRecord } from "../hooks/use-area-section-actions";
import type { Paginated, Project } from "../type";
import { ProjectLinkDialog } from "./project-link-dialog";
import { ResourceLinkDialog } from "./resource-link-dialog";

type LinkedRecord = Project | Resource;
type LinkedKind = "projects" | "resources";

export function LinkedRecordsSection({
  kind,
  data,
  archived,
  areaUuid,
  projectDetailBasePath,
  page,
  setPage,
  onChanged,
}: {
  kind: LinkedKind;
  data?: Paginated<LinkedRecord>;
  archived: boolean;
  areaUuid: string;
  projectDetailBasePath: string;
  page: number;
  setPage: (page: number) => void;
  onChanged: (message: string) => Promise<void>;
}) {
  const records = data?.data ?? [];
  const [selectedResourceUuid, setSelectedResourceUuid] = useState<string>();
  const selectedResourceQuery = useResourceQuery(selectedResourceUuid);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold capitalize">{kind}</h2>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} connected</p>
        </div>
        {!archived &&
          (kind === "projects" ? (
            <ProjectLinkDialog
              areaUuid={areaUuid}
              linked={records as Project[]}
              onChanged={onChanged}
            />
          ) : (
            <ResourceLinkDialog
              areaUuid={areaUuid}
              linkedUuids={records.map((record) => record.uuid)}
              onChanged={onChanged}
            />
          ))}
      </div>
      {records.length === 0 ? (
        <Card className="items-center py-12 text-center">
          <CardTitle>No {kind} yet</CardTitle>
          <CardDescription>Add or link one when you are ready.</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {records.map((record) => (
            <LinkedRecordCard
              key={record.uuid}
              kind={kind}
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
        <ResourceLoadingDialog
          error={selectedResourceQuery.isError}
          onClose={() => setSelectedResourceUuid(undefined)}
          onRetry={() => selectedResourceQuery.refetch()}
        />
      )}
    </div>
  );
}

function LinkedRecordCard({
  kind,
  record,
  archived,
  areaUuid,
  projectDetailBasePath,
  onOpenResource,
  onChanged,
}: {
  kind: LinkedKind;
  record: LinkedRecord;
  archived: boolean;
  areaUuid: string;
  projectDetailBasePath: string;
  onOpenResource: (uuid: string) => void;
  onChanged: (message: string) => Promise<void>;
}) {
  const isProject = kind === "projects";
  const project = isProject ? (record as Project) : undefined;
  const resource = !isProject ? (record as Resource) : undefined;
  const title = project?.name ?? resource!.title;
  const description = project
    ? project.description || "No description."
    : resource!.author || resource!.source || resource!.description || "No details.";
  const resourceTypes = resource?.types ?? [];
  const resourceTags = resource?.tags ?? [];
  const { confirmationOpen, mutation, setConfirmationOpen } = useDetachAreaRecord({
    areaUuid,
    kind,
    recordUuid: record.uuid,
    onChanged,
  });

  return (
    <Card
      size="sm"
      className="relative gap-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {project ? (
        <Link
          href={`${projectDetailBasePath}/${record.uuid}`}
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Open ${title}`}
        />
      ) : (
        <button
          type="button"
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Open ${title}`}
          aria-haspopup="dialog"
          onClick={() => onOpenResource(record.uuid)}
        />
      )}
      <CardHeader className="pointer-events-none">
        <CardTitle className="flex min-w-0 items-center gap-2">
          {project && (
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
        {resource && resourceTypes.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {resourceTypes.map((type) => {
              const option = resourceTypeOptions.find(
                (item) => item.value === type,
              );
              const Icon = option?.icon;
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 capitalize"
                >
                  {Icon && <Icon className="size-3.5" />}
                  {type}
                </span>
              );
            })}
          </div>
        )}
        <CardDescription>{description}</CardDescription>
        {project && (
          <CardAction>
            <Badge
              variant="secondary"
              className={projectStatusBadgeClassNames[project.status]}
            >
              {projectStatusLabels[project.status]}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {resourceTags.length > 0 && (
        <CardContent className="pointer-events-none relative z-10 flex flex-wrap gap-1">
          {resourceTags.map((tag) => (
            <Badge
              key={tag.uuid}
              variant="outline"
              className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
            >
              {tag.name}
            </Badge>
          ))}
        </CardContent>
      )}
      {!archived && (
        <CardContent className="pointer-events-none relative z-10 flex-row justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="pointer-events-auto"
            disabled={mutation.isPending}
            onClick={() => (project ? setConfirmationOpen(true) : mutation.mutate())}
          >
            <Unlink />
            Detach
          </Button>
          {resource?.url && (
            <Button
              render={<a href={resource.url} target="_blank" rel="noreferrer" />}
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
      {project && (
        <Dialog
          open={confirmationOpen}
          onOpenChange={(open) => {
            if (!mutation.isPending) setConfirmationOpen(open);
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
                disabled={mutation.isPending}
                onClick={() => setConfirmationOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Unlink />}
                {mutation.isPending ? "Detaching…" : "Detach project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function ResourceLoadingDialog({
  error,
  onClose,
  onRetry,
}: {
  error: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md overflow-x-hidden">
        {error ? (
          <>
            <DialogHeader>
              <DialogTitle>Resource could not be loaded</DialogTitle>
              <DialogDescription>
                Check your connection and try opening the resource again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
              <Button type="button" onClick={onRetry}>Try again</Button>
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
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">Page {page} of {lastPage}</span>
      <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}
