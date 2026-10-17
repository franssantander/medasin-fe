"use client";

import Link from "next/link";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { formatAreaUpdatedAt } from "../area-list-utils";
import type { Area } from "../type";
import { AreaActionsMenu } from "./area-actions-menu";
import { AreaIcon, areaBadgeStyle } from "./area-icons";

export function AreaListItem({
  area,
  onEdit,
}: {
  area: Area;
  onEdit: () => void;
}) {
  return (
    <Item
      role="listitem"
      variant="outline"
      className="group/area relative flex-nowrap bg-card transition-colors hover:bg-muted/50 has-[a:focus-visible]:border-ring has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50"
    >
      <Link
        href={`/areas/${area.uuid}`}
        aria-label={`Open ${area.name}`}
        className="absolute inset-0 z-10 rounded-md outline-none"
      />
      <ItemMedia
        className="size-10 rounded-lg shadow-sm"
        style={areaBadgeStyle(area.background)}
      >
        <AreaIcon name={area.icon} className="size-4.5" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full truncate font-semibold">
          {area.name}
        </ItemTitle>
        <ItemDescription className="line-clamp-1">
          {area.description || <span className="italic">No description yet.</span>}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="relative z-20 shrink-0">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {formatAreaUpdatedAt(area.updated_at)}
        </span>
        <AreaActionsMenu area={area} onEdit={onEdit} />
      </ItemActions>
    </Item>
  );
}
