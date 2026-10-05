import { Check, Hash, Library, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { ResourceTag, ResourceType } from "../type";
import { resourceTypeOptions } from "./resource-list-options";

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

  return (
    <aside
      className={cn(
        "flex w-full min-w-0 flex-col",
        isPanel && "h-full min-h-0 overflow-hidden rounded-xl border bg-card",
        className,
      )}
      aria-label="Resource filters"
    >
      {isPanel && (
        <>
          <div className="flex shrink-0 items-center gap-2 px-4 py-3.5">
            <Library className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Filters</h2>
          </div>
          <Separator />
        </>
      )}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-5",
          isPanel &&
            "workspace-list-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3",
        )}
      >
        <section className="grid gap-2" aria-label="Resource types">
          <h3 className="px-2.5 text-xs font-medium text-muted-foreground">
            Types
          </h3>
          <ToggleGroup
            orientation="vertical"
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
            <ToggleGroupItem
              value="all"
              className="h-11 w-full justify-start gap-2.5 lg:h-9"
            >
              <Library data-icon="inline-start" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-left">
                All resources
              </span>
              {!selectedType && (
                <Check data-icon="inline-end" aria-hidden="true" />
              )}
            </ToggleGroupItem>
            {resourceTypeOptions.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="h-11 w-full justify-start gap-2.5 lg:h-9"
              >
                <Icon data-icon="inline-start" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                {selectedType === value && (
                  <Check data-icon="inline-end" aria-hidden="true" />
                )}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
        <Separator />
        <section className="grid gap-2" aria-label="Resource tags">
          <h3 className="px-2.5 text-xs font-medium text-muted-foreground">
            Tags
          </h3>
          <ToggleGroup
            orientation="vertical"
            className="w-full min-w-0"
            aria-label="Filter by tag"
            value={[selectedTag ?? "all"]}
            onValueChange={(values) =>
              onTagChange(values[0] === "all" ? undefined : values[0])
            }
          >
            <ToggleGroupItem
              value="all"
              className="h-11 w-full justify-start gap-2.5 lg:h-9"
            >
              <Tags data-icon="inline-start" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-left">All tags</span>
              {!selectedTag && (
                <Check data-icon="inline-end" aria-hidden="true" />
              )}
            </ToggleGroupItem>
            {tags?.map((item) => (
              <ToggleGroupItem
                key={item.uuid}
                value={item.uuid}
                title={item.name}
                className="h-11 w-full min-w-0 justify-start gap-2.5 lg:h-9"
              >
                <Hash data-icon="inline-start" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
                {selectedTag === item.uuid && (
                  <Check data-icon="inline-end" aria-hidden="true" />
                )}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {tagsLoading && (
            <div className="grid gap-2" role="status" aria-label="Loading tags">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-11 lg:h-9" />
              ))}
            </div>
          )}
          {tagsError && (
            <div className="grid gap-2 px-2.5">
              <p className="text-xs text-muted-foreground" role="alert">
                Tags could not be loaded.
              </p>
              <Button
                variant="outline"
                className="h-11 w-full lg:h-9"
                onClick={onRetryTags}
              >
                Retry tags
              </Button>
            </div>
          )}
          {!tagsLoading && !tagsError && tags?.length === 0 && (
            <p className="px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
              Tags you create will appear here.
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}
