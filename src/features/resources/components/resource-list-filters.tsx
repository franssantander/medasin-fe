import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ResourceTag, ResourceType } from "../type";
import { resourceTypeOptions } from "./resource-list-options";

type ResourceListFiltersProps = {
  selectedTag?: string;
  selectedType?: ResourceType;
  tags?: ResourceTag[];
  tagsError: boolean;
  tagsLoading: boolean;
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
  className,
  onRetryTags,
  onTagChange,
  onTypeChange,
}: ResourceListFiltersProps) {
  return (
    <aside
      className={cn(
        "grid h-fit self-start content-start gap-6 rounded-xl border bg-card p-4",
        className,
      )}
      aria-label="Resource filters"
    >
      <div className="grid gap-2">
        <h2 className="text-sm font-semibold">Types</h2>
        <Button
          variant={!selectedType ? "secondary" : "ghost"}
          className="justify-start"
          aria-pressed={!selectedType}
          onClick={() => onTypeChange(undefined)}
        >
          All resources
        </Button>
        {resourceTypeOptions.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={selectedType === value ? "secondary" : "ghost"}
            className="justify-start"
            aria-pressed={selectedType === value}
            onClick={() => onTypeChange(value)}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        <h2 className="text-sm font-semibold">Tags</h2>
        <Button
          variant={!selectedTag ? "secondary" : "ghost"}
          className="justify-start"
          aria-pressed={!selectedTag}
          onClick={() => onTagChange(undefined)}
        >
          All tags
        </Button>
        {tagsLoading && <Skeleton className="h-16" />}
        {tagsError && (
          <Button variant="outline" onClick={onRetryTags}>
            Retry tags
          </Button>
        )}
        <div className="grid gap-1">
          {tags?.map((item) => (
            <Button
              key={item.uuid}
              variant={selectedTag === item.uuid ? "secondary" : "ghost"}
              className="w-full justify-start overflow-hidden"
              aria-pressed={selectedTag === item.uuid}
              onClick={() => onTagChange(item.uuid)}
            >
              <span className="truncate">{item.name}</span>
            </Button>
          ))}
        </div>
        {tags?.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Tags you create will appear here.
          </p>
        )}
      </div>
    </aside>
  );
}
