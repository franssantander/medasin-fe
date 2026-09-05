import { BookOpen, LoaderCircle, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resourcePreview } from "@/features/resources/resource-document";
import type { Resource } from "@/features/resources/type";
import {
  ResourceIcon,
  resourceBadgeStyle,
} from "@/features/resources/components/resource-icons";

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
  if (resources.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
        <BookOpen className="size-4" />
        No resources linked to this project or its tasks.
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 gap-3 overflow-x-auto p-1"
      aria-label="Project resources"
    >
      {resources.map((resource) => (
        <Card
          key={resource.uuid}
          className="relative w-72 shrink-0 snap-start gap-3 p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
        >
          <button
            type="button"
            className="grid w-full min-w-0 gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open ${resource.title}`}
            aria-haspopup="dialog"
            onClick={() => onOpen(resource)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                style={resourceBadgeStyle(resource.background)}
              >
                <ResourceIcon name={resource.icon} className="size-5" />
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-semibold ${onRemove ? "pr-8" : ""}`}
              >
                {resource.title}
              </span>
            </span>
            <span className="line-clamp-2 min-h-10 break-words text-sm text-muted-foreground">
              {resourcePreview(resource.content) ||
                resource.description ||
                resource.url ||
                "Open to view this resource."}
            </span>
          </button>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
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
        </Card>
      ))}
    </div>
  );
}
