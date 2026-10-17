import { PageHeaderSkeleton } from "@/components/shared/page-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanBoardSkeleton } from "@/features/projects/components/project-skeletons";

export function BoardToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
      <Skeleton className="h-9 w-44" />
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="h-8 w-8 sm:w-20" />
        <Skeleton className="size-8" />
      </div>
    </div>
  );
}

export function BoardPageSkeleton() {
  return (
    <div
      data-page-skeleton="board"
      className="@container flex h-full min-h-0 min-w-0 flex-col gap-4"
    >
      <PageHeaderSkeleton titleWidth="w-16" descriptionWidth="w-[26rem]" />
      <BoardToolbarSkeleton />
      <div className="min-h-0 flex-1">
        <KanbanBoardSkeleton fill />
      </div>
    </div>
  );
}
