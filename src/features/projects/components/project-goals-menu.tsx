"use client";

import { LoaderCircle, StarCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  goalStatusBadgeClassNames,
  goalStatusLabels,
} from "@/features/areas/goal-status";
import { areaKeys } from "@/features/areas/queries/area-query";
import { areaService } from "@/features/areas/services/area-service";
import type { ProjectListCard } from "../type";

function goalCountLabel(count: number) {
  return `${count} ${count === 1 ? "goal" : "goals"}`;
}

export function ProjectGoalsMenu({ project }: { project: ProjectListCard }) {
  const [open, setOpen] = useState(false);
  const areaUuid = project.area?.uuid;
  const goalsQuery = useQuery({
    queryKey: areaKeys.section(areaUuid ?? "", "goals", 1, "all"),
    queryFn: () => areaService.goals(areaUuid!, 1, "all"),
    enabled: open && Boolean(areaUuid),
  });

  if (!areaUuid) {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 px-2 text-xs text-muted-foreground">
        <StarCheck className="size-3.5" aria-hidden="true" />
        {goalCountLabel(0)}
      </span>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="relative z-10 h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-foreground aria-expanded:text-foreground"
            aria-label={`View goals for ${project.name}`}
          />
        }
      >
        <StarCheck className="size-3.5" aria-hidden="true" />
        {goalCountLabel(project.goals.count)}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-72 max-w-[calc(100vw-2rem)]"
      >
        {goalsQuery.isLoading ? (
          <div className="flex min-h-16 items-center justify-center gap-2 px-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            Loading goals…
          </div>
        ) : goalsQuery.isError ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            Goals could not be loaded.
          </div>
        ) : goalsQuery.data?.data.items.data.length ? (
          goalsQuery.data.data.items.data.map((goal) => (
            <DropdownMenuItem
              key={goal.uuid}
              render={<Link href={`/projects/areas/${areaUuid}?tab=goals`} />}
              className="items-start justify-between gap-3"
            >
              <span className="min-w-0 flex-1 truncate font-medium">
                {goal.title}
              </span>
              <Badge
                variant="outline"
                className={`shrink-0 ${goalStatusBadgeClassNames[goal.status]}`}
              >
                {goalStatusLabels[goal.status]}
              </Badge>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No goals in this area yet.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
