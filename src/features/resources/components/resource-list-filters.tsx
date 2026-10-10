import { useState } from "react";
import { Check, Hash, Library, Search, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { ResourceTag, ResourceType } from "../type";
import { resourceTypeOptions } from "./resource-list-options";
import { ResourceTagsSkeleton } from "./resource-skeletons";

const TAG_SEARCH_THRESHOLD = 8;
const itemClassName =
  "h-8 w-full justify-start gap-2.5 px-2.5 font-normal text-muted-foreground hover:text-foreground aria-pressed:font-medium aria-pressed:text-foreground";

type ResourceListFiltersProps = {
  selectedTag?: string;
  selectedType?: ResourceType;
  tags?: ResourceTag[];
  tagsError: boolean;
  tagsLoading: boolean;
  presentation?: "panel" | "sheet";
  className?: string;
  onRetryTags: () => void;
  onTagChange: (tag?: string) => void;
  onTypeChange: (type?: ResourceType) => void;
};

export function ResourceListFilters({
  selectedTag,
  selectedType,
  tags,
  tagsError,
  tagsLoading,
  presentation = "panel",
  className,
  onRetryTags,
  onTagChange,
  onTypeChange,
}: ResourceListFiltersProps) {
  const isPanel = presentation === "panel";
  const [tagSearch, setTagSearch] = useState("");
  const tagQuery = tagSearch.trim().toLowerCase();
  const visibleTags = tagQuery
    ? tags?.filter(
        (item) =>
          item.uuid === selectedTag ||
          item.name.toLowerCase().includes(tagQuery),
      )
    : tags;

  return (
    <aside
      className={cn("flex w-full min-w-0 flex-col gap-4", className)}
      aria-label="Resource filters"
    >
      <section className="grid gap-1" aria-labelledby={`${presentation}-types-heading`}>
        <h2
          id={`${presentation}-types-heading`}
          className="px-2.5 pb-1 text-xs font-medium text-muted-foreground"
        >
          Library
        </h2>
        <ToggleGroup
          orientation="vertical"
          spacing={0.5}
          className="w-full min-w-0"
          aria-label="Filter by resource type"
          value={[selectedType ?? "all"]}
          onValueChange={(values) => {
            const option = resourceTypeOptions.find(
              (item) => item.value === values[0],
            );
            onTypeChange(option?.value);
          }}
        >
          <ToggleGroupItem value="all" className={itemClassName}>
            <Library aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-left">
              All resources
            </span>
            {!selectedType && <Check aria-hidden="true" />}
          </ToggleGroupItem>
          {resourceTypeOptions.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} className={itemClassName}>
              <Icon aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              {selectedType === value && <Check aria-hidden="true" />}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <Separator />

      <section className="grid min-h-0 gap-1" aria-labelledby={`${presentation}-tags-heading`}>
        <h2
          id={`${presentation}-tags-heading`}
          className="px-2.5 pb-1 text-xs font-medium text-muted-foreground"
        >
          Tags
        </h2>
        {(tags?.length ?? 0) > TAG_SEARCH_THRESHOLD && (
          <InputGroup className="mb-1 h-8">
            <InputGroupInput
              type="search"
              aria-label="Filter tags"
              placeholder="Filter tags"
              value={tagSearch}
              onChange={(event) => setTagSearch(event.target.value)}
              className="h-8 text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
        )}
        <ToggleGroup
          orientation="vertical"
          spacing={0.5}
          className={cn(
            "w-full min-w-0",
            isPanel &&
              "workspace-list-scrollbar max-h-[calc(100svh-26rem)] min-h-40 overflow-y-auto overscroll-contain",
          )}
          aria-label="Filter by tag"
          value={[selectedTag ?? "all"]}
          onValueChange={(values) =>
            onTagChange(values[0] === "all" ? undefined : values[0])
          }
        >
          <ToggleGroupItem value="all" className={itemClassName}>
            <Tags aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-left">All tags</span>
            {!selectedTag && <Check aria-hidden="true" />}
          </ToggleGroupItem>
          {visibleTags?.map((item) => (
            <ToggleGroupItem
              key={item.uuid}
              value={item.uuid}
              title={item.name}
              className={itemClassName}
            >
              <Hash aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
              {selectedTag === item.uuid && <Check aria-hidden="true" />}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {tagsLoading && <ResourceTagsSkeleton />}
        {tagsError && (
          <div className="grid gap-2 px-2.5 pt-1">
            <p className="text-xs text-muted-foreground" role="alert">
              Tags could not be loaded.
            </p>
            <Button variant="outline" size="sm" onClick={onRetryTags}>
              Retry tags
            </Button>
          </div>
        )}
        {!tagsLoading && !tagsError && tags?.length === 0 && (
          <p className="px-2.5 py-1 text-xs leading-relaxed text-muted-foreground">
            Tags you add to resources will appear here.
          </p>
        )}
        {tagQuery && visibleTags?.length === 0 && (
          <p className="px-2.5 py-1 text-xs text-muted-foreground">
            No tags match “{tagSearch.trim()}”.
          </p>
        )}
      </section>
    </aside>
  );
}
