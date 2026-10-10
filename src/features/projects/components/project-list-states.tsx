import { FolderKanban, Inbox, Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectView } from "../project-list-utils";

export function ProjectListSkeleton({ view }: { view: ProjectView }) {
  return (
    <div role="status" aria-label="Loading projects" className="grid gap-5">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 sm:max-w-sm" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-[4.5rem]" />
      </div>
      {view === "list" ? (
        <div className="divide-y rounded-xl ring-1 ring-foreground/10">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="size-8 rounded-lg" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/5" />
              </div>
              <Skeleton className="hidden h-1 w-36 md:block" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="grid gap-4 rounded-xl p-5 ring-1 ring-foreground/10"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-lg" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}
      <span className="sr-only">Loading projects…</span>
    </div>
  );
}

const emptyContent = {
  active: {
    icon: FolderKanban,
    title: "No active projects",
    description:
      "Projects that belong to an area show up here. Create one to get started.",
  },
  inbox: {
    icon: Inbox,
    title: "Inbox is clear",
    description:
      "Projects without an area wait here until you give them a home.",
  },
  "no-results": {
    icon: SearchX,
    title: "No matching projects",
    description: "Try a different search, or clear the filters to see everything.",
  },
} as const;

export function ProjectListEmpty({
  variant,
  onCreate,
  onClearFilters,
}: {
  variant: keyof typeof emptyContent;
  onCreate: () => void;
  onClearFilters: () => void;
}) {
  const { icon: Icon, title, description } = emptyContent[variant];

  return (
    <Empty className="min-h-72 border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-muted/60 text-muted-foreground">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {variant === "no-results" ? (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : (
          <Button variant="outline" onClick={onCreate}>
            <Plus />
            New project
          </Button>
        )}
      </EmptyContent>
    </Empty>
  );
}

export function ProjectListError({ onRetry }: { onRetry: () => void }) {
  return (
    <Empty className="min-h-72 border border-dashed">
      <EmptyHeader>
        <EmptyTitle className="text-base">Projects could not be loaded</EmptyTitle>
        <EmptyDescription>Check your connection and try again.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
