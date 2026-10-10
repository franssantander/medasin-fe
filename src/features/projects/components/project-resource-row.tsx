import { LoaderCircle, Unlink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resourcePreview } from "@/features/resources/resource-document";
import type { Resource } from "@/features/resources/type";
import {
  ResourceIcon,
  resourceBadgeStyle,
} from "@/features/resources/components/resource-icons";

const COLLAPSED_COUNT = 4;

export function ProjectResourceRow({
  resources,
  onOpen,
  onRemove,
  removingResourceUuid,
}: {
  resources: Resource[];
  onOpen: (resource: Resource) => void;
  onRemove?: (resource: Resource) => void;
  removingResourceUuid?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? resources : resources.slice(0, COLLAPSED_COUNT);
  const hiddenCount = resources.length - COLLAPSED_COUNT;

  return (
    <div className="grid gap-3">
      <ul
        className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-label="Project resources"
      >
        {visible.map((resource) => (
          <li
            key={resource.uuid}
            className="group/resource relative min-w-0 rounded-xl border bg-card transition-colors hover:border-foreground/15 hover:bg-muted/30"
          >
            <button
              type="button"
              className="flex w-full min-w-0 items-start gap-3 rounded-xl p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Open ${resource.title}`}
              aria-haspopup="dialog"
              onClick={() => onOpen(resource)}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm"
                style={resourceBadgeStyle(resource.background)}
              >
                <ResourceIcon name={resource.icon} className="size-4" />
              </span>
              <span className={`grid min-w-0 flex-1 gap-0.5 ${onRemove ? "pr-7" : ""}`}>
                <span className="truncate text-sm font-medium">
                  {resource.title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {resourcePreview(resource.content) ||
                    resource.description ||
                    resource.url ||
                    "Open to view this resource."}
                </span>
              </span>
            </button>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute right-2 top-2 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/resource:opacity-100 group-focus-within/resource:opacity-100 disabled:opacity-100 [@media(hover:none)]:opacity-100"
                aria-label={`Remove ${resource.title} from project`}
                disabled={Boolean(removingResourceUuid)}
                onClick={() => onRemove(resource)}
              >
                {removingResourceUuid === resource.uuid ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Unlink />
                )}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show fewer" : `Show all ${resources.length}`}
        </Button>
      )}
    </div>
  );
}
