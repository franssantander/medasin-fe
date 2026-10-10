"use client";

import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  LibraryBig,
  LoaderCircle,
  MoreHorizontal,
  Unlink,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LoadingRegion } from "@/components/shared/loading-region";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  ProjectIcon,
  projectBadgeStyle,
} from "@/features/projects/components/project-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceDetailDialog } from "@/features/resources/components/resource-detail-dialog";
import {
  ResourceIcon,
  resourceBadgeStyle,
} from "@/features/resources/components/resource-icons";
import { resourceTypeOptions } from "@/features/resources/components/resource-list-options";
import { useResourceQuery } from "@/features/resources/queries/resource-query";
import type { Resource } from "@/features/resources/type";
import { cn } from "@/lib/utils";
import { useDetachAreaRecord } from "../hooks/use-area-section-actions";
import type { Paginated, Project } from "../type";
import { ProjectLinkDialog } from "./project-link-dialog";
import { ResourceLinkDialog } from "./resource-link-dialog";

type LinkedRecord = Project | Resource;
type LinkedKind = "projects" | "resources";

const MAX_VISIBLE_TAGS = 3;

const sectionCopy: Record<
  LinkedKind,
  { title: string; description: string; empty: string; emptyHint: string }
> = {
  projects: {
    title: "Projects",
    description: "Projects that move this area forward.",
    empty: "No projects linked yet",
    emptyHint: "Link the projects that belong to this part of your life.",
  },
  resources: {
    title: "Resources",
    description: "Notes, links, and files that support this area.",
    empty: "No resources linked yet",
    emptyHint: "Link references you want close at hand for this area.",
  },
};

function toDateOnly(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function projectChip(project: Project) {
  if (project.completed_at) {
    return {
      label: "Completed",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    };
  }
  if (!project.due_date) return null;

  const due = toDateOnly(project.due_date);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const label = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(due);

  return due < today
    ? {
        label: `Overdue · ${label}`,
        className:
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
      }
    : { label: `Due ${label}`, className: "text-muted-foreground" };
}

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
  const copy = sectionCopy[kind];
  const [selectedResourceUuid, setSelectedResourceUuid] = useState<string>();
  const selectedResourceQuery = useResourceQuery(selectedResourceUuid);
  const linkAction = archived ? null : kind === "projects" ? (
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
  );

  return (
    <section className="grid gap-4" aria-labelledby={`area-${kind}-heading`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-0.5">
          <div className="flex items-center gap-2">
            <h2 id={`area-${kind}-heading`} className="text-base font-semibold">
              {copy.title}
            </h2>
            <Badge variant="secondary" className="tabular-nums">
              {data?.total ?? 0}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        {records.length > 0 && linkAction}
      </div>

      {records.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {kind === "projects" ? <FolderKanban /> : <LibraryBig />}
            </EmptyMedia>
            <EmptyTitle>{copy.empty}</EmptyTitle>
            <EmptyDescription>
              {archived
                ? "This area is archived. Restore it to link more."
                : copy.emptyHint}
            </EmptyDescription>
          </EmptyHeader>
          {linkAction && <EmptyContent>{linkAction}</EmptyContent>}
        </Empty>
      ) : (
        <ItemGroup className="gap-2">
          {records.map((record) => (
            <LinkedRecordRow
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
        </ItemGroup>
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
    </section>
  );
}

function LinkedRecordRow({
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
  const project = kind === "projects" ? (record as Project) : undefined;
  const resource = kind === "resources" ? (record as Resource) : undefined;
  const title = project?.name ?? resource!.title;
  const description = project
    ? project.description
    : resource!.author || resource!.source || resource!.description;
  const projectHref = `${projectDetailBasePath}/${record.uuid}`;
  const chip = project ? projectChip(project) : null;
  const resourceTypes = resource?.types ?? [];
  const resourceTags = resource?.tags ?? [];
  const { confirmationOpen, mutation, setConfirmationOpen } = useDetachAreaRecord({
    areaUuid,
    kind,
    recordUuid: record.uuid,
    onChanged,
  });
  const overlayClassName = "absolute inset-0 z-0 rounded-md outline-none";

  return (
    <Item
      role="listitem"
      variant="outline"
      className="relative flex-nowrap bg-card transition-colors hover:bg-muted/50 has-[>a:focus-visible,>button:focus-visible]:border-ring has-[>a:focus-visible,>button:focus-visible]:ring-3 has-[>a:focus-visible,>button:focus-visible]:ring-ring/50"
    >
      {project ? (
        <Link href={projectHref} aria-label={`Open ${title}`} className={overlayClassName} />
      ) : (
        <button
          type="button"
          aria-label={`Open ${title}`}
          aria-haspopup="dialog"
          className={overlayClassName}
          onClick={() => onOpenResource(record.uuid)}
        />
      )}

      <ItemMedia
        className="pointer-events-none size-10 rounded-lg shadow-sm"
        style={
          project
            ? projectBadgeStyle(project.background)
            : resourceBadgeStyle(resource!.background)
        }
      >
        {project ? (
          <ProjectIcon name={project.icon} className="size-4.5" />
        ) : (
          <ResourceIcon name={resource!.icon} className="size-4.5" />
        )}
      </ItemMedia>

      <ItemContent className="pointer-events-none min-w-0 gap-1">
        <ItemTitle className="w-full truncate font-semibold">{title}</ItemTitle>
        <ItemDescription className="line-clamp-1">
          {description || (
            <span className="italic">
              {project ? "No description." : "No details."}
            </span>
          )}
        </ItemDescription>
        {resource && (resourceTypes.length > 0 || resourceTags.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
            {resourceTypes.map((type) => {
              const Icon = resourceTypeOptions.find((item) => item.value === type)?.icon;
              return (
                <span key={type} className="inline-flex items-center gap-1 capitalize">
                  {Icon && <Icon className="size-3.5" aria-hidden="true" />}
                  {type}
                </span>
              );
            })}
            {resourceTags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
              <Badge key={tag.uuid} variant="outline" className="font-normal">
                {tag.name}
              </Badge>
            ))}
            {resourceTags.length > MAX_VISIBLE_TAGS && (
              <span>+{resourceTags.length - MAX_VISIBLE_TAGS}</span>
            )}
          </div>
        )}
      </ItemContent>

      <ItemActions className="relative z-10 shrink-0">
        {chip && (
          <Badge
            variant="outline"
            className={cn("pointer-events-none hidden sm:inline-flex", chip.className)}
          >
            {chip.label}
          </Badge>
        )}
        {!archived && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${title}`}
                  disabled={mutation.isPending}
                />
              }
            >
              {mutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <MoreHorizontal />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {project ? (
                <DropdownMenuItem render={<Link href={projectHref} />}>
                  <ArrowUpRight />
                  Open project
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onOpenResource(record.uuid)}>
                  <ArrowUpRight />
                  Open resource
                </DropdownMenuItem>
              )}
              {resource?.url && (
                <DropdownMenuItem
                  render={<a href={resource.url} target="_blank" rel="noreferrer" />}
                >
                  <ExternalLink />
                  Open link
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onClick={() => (project ? setConfirmationOpen(true) : mutation.mutate())}
              >
                <Unlink />
                Detach from area
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </ItemActions>

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
    </Item>
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
          <>
            <DialogTitle className="sr-only">Loading resource</DialogTitle>
            <LoadingRegion label="Loading resource" className="grid gap-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 shrink-0 rounded-xl" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-5 w-3/5" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="flex justify-end gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-24" />
              </div>
            </LoadingRegion>
          </>
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
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        <ChevronLeft />
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground">
        Page {page} of {lastPage}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Next page"
        disabled={page >= lastPage}
        onClick={() => setPage(page + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
