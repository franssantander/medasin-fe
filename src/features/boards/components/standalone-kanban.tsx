"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectKanbanToolbar } from "@/features/projects/components/project-kanban-toolbar";
import { useStandaloneKanban } from "../hooks/use-standalone-kanban";
import { StandaloneKanbanBoard } from "./standalone-kanban-board";
import { StandaloneKanbanDialogs } from "./standalone-kanban-dialogs";

export function StandaloneKanban() {
  const kanban = useStandaloneKanban();

  if (kanban.boardsQuery.isLoading)
    return <Skeleton className="h-[38rem] rounded-xl" />;
  if (kanban.boardsQuery.isError) {
    return (
      <Card className="items-center py-14 text-center">
        <CardTitle>Boards could not be loaded</CardTitle>
        <Button variant="outline" onClick={() => kanban.boardsQuery.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }
  if (kanban.boards.length === 0) {
    return (
      <Card className="items-center py-16 text-center">
        <CardTitle>Board could not be initialized</CardTitle>
        <CardDescription>
          Your default board is not available yet. Try loading it again.
        </CardDescription>
        <Button variant="outline" onClick={() => kanban.boardsQuery.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <div className="@container grid min-w-0 gap-4">
      <ProjectKanbanToolbar
        boards={kanban.boards}
        selectedBoardUuid={kanban.selectedBoardUuid}
        archived={false}
        boardName={kanban.board?.name}
        labelCount={kanban.board?.labels.length}
        onSelectBoard={kanban.selectBoard}
        onOpenLabels={() => kanban.setLabelsOpen(true)}
        onOpenBoardDialog={kanban.setBoardDialog}
        onDeleteBoard={() => kanban.setDeleteBoardOpen(true)}
      />
      <StandaloneKanbanBoard {...kanban} />
      <StandaloneKanbanDialogs {...kanban} />
    </div>
  );
}
