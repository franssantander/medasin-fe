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
