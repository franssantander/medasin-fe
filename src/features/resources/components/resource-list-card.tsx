import Link from "next/link";
import { Archive, CirclePile, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resourcePreview } from "../resource-document";
import type { Resource } from "../type";
import { ResourceIcon, resourceBadgeStyle } from "./resource-icons";
import { resourceTypeOptions } from "./resource-list-options";

type ResourceListCardProps = {
  archiveDisabled: boolean;
  resource: Resource;
  onArchive: (resource: Resource) => void;
  onOpen: (resource: Resource) => void;
};

function formatRelativeTimestamp(value: string | null) {
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

export function ResourceListCard({
  archiveDisabled,
  resource,
  onArchive,
  onOpen,
}: ResourceListCardProps) {
  const timestamp = resource.updated_at ?? resource.created_at;
  const relativeTimestamp = formatRelativeTimestamp(timestamp);

  return (
    <Card className="relative w-full min-w-0 cursor-pointer gap-3 transition-colors hover:ring-primary/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
      <button
        type="button"
        aria-label={`Open ${resource.title}`}
        aria-haspopup="dialog"
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none"
        onClick={() => onOpen(resource)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-4 top-4 z-20"
        aria-label={`Archive ${resource.title}`}
        disabled={archiveDisabled}
        onClick={() => onArchive(resource)}
      >
        <Archive />
      </Button>
      <CardHeader className="pointer-events-none relative z-10 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid min-w-0 gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={resourceBadgeStyle(resource.background)}
            >
              <ResourceIcon name={resource.icon} className="size-5" />
            </div>
            <CardTitle>
              <span className="break-words">
                {resource.title}
              </span>
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {resource.types.map((value) => {
              const Icon = resourceTypeOptions.find((item) => item.value === value)?.icon;
              return (
                <span key={value} className="inline-flex items-center gap-1 capitalize">
                  {Icon && <Icon className="size-3.5" />}
                  {value}
                </span>
              );
            })}
          </div>
        </div>
        <div className="pr-10 sm:pr-9">
          {relativeTimestamp && timestamp && (
            <time
              dateTime={timestamp}
              title={new Date(timestamp).toLocaleString()}
              className="text-xs whitespace-nowrap text-muted-foreground sm:pt-1"
            >
              {relativeTimestamp}
            </time>
          )}
        </div>
      </CardHeader>
      <CardContent className="pointer-events-none relative z-10 grid gap-3">
        <p className="line-clamp-3 break-words text-sm text-muted-foreground">
          {resourcePreview(resource.content) || resource.description || resource.url || "Open to view this resource."}
        </p>
        {resource.attachments.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {resource.attachments.length} attachment{resource.attachments.length === 1 ? "" : "s"}
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {resource.tags.map((item) => (
            <Badge
              key={item.uuid}
              variant="outline"
              className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
            >
              {item.name}
            </Badge>
          ))}
        </div>
        {[...resource.projects, ...resource.areas].length > 0 && (
          <div className="flex flex-wrap gap-2">
            {resource.projects.map((project) => (
              <Badge
                key={project.uuid}
                variant="outline"
                render={<Link href={`/projects/${project.uuid}`} aria-label={`Open project ${project.name}`} className="pointer-events-auto border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900" />}
              >
                <Target />Project: {project.name}
              </Badge>
            ))}
            {resource.areas.map((area) => (
              <Badge
                key={area.uuid}
                variant="outline"
                render={<Link href={`/areas/${area.uuid}`} aria-label={`Open area ${area.name}`} className="pointer-events-auto border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900" />}
              >
                <CirclePile />Area: {area.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
