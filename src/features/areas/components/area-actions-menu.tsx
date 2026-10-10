"use client";

import {
  Archive,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAreaMutation } from "../queries/area-query";
import type { Area } from "../type";
import {
  AreaActionDialog,
  type AreaConfirmationAction,
} from "./area-action-dialog";

export function AreaActionsMenu({
  area,
  onEdit,
  triggerClassName,
}: {
  area: Area;
  onEdit: () => void;
  triggerClassName?: string;
}) {
  const [confirmationAction, setConfirmationAction] =
    useState<AreaConfirmationAction>();
  const archive = useAreaMutation("archive", area.uuid);
  const remove = useAreaMutation("remove", area.uuid);
  const isPending = archive.isPending || remove.isPending;

  const confirmAction = async () => {
    if (confirmationAction === "archive") {
      await archive.mutateAsync();
    } else if (confirmationAction === "delete") {
      await remove.mutateAsync();
    }

    setConfirmationAction(undefined);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                "transition-opacity data-popup-open:opacity-100 focus-visible:opacity-100",
                triggerClassName,
              )}
              aria-label={`Actions for ${area.name}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem render={<Link href={`/areas/${area.uuid}`} />}>
            <ArrowUpRight />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmationAction("archive")}>
            <Archive />
            Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onClick={() => setConfirmationAction("delete")}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AreaActionDialog
        action={confirmationAction}
        area={area}
        isPending={isPending}
        onConfirm={confirmAction}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirmationAction(undefined);
        }}
      />
    </>
  );
}
