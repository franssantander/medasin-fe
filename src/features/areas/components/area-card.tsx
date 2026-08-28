"use client";

import { Archive, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAreaMutation } from "../queries/area-query";
import type { Area } from "../type";
import {
  AreaActionDialog,
  type AreaConfirmationAction,
} from "./area-action-dialog";
import { DEFAULT_AREA_BACKGROUND } from "./area-form-dialog";
import { AreaIcon, areaBadgeStyle } from "./area-icons";

export function AreaCard({ area, onEdit }: { area: Area; onEdit: () => void }) {
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
      <Card className="group relative gap-0 overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <Link
          href={`/areas/${area.uuid}`}
          aria-label={`Open ${area.name}`}
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />

        <div
          className="relative h-32 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
          style={{
            backgroundImage: `url('${area.background_image_url || DEFAULT_AREA_BACKGROUND}')`,
          }}
        >
          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
        </div>

        <div className="absolute right-3 top-3 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="bg-background/90 shadow-sm backdrop-blur-sm"
                  aria-label={`Actions for ${area.name}`}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmationAction("archive")}
              >
                <Archive />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setConfirmationAction("delete")}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardContent className="relative gap-2 px-5 pb-5 pt-0">
          <div
            className="-mt-6 mb-1 flex size-12 items-center justify-center rounded-xl text-xl shadow-md ring-4 ring-card"
            style={areaBadgeStyle(area.background)}
          >
            <AreaIcon name={area.icon} className="size-5" />
          </div>
          <CardTitle className="font-bold">{area.name}</CardTitle>
          <CardDescription className="line-clamp-2 min-h-10">
            {area.description || "No description yet."}
          </CardDescription>
        </CardContent>
      </Card>

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
