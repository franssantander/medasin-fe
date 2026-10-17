import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The board beside its task details panel. On large screens the panel docks to the
 * right and the board keeps working; below `lg`, or when expanded, the panel takes
 * the board's place.
 */
export function KanbanTaskLayout({
  board,
  panel,
  expanded,
  className,
}: {
  board: ReactNode;
  /** The open task's panel, or nothing when no task is open. */
  panel?: ReactNode;
  expanded: boolean;
  className?: string;
}) {
  const panelOpen = Boolean(panel);

  return (
    <div className={cn("flex min-h-0 min-w-0 gap-4", className)}>
      <div
        className={cn(
          "@container h-full min-w-0 flex-1",
          panelOpen && (expanded ? "hidden" : "hidden lg:block"),
        )}
      >
        {board}
      </div>
      {panelOpen && (
        <div
          className={cn(
            "h-full min-h-0 w-full min-w-0",
            expanded ? "flex-1" : "lg:w-[26rem] lg:shrink-0 xl:w-[30rem] 2xl:w-[34rem]",
          )}
        >
          {panel}
        </div>
      )}
    </div>
  );
}

/** Project boards fill the viewport once scrolled to, with a floor for short windows. */
export const projectKanbanRegionStyles = "h-[max(36rem,calc(100dvh-9rem))]";
