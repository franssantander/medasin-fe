"use client";

import { CloudOff, Layers3, Plus, SearchX } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/shared/page-header";
import { LoadingRegion } from "@/components/shared/loading-region";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSubscriptionQuery } from "@/features/subscription/queries/subscription-query";
import { searchAreas, sortAreas, type AreaView } from "../area-list-utils";
import { useAreaFormDialog } from "../hooks/use-area-form-dialog";
import { useAreaListView } from "../hooks/use-area-list-view";
import { useAreasQuery } from "../queries/area-query";
import { AreaCard, AreaCardSkeleton } from "./area-card";
import { AreaFormDialog } from "./area-form-dialog";
import { AreaListItem, AreaListItemSkeleton } from "./area-list-item";
import { AreaListToolbar } from "./area-list-toolbar";

const AREA_EXAMPLES = "Health, Career, Finances, Relationships, Home";

export function AreaList() {
  const { data, isLoading, isError, isFetching, refetch } =
    useAreasQuery("active");
  const areaForm = useAreaFormDialog();
  const list = useAreaListView();
  const usage = useAreaUsage();

  const areas = data?.data ?? [];
  const visibleAreas = sortAreas(
    searchAreas(areas, list.deferredSearch),
    list.sort,
  );
  const isSearching = list.deferredSearch.trim() !== "";

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Areas
            {data && (
              <Badge variant="secondary" className="tabular-nums">
                {areas.length}
              </Badge>
            )}
          </span>
        }
        description="Group the goals, habits, projects, notes, and resources that support an ongoing part of your life."
        action={
          <>
            {usage && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href="/settings/plan"
                      className="rounded-md px-1 text-xs tabular-nums text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 data-[full]:text-destructive"
                      data-full={usage.isFull || undefined}
                    />
                  }
                >
                  {usage.used} of {usage.limit} areas
                </TooltipTrigger>
                <TooltipContent>
                  Archived areas count toward your plan limit.
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              variant={usage?.isFull ? "outline" : "default"}
              onClick={areaForm.openCreate}
            >
              <Plus />
              New area
            </Button>
          </>
        }
      />

      {areas.length > 0 && (
        <AreaListToolbar
          search={list.search}
          sort={list.sort}
          view={list.view}
          onSearchChange={list.setSearch}
          onSortChange={list.setSort}
          onViewChange={list.setView}
        />
      )}

      {isLoading && <AreaListSkeleton view={list.view} />}

      {isError && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudOff />
            </EmptyMedia>
            <EmptyTitle>Areas could not be loaded</EmptyTitle>
            <EmptyDescription>
              Check your connection and try again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {data && areas.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers3 />
            </EmptyMedia>
            <EmptyTitle>Create your first area</EmptyTitle>
            <EmptyDescription>
              Areas are the ongoing parts of your life you want to look after,
              like {AREA_EXAMPLES}.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={areaForm.openCreate}>
              <Plus />
              New area
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {areas.length > 0 && visibleAreas.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No areas match &ldquo;{list.deferredSearch.trim()}&rdquo;</EmptyTitle>
            <EmptyDescription>
              Try a different name or keyword from the description.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => list.setSearch("")}>
              Clear search
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <p className="sr-only" aria-live="polite">
        {isSearching
          ? `${visibleAreas.length} ${visibleAreas.length === 1 ? "area" : "areas"} found`
          : ""}
      </p>

      {visibleAreas.length > 0 && list.view === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleAreas.map((area) => (
            <AreaCard
              key={area.uuid}
              area={area}
              onEdit={() => areaForm.openEdit(area)}
            />
          ))}
          {!isSearching && (
            <button
              type="button"
              onClick={areaForm.openCreate}
              className="group/new flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors outline-none hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors group-hover/new:bg-background">
                <Plus className="size-5" aria-hidden="true" />
              </span>
              <span className="font-medium">Add another area</span>
            </button>
          )}
        </div>
      )}

      {visibleAreas.length > 0 && list.view === "list" && (
        <ItemGroup className="gap-2">
          {visibleAreas.map((area) => (
            <AreaListItem
              key={area.uuid}
              area={area}
              onEdit={() => areaForm.openEdit(area)}
            />
          ))}
        </ItemGroup>
      )}

      <AreaFormDialog
        open={areaForm.isOpen}
        onOpenChange={areaForm.setIsOpen}
        area={areaForm.area}
        isPending={areaForm.isPending}
        onSubmit={areaForm.submit}
      />
    </div>
  );
}

function AreaListSkeleton({ view }: { view: AreaView }) {
  const items = [1, 2, 3, 4, 5, 6];

  return (
    <LoadingRegion label="Loading areas">
      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <AreaCardSkeleton key={item} />
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => (
            <AreaListItemSkeleton key={item} />
          ))}
        </div>
      )}
    </LoadingRegion>
  );
}

function useAreaUsage() {
  const { data } = useSubscriptionQuery();
  const subscription = data?.data;
  const limit = subscription?.limits.areas;

  if (!subscription?.enforcement_enabled || limit == null) return null;

  const used = subscription.usage.areas;
  return { used, limit, isFull: used >= limit };
}
