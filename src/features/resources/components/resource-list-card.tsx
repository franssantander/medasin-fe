import Link from "next/link";
import { CirclePile, Paperclip, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Resource } from "../type";
import {
  ResourceActionsMenu,
  type ResourceActionHandlers,
} from "./resource-actions-menu";
import {
  ResourceIconTile,
  ResourceTimestamp,
  resourceLinks,
  resourceSummary,
  resourceTypeOption,
} from "./resource-list-meta";

const VISIBLE_TAGS = 3;

export function ResourceListCard({
  resource,
  ...actions
}: ResourceActionHandlers & { resource: Resource }) {
  const summary = resourceSummary(resource);
  const visibleTags = resource.tags.slice(0, VISIBLE_TAGS);
  const hiddenTags = resource.tags.slice(VISIBLE_TAGS);
  const links = resourceLinks(resource);
  const [firstLink, ...otherLinks] = links;
  const attachmentCount = resource.attachments.length;

  return (
    <Card
      size="sm"
      className="relative h-full gap-0 p-0 shadow-none transition-[background-color,box-shadow] duration-200 hover:bg-muted/30 hover:ring-foreground/20 has-[[data-resource-open]:focus-visible]:ring-2 has-[[data-resource-open]:focus-visible]:ring-ring motion-reduce:transition-none"
    >
      <button
        type="button"
        data-resource-open=""
        aria-label={`Open ${resource.title}`}
        aria-haspopup="dialog"
        className="absolute inset-0 z-0 cursor-pointer rounded-xl outline-none"
        onClick={() => actions.onOpen(resource)}
      />

      <div className="pointer-events-none flex h-full flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <ResourceIconTile resource={resource} />
          <div className="grid min-w-0 flex-1 gap-1 pt-px">
            <h3
              className="line-clamp-2 text-[15px] leading-snug font-medium break-words"
              title={resource.title}
            >
              {resource.title}
            </h3>
            {resource.types.length > 0 && (
              <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                {resource.types.map((value) => {
                  const option = resourceTypeOption(value);
                  const Icon = option?.icon;
                  return (
                    <span key={value} className="inline-flex items-center gap-1">
                      {Icon && <Icon className="size-3" aria-hidden="true" />}
                      {option?.label ?? value}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <ResourceActionsMenu
            resource={resource}
            {...actions}
            className="pointer-events-auto -mt-1 -mr-2 shrink-0"
          />
        </div>

        {summary && (
          <p className="line-clamp-3 text-sm/relaxed break-words text-muted-foreground">
            {summary}
          </p>
        )}

        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Tags">
            {visibleTags.map((item) => (
              <Badge
                key={item.uuid}
                variant="secondary"
                className="max-w-40 font-normal"
                title={item.name}
              >
                <span className="truncate">{item.name}</span>
              </Badge>
            ))}
            {hiddenTags.length > 0 && (
              <Badge
                variant="outline"
                className="font-normal text-muted-foreground"
                title={hiddenTags.map((item) => item.name).join(", ")}
                aria-label={`${hiddenTags.length} more tags: ${hiddenTags
                  .map((item) => item.name)
                  .join(", ")}`}
              >
                +{hiddenTags.length}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-auto -mb-1.5 flex min-h-7 items-center gap-2 border-t pt-3">
          {firstLink && (
            <Badge
              variant="outline"
              className="min-w-0 max-w-[60%] font-normal"
              title={firstLink.name}
              render={
                <Link
                  href={firstLink.href}
                  aria-label={`Open ${firstLink.kind} ${firstLink.name}`}
                  className="pointer-events-auto relative z-10 hover:bg-muted hover:text-foreground"
                />
              }
            >
              {firstLink.kind === "project" ? (
                <Target aria-hidden="true" />
              ) : (
                <CirclePile aria-hidden="true" />
              )}
              <span className="min-w-0 truncate">{firstLink.name}</span>
            </Badge>
          )}
          {otherLinks.length > 0 && (
            <span
              className="shrink-0 text-xs text-muted-foreground"
              title={otherLinks.map((link) => link.name).join(", ")}
            >
              +{otherLinks.length} linked
            </span>
          )}
          {attachmentCount > 0 && (
            <span
              className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums"
              aria-label={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
            >
              <Paperclip className="size-3.5" aria-hidden="true" />
              {attachmentCount}
            </span>
          )}
          <ResourceTimestamp resource={resource} className="ml-auto shrink-0" />
        </div>
      </div>
    </Card>
  );
}
