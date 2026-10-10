"use client";

import { Archive, MoreHorizontal, PanelRightOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Resource } from "../type";

export type ResourceActionHandlers = {
  archiveDisabled: boolean;
  deleteDisabled: boolean;
  onArchive: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
  onOpen: (resource: Resource) => void;
};

export function ResourceActionsMenu({
  resource,
  archiveDisabled,
  deleteDisabled,
  onArchive,
  onDelete,
  onOpen,
  className,
}: ResourceActionHandlers & { resource: Resource; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "relative z-10 text-muted-foreground hover:text-foreground aria-expanded:text-foreground",
              className,
            )}
            aria-label={`Actions for ${resource.title}`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onOpen(resource)}>
          <PanelRightOpen />
          Open
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={archiveDisabled}
          onClick={() => onArchive(resource)}
        >
          <Archive />
          Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={deleteDisabled}
          onClick={() => onDelete(resource)}
        >
          <Trash2 />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
