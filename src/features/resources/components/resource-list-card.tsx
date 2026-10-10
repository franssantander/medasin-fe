import Link from "next/link";
import { Archive, CirclePile, Paperclip, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resourcePreview } from "../resource-document";
import type { Resource } from "../type";
import { ResourceIcon, resourceBadgeStyle } from "./resource-icons";
import { resourceTypeOptions } from "./resource-list-options";

type ResourceListCardProps = {
  archiveDisabled: boolean;
  deleteDisabled: boolean;
  resource: Resource;
  onArchive: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
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
  deleteDisabled,
  resource,
  onArchive,
  onDelete,
  onOpen,
}: ResourceListCardProps) {
  const timestamp = resource.updated_at ?? resource.created_at;
  const relativeTimestamp = formatRelativeTimestamp(timestamp);

  return (
    <Card
      size="sm"
      className="group relative w-full min-w-0 shrink-0 cursor-pointer gap-3 transition-shadow hover:ring-foreground/20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring motion-reduce:transition-none"
    >
      <button
        type="button"
        aria-label={`Open ${resource.title}`}
        aria-haspopup="dialog"
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none"
        onClick={() => onOpen(resource)}
      />
      <CardHeader className="pointer-events-none relative z-10 min-w-0">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={resourceBadgeStyle(resource.background)}
            aria-hidden="true"
          >
            <ResourceIcon name={resource.icon} className="size-5" />
          </div>
          <div className="grid min-w-0 flex-1 gap-1.5">
            <CardTitle className="line-clamp-2 break-words leading-snug">
              {resource.title}
            </CardTitle>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {resource.types.map((value) => {
                const option = resourceTypeOptions.find(
                  (item) => item.value === value,
                );
                const Icon = option?.icon;
                return (
                  <span key={value} className="inline-flex items-center gap-1">
                    {Icon && <Icon className="size-3.5" aria-hidden="true" />}
                    {option?.label ?? value}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <CardAction className="pointer-events-auto -mr-1 -mt-1 flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-11 lg:size-8"
            aria-label={`Archive ${resource.title}`}
            title="Archive resource"
            disabled={archiveDisabled}
            onClick={() => onArchive(resource)}
          >
            <Archive aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-11 lg:size-8"
            aria-label={`Delete ${resource.title}`}
            title="Move resource to Trash"
            disabled={deleteDisabled}
            onClick={() => onDelete(resource)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pointer-events-none relative z-10 grid gap-2">
        <p className="line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">
          {resourcePreview(resource.content) ||
            resource.description ||
            resource.url ||
            "Open to view this resource."}
        </p>
        {resource.attachments.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Paperclip className="size-3.5" aria-hidden="true" />
            {resource.attachments.length} attachment
            {resource.attachments.length === 1 ? "" : "s"}
          </p>
        )}
      </CardContent>
      {(resource.tags.length > 0 ||
        resource.projects.length > 0 ||
        resource.areas.length > 0 ||
        relativeTimestamp) && (
          <CardFooter className="pointer-events-none relative z-10 flex-col items-stretch gap-3">
            {resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {resource.tags.map((item) => (
                  <Badge
                    key={item.uuid}
                    variant="secondary"
                    className="max-w-full"
                    title={item.name}
                  >
                    <span className="max-w-48 truncate">{item.name}</span>
                  </Badge>
                ))}
              </div>
            )}
            {(resource.projects.length > 0 ||
              resource.areas.length > 0 ||
              (relativeTimestamp && timestamp)) && (
                <div className="flex flex-wrap items-center gap-2">
                  {resource.projects.map((project) => (
                    <Badge
                      key={project.uuid}
                      variant="outline"
                      className="min-h-11 max-w-full lg:min-h-6"
                      title={project.name}
                      render={
                        <Link
                          href={`/projects/${project.uuid}`}
                          aria-label={`Open project ${project.name}`}
                          className="pointer-events-auto hover:bg-muted hover:text-muted-foreground"
                        />
                      }
                    >
                      <Target aria-hidden="true" />
                      <span className="min-w-0 truncate">Project: {project.name}</span>
                    </Badge>
                  ))}
                  {resource.areas.map((area) => (
                    <Badge
                      key={area.uuid}
                      variant="outline"
                      className="min-h-11 max-w-full lg:min-h-6"
                      title={area.name}
                      render={
                        <Link
                          href={`/areas/${area.uuid}`}
                          aria-label={`Open area ${area.name}`}
                          className="pointer-events-auto hover:bg-muted hover:text-muted-foreground"
                        />
                      }
                    >
                      <CirclePile aria-hidden="true" />
                      <span className="min-w-0 truncate">Area: {area.name}</span>
                    </Badge>
                  ))}
                  {relativeTimestamp && timestamp && (
                    <time
                      dateTime={timestamp}
                      title={new Date(timestamp).toLocaleString()}
                      className="ml-auto whitespace-nowrap text-xs text-muted-foreground"
                    >
                      {relativeTimestamp}
                    </time>
                  )}
                </div>
              )}
          </CardFooter>
        )}
    </Card>
  );
}
