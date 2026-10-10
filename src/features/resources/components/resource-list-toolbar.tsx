"use client";

import type { ComponentProps } from "react";
import {
  LayoutGrid,
  Library,
  List,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ResourceView } from "../hooks/use-resource-list";
import type { ResourceTag, ResourceType } from "../type";
import { ResourceListFilters } from "./resource-list-filters";
import { resourceTypeOptions } from "./resource-list-options";

type ResourceListToolbarProps = {
  search: string;
  isSearching: boolean;
  view: ResourceView;
  type?: ResourceType;
  selectedTag?: ResourceTag;
  activeFilterCount: number;
  isFiltered: boolean;
  countLabel: string;
  shownLabel?: string;
  filterProps: ComponentProps<typeof ResourceListFilters>;
  onSearchChange: (value: string) => void;
  onViewChange: (value: ResourceView) => void;
  onTypeChange: (value?: ResourceType) => void;
  onTagChange: (value?: string) => void;
  onClearFilters: () => void;
};

export function ResourceListToolbar({
  search,
  isSearching,
  view,
  type,
  selectedTag,
  activeFilterCount,
  isFiltered,
  countLabel,
  shownLabel,
  filterProps,
  onSearchChange,
  onViewChange,
  onTypeChange,
  onTagChange,
  onClearFilters,
}: ResourceListToolbarProps) {
  const selectedType = resourceTypeOptions.find((item) => item.value === type);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-0 flex-1 basis-56 sm:max-w-sm">
          <InputGroupInput
            type="search"
            aria-label="Search resources"
            placeholder="Search resources"
            maxLength={255}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="[&::-webkit-search-cancel-button]:hidden"
          />
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          {(isSearching || search) && (
            <InputGroupAddon align="inline-end">
              {isSearching ? (
                <>
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  <span className="sr-only" role="status">
                    Searching resources
                  </span>
                </>
              ) : (
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => onSearchChange("")}
                >
                  <X />
                </InputGroupButton>
              )}
            </InputGroupAddon>
          )}
        </InputGroup>

        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                className="lg:hidden"
                aria-label={
                  activeFilterCount > 0
                    ? `Filter resources, ${activeFilterCount} active`
                    : "Filter resources"
                }
              />
            }
          >
            <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 tabular-nums">
                {activeFilterCount}
              </Badge>
            )}
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(20rem,90vw)] gap-0">
            <SheetHeader className="shrink-0 border-b pr-12">
              <SheetTitle>Filter resources</SheetTitle>
              <SheetDescription>
                Narrow the library by type or tag.
              </SheetDescription>
            </SheetHeader>
            <div className="workspace-list-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              <ResourceListFilters {...filterProps} presentation="sheet" />
            </div>
          </SheetContent>
        </Sheet>

        <ToggleGroup
          variant="outline"
          spacing={0}
          aria-label="Resource view"
          value={[view]}
          onValueChange={(values) => {
            const next = values[0] as ResourceView | undefined;
            if (next) onViewChange(next);
          }}
          className="ml-auto shadow-none"
        >
          <ToggleGroupItem
            value="grid"
            aria-label="Grid view"
            className="text-muted-foreground aria-pressed:text-foreground"
          >
            <LayoutGrid aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label="List view"
            className="text-muted-foreground aria-pressed:text-foreground"
          >
            <List aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] lg:hidden">
        <ToggleGroup
          aria-label="Resource type"
          spacing={1}
          value={[type ?? "all"]}
          onValueChange={(values) => {
            const next = values[0];
            if (!next) return;
            onTypeChange(
              resourceTypeOptions.find((item) => item.value === next)?.value,
            );
          }}
          className="w-max"
        >
          <ToggleGroupItem
            value="all"
            size="sm"
            className="shrink-0 rounded-full px-3 font-normal text-muted-foreground aria-pressed:text-foreground"
          >
            <Library aria-hidden="true" />
            All
          </ToggleGroupItem>
          {resourceTypeOptions.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              size="sm"
              className="shrink-0 rounded-full px-3 font-normal text-muted-foreground aria-pressed:text-foreground"
            >
              <Icon aria-hidden="true" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-2">
        <p
          className="text-sm text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium text-foreground tabular-nums">
            {countLabel}
          </span>
          {shownLabel && <span className="tabular-nums"> · {shownLabel}</span>}
        </p>
        {isFiltered && (
          <div
            role="group"
            aria-label="Active filters"
            className="flex min-w-0 flex-wrap items-center gap-1.5"
          >
            {selectedType && (
              <Button
                size="xs"
                variant="secondary"
                className="max-w-full font-normal"
                aria-label={`Remove type filter: ${selectedType.label}`}
                onClick={() => onTypeChange(undefined)}
              >
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">Type:</span>{" "}
                  {selectedType.label}
                </span>
                <X data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            {selectedTag && (
              <Button
                size="xs"
                variant="secondary"
                className="max-w-full font-normal"
                aria-label={`Remove tag filter: ${selectedTag.name}`}
                onClick={() => onTagChange(undefined)}
              >
                <span className="min-w-0 max-w-48 truncate" title={selectedTag.name}>
                  <span className="text-muted-foreground">Tag:</span>{" "}
                  {selectedTag.name}
                </span>
                <X data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            {search && (
              <Button
                size="xs"
                variant="secondary"
                className="max-w-full font-normal"
                aria-label={`Remove search filter: ${search}`}
                onClick={() => onSearchChange("")}
              >
                <span className="min-w-0 max-w-40 truncate" title={search}>
                  <span className="text-muted-foreground">Search:</span>{" "}
                  {search}
                </span>
                <X data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            <Button
              size="xs"
              variant="ghost"
              className="text-muted-foreground"
              onClick={onClearFilters}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
