"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAreaUpdatedAt } from "../area-list-utils";
import type { Area } from "../type";
import { AreaActionsMenu } from "./area-actions-menu";
import { DEFAULT_AREA_BACKGROUND } from "./area-form-dialog";
import { AreaIcon, areaBadgeStyle } from "./area-icons";

export function AreaCard({ area, onEdit }: { area: Area; onEdit: () => void }) {
  return (
    <Card className="group/area relative gap-0 py-0 transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-lg has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring motion-reduce:hover:translate-y-0">
      <Link
        href={`/areas/${area.uuid}`}
        aria-label={`Open ${area.name}`}
        className="absolute inset-0 z-10 rounded-xl outline-none"
      />

      <div className="relative aspect-16/7 overflow-hidden bg-muted">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/area:scale-105 motion-reduce:group-hover/area:scale-100"
          style={{
            backgroundImage: `url('${area.background_image_url || DEFAULT_AREA_BACKGROUND}')`,
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/30 via-black/0 to-black/10" />
      </div>

      <div className="absolute right-3 top-3 z-20">
        <AreaActionsMenu
          area={area}
          onEdit={onEdit}
          triggerClassName="bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background pointer-fine:opacity-0 pointer-fine:group-hover/area:opacity-100"
        />
      </div>

      <CardContent className="flex-1 gap-1.5 px-5 pb-4">
        <div
          className="relative z-1 -mt-6 mb-2 flex size-12 items-center justify-center rounded-xl shadow-md ring-4 ring-card"
          style={areaBadgeStyle(area.background)}
        >
          <AreaIcon name={area.icon} className="size-5" />
        </div>
        <CardTitle className="truncate text-base font-semibold">
          {area.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 min-h-10">
          {area.description || <span className="italic">No description yet.</span>}
        </CardDescription>
      </CardContent>

      <CardFooter className="justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
        <span className="truncate">{formatAreaUpdatedAt(area.updated_at)}</span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-hover/area:-translate-y-0.5 group-hover/area:translate-x-0.5 group-hover/area:text-foreground"
        />
      </CardFooter>
    </Card>
  );
}

export function AreaCardSkeleton() {
  return (
    <Card className="gap-0 py-0" aria-hidden="true">
      <Skeleton className="aspect-16/7 rounded-none" />
      <CardContent className="gap-2 px-5 pb-4">
        <Skeleton className="relative z-1 -mt-6 mb-2 size-12 rounded-xl ring-4 ring-card" />
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
      <CardFooter className="border-t px-5 py-3">
        <Skeleton className="h-3 w-28" />
      </CardFooter>
    </Card>
  );
}
