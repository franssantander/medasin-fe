"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, LoaderCircle, Search, X } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArchivedAreaRow,
  useArchivedAreas,
} from "@/features/areas/components/area-archives";
import {
  ArchivedProjectRow,
  useArchivedProjects,
} from "@/features/projects/components/project-archives";
import {
  ArchivedResourceRow,
  useArchivedResources,
} from "@/features/resources/components/resource-archives";
import { ResourceDetailDialog } from "@/features/resources/components/resource-detail-dialog";
import type { Resource } from "@/features/resources/type";
import { ArchiveGroup } from "./archive-list";

export type ArchivesTab = "all" | "areas" | "projects" | "resources";

export const archivesTabs: { value: ArchivesTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "areas", label: "Areas" },
  { value: "projects", label: "Projects" },
  { value: "resources", label: "Resources" },
];

const PREVIEW_LIMIT = 5;

export function ArchivesPage({ initialTab }: { initialTab: ArchivesTab }) {
  const router = useRouter();
  const [tab, setTab] = useState<ArchivesTab>(initialTab);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedResource, setSelectedResource] = useState<Resource>();
  const areas = useArchivedAreas(deferredSearch);
  const projects = useArchivedProjects(deferredSearch);
  const resources = useArchivedResources(search);
  const searching = search.trim() !== "";
  const archivedAreaUuids = useMemo(
    () => new Set(areas.query.data?.data.map((area) => area.uuid) ?? []),
    [areas.query.data],
  );

  const changeTab = (next: ArchivesTab) => {
    setTab(next);
    router.replace(next === "all" ? "/archives" : `/archives?tab=${next}`, {
      scroll: false,
    });
  };

  const counts: Record<ArchivesTab, number | undefined> = {
    areas: areas.query.data ? areas.items.length : undefined,
    projects: projects.query.data ? projects.items.length : undefined,
    resources: resources.total,
    all: undefined,
  };
  const loaded =
    areas.query.isSuccess && projects.query.isSuccess && resources.query.isSuccess;
  const visibleTotal =
    (counts.areas ?? 0) + (counts.projects ?? 0) + (counts.resources ?? 0);
  const resourceSearchPending =
    searching && resources.query.isFetching && !resources.query.isFetchingNextPage;

  function renderAreas(limit?: number) {
    const shown = limit ? areas.items.slice(0, limit) : areas.items;
    return (
      <ArchiveGroup
        id="archived-areas"
        title="Areas"
        count={counts.areas}
        showHeading={tab === "all"}
        isLoading={areas.query.isLoading}
        isError={areas.query.isError}
        skeletonLabel="Loading archived areas"
        emptyLabel={searching ? "No archived areas match your search." : "No archived areas."}
        isEmpty={areas.items.length === 0}
        hiddenCount={areas.items.length - shown.length}
        onRetry={() => void areas.query.refetch()}
        onViewAll={() => changeTab("areas")}
      >
        {shown.map((area) => (
          <ArchivedAreaRow key={area.uuid} area={area} />
        ))}
      </ArchiveGroup>
    );
  }

  function renderProjects(limit?: number) {
    const shown = limit ? projects.items.slice(0, limit) : projects.items;
    return (
      <ArchiveGroup
        id="archived-projects"
        title="Projects"
        count={counts.projects}
        showHeading={tab === "all"}
        isLoading={projects.query.isLoading}
        isError={projects.query.isError}
        skeletonLabel="Loading archived projects"
        skeletonMeta
        emptyLabel={searching ? "No archived projects match your search." : "No archived projects."}
        isEmpty={projects.items.length === 0}
        hiddenCount={projects.items.length - shown.length}
        onRetry={() => void projects.query.refetch()}
        onViewAll={() => changeTab("projects")}
      >
        {shown.map((project) => (
          <ArchivedProjectRow
            key={project.uuid}
            project={project}
            areaArchived={
              project.area && areas.query.data
                ? archivedAreaUuids.has(project.area.uuid)
                : undefined
            }
          />
        ))}
      </ArchiveGroup>
    );
  }

  function renderResources(limit?: number) {
    const shown = limit ? resources.items.slice(0, limit) : resources.items;
    const total = resources.total ?? resources.items.length;
    const query = resources.query;
    return (
      <ArchiveGroup
        id="archived-resources"
        title="Resources"
        count={counts.resources}
        showHeading={tab === "all"}
        isLoading={query.isLoading}
        isError={query.isError && !query.isFetchNextPageError}
        skeletonLabel="Loading archived resources"
        skeletonMeta
        emptyLabel={searching ? "No archived resources match your search." : "No archived resources."}
        isEmpty={resources.items.length === 0}
        hiddenCount={total - shown.length}
        onRetry={() => void query.refetch()}
        onViewAll={() => changeTab("resources")}
        footer={
          !limit && (query.hasNextPage || query.isFetchNextPageError) ? (
            <div className="flex flex-col items-center gap-2">
              {query.isFetchNextPageError && (
                <p role="alert" className="text-sm text-destructive">
                  More archived resources could not be loaded.
                </p>
              )}
              {query.hasNextPage && (
                <Button
                  variant="outline"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {shown.map((resource) => (
          <ArchivedResourceRow
            key={resource.uuid}
            resource={resource}
            onOpen={() => setSelectedResource(resource)}
          />
        ))}
      </ArchiveGroup>
    );
  }

  const content: Record<ArchivesTab, () => ReactNode> = {
    all: () =>
      loaded && visibleTotal === 0 ? (
        <ArchivesEmpty search={search.trim()} onClearSearch={() => setSearch("")} />
      ) : (
        <div className="grid gap-8">
          {renderAreas(PREVIEW_LIMIT)}
          {renderProjects(PREVIEW_LIMIT)}
          {renderResources(PREVIEW_LIMIT)}
        </div>
      ),
    areas: () => renderAreas(),
    projects: () => renderProjects(),
    resources: () => renderResources(),
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Archives"
        description="Archived items are read-only and hidden from your workspace. Restore anything to bring it back."
      />

      <Tabs
        value={tab}
        onValueChange={(value) => changeTab(value as ArchivesTab)}
        className="gap-5"
      >
        <div className="flex flex-col-reverse gap-3 border-b sm:flex-row sm:items-end sm:justify-between">
          <div className="-mb-px overflow-x-auto">
            <TabsList
              variant="line"
              className="h-auto w-max justify-start gap-4 pb-1"
            >
              {archivesTabs.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex-none px-0.5 group-data-horizontal/tabs:after:bottom-[-5px]"
                >
                  {item.label}
                  {counts[item.value] !== undefined && (
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">
                      {counts[item.value]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <InputGroup className="mb-2 w-full sm:w-64">
            <InputGroupInput
              type="search"
              aria-label="Search archives"
              placeholder="Search archives"
              maxLength={255}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="[&::-webkit-search-cancel-button]:hidden"
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            {search && (
              <InputGroupAddon align="inline-end">
                {resourceSearchPending ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : null}
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        {archivesTabs.map((item) => (
          <TabsContent key={item.value} value={item.value}>
            {tab === item.value ? content[item.value]() : null}
          </TabsContent>
        ))}
      </Tabs>

      {selectedResource && (
        <ResourceDetailDialog
          resource={selectedResource}
          onClose={() => setSelectedResource(undefined)}
        />
      )}
    </div>
  );
}

function ArchivesEmpty({
  search,
  onClearSearch,
}: {
  search: string;
  onClearSearch: () => void;
}) {
  return (
    <Empty className="min-h-72 rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {search ? <Search aria-hidden="true" /> : <Archive aria-hidden="true" />}
        </EmptyMedia>
        <EmptyTitle>
          {search ? `No archived items match “${search}”` : "Nothing archived"}
        </EmptyTitle>
        <EmptyDescription>
          {search
            ? "Try another name or clear the search."
            : "Archive areas, projects, or resources to tuck them away without deleting them."}
        </EmptyDescription>
      </EmptyHeader>
      {search && (
        <EmptyContent>
          <Button variant="outline" onClick={onClearSearch}>
            Clear search
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
