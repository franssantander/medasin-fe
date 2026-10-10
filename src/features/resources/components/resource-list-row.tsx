import { Badge } from "@/components/ui/badge";
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

export function ResourceListRow({
  resource,
  ...actions
}: ResourceActionHandlers & { resource: Resource }) {
  const summary = resourceSummary(resource);
  const links = resourceLinks(resource);

  return (
    <li className="relative transition-colors duration-200 hover:bg-muted/40 has-[[data-resource-open]:focus-visible]:bg-muted/40 has-[[data-resource-open]:focus-visible]:ring-2 has-[[data-resource-open]:focus-visible]:ring-ring has-[[data-resource-open]:focus-visible]:ring-inset motion-reduce:transition-none">
      <button
        type="button"
        data-resource-open=""
        aria-label={`Open ${resource.title}`}
        aria-haspopup="dialog"
        className="absolute inset-0 z-0 cursor-pointer outline-none"
        onClick={() => actions.onOpen(resource)}
      />
      <div className="pointer-events-none flex min-h-14 items-center gap-3 px-4 py-3 sm:gap-4">
        <ResourceIconTile resource={resource} className="size-8" />

        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="truncate text-sm font-medium" title={resource.title}>
            {resource.title}
          </h3>
          {summary && (
            <p className="truncate text-xs text-muted-foreground">{summary}</p>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 text-muted-foreground sm:flex">
          {resource.types.map((value) => {
            const option = resourceTypeOption(value);
            const Icon = option?.icon;
            if (!Icon) return null;
            return (
              <span key={value} title={option.label} className="inline-flex">
                <Icon className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{option.label}</span>
              </span>
            );
          })}
        </div>

        <div className="hidden w-40 shrink-0 justify-end gap-1 md:flex">
          {resource.tags.slice(0, 2).map((item) => (
            <Badge
              key={item.uuid}
              variant="secondary"
              className="max-w-20 font-normal"
              title={item.name}
            >
              <span className="truncate">{item.name}</span>
            </Badge>
          ))}
          {resource.tags.length > 2 && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              +{resource.tags.length - 2}
            </Badge>
          )}
        </div>

        <span
          className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground lg:block"
          title={links.map((link) => link.name).join(", ") || undefined}
        >
          {links.length > 0 ? `${links.length} linked` : ""}
        </span>

        <ResourceTimestamp
          resource={resource}
          className="hidden w-16 shrink-0 text-right sm:block"
        />

        <ResourceActionsMenu
          resource={resource}
          {...actions}
          className="pointer-events-auto -mr-1.5 shrink-0"
        />
      </div>
    </li>
  );
}
