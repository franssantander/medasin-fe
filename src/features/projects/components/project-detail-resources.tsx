"use client";

import { BookOpen, ChevronDown, FilePlus2, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Resource } from "@/features/resources/type";
import { ProjectResourceRow } from "./project-resource-row";

export function ProjectDetailResources({
  resources,
  archived,
  removingResourceUuid,
  onOpen,
  onRemove,
  onCreate,
  onLink,
}: {
  resources: Resource[];
  archived: boolean;
  removingResourceUuid?: string;
  onOpen: (resource: Resource) => void;
  onRemove: (resource: Resource) => void;
  onCreate: () => void;
  onLink: () => void;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <BookOpen className="size-4 text-muted-foreground" aria-hidden="true" />
            Resources
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {resources.length}
            </span>
          </h2>
          {!archived && resources.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button type="button" variant="outline" size="sm" />}
              >
                <Plus data-icon="inline-start" />
                Add resource
                <ChevronDown data-icon="inline-end" className="text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                <DropdownMenuItem onClick={onCreate}>
                  <FilePlus2 />
                  Create new
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLink}>
                  <Link2 />
                  Link existing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {resources.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BookOpen className="size-4" aria-hidden="true" />
            </span>
            <div className="grid gap-1">
              <p className="text-sm font-medium">No resources yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Keep references, links, and notes for this project in one place.
              </p>
            </div>
            {!archived && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" size="sm" onClick={onCreate}>
                  <FilePlus2 data-icon="inline-start" />
                  Create new
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onLink}>
                  <Link2 data-icon="inline-start" />
                  Link existing
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ProjectResourceRow
            resources={resources}
            onOpen={onOpen}
            onRemove={archived ? undefined : onRemove}
            removingResourceUuid={removingResourceUuid}
          />
        )}
      </CardContent>
    </Card>
  );
}
