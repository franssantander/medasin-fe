import { resourcePreview } from "../resource-document";
import type { Resource } from "../type";
import { cn } from "@/lib/utils";
import { ResourceIcon, resourceBadgeStyle } from "./resource-icons";
import { resourceTypeOptions } from "./resource-list-options";

export function formatRelativeTimestamp(value: string | null) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const units = [
    { suffix: "y", seconds: 365 * 24 * 60 * 60 },
    { suffix: "mo", seconds: 30 * 24 * 60 * 60 },
    { suffix: "w", seconds: 7 * 24 * 60 * 60 },
    { suffix: "d", seconds: 24 * 60 * 60 },
    { suffix: "h", seconds: 60 * 60 },
    { suffix: "m", seconds: 60 },
  ];

  for (const unit of units) {
    if (elapsedSeconds >= unit.seconds) {
      return `${Math.floor(elapsedSeconds / unit.seconds)}${unit.suffix} ago`;
    }
  }
  return "just now";
}

export function resourceSummary(resource: Resource) {
  return (
    resourcePreview(resource.content) ||
    resource.description ||
    resource.url ||
    ""
  );
}

export function resourceLinks(resource: Resource) {
  return [
    ...resource.projects.map((project) => ({
      kind: "project" as const,
      uuid: project.uuid,
      name: project.name,
      href: `/projects/${project.uuid}`,
    })),
    ...resource.areas.map((area) => ({
      kind: "area" as const,
      uuid: area.uuid,
      name: area.name,
      href: `/areas/${area.uuid}`,
    })),
  ];
}

export function ResourceIconTile({
  resource,
  className,
}: {
  resource: Resource;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        className,
      )}
      style={resourceBadgeStyle(resource.background)}
      aria-hidden="true"
    >
      <ResourceIcon name={resource.icon} className="size-4" />
    </div>
  );
}

export function ResourceTimestamp({
  resource,
  className,
}: {
  resource: Resource;
  className?: string;
}) {
  const timestamp = resource.updated_at ?? resource.created_at;
  const relative = formatRelativeTimestamp(timestamp);
  if (!timestamp || !relative) return null;

  return (
    <time
      dateTime={timestamp}
      title={`Updated ${new Date(timestamp).toLocaleString()}`}
      className={cn(
        "text-xs whitespace-nowrap text-muted-foreground tabular-nums",
        className,
      )}
    >
      {relative}
    </time>
  );
}

export function resourceTypeOption(value: string) {
  return resourceTypeOptions.find((item) => item.value === value);
}
