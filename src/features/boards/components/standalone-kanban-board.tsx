import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KanbanColumn,
  TaskCard,
} from "@/features/projects/components/project-kanban-board";
import { kanbanGridStyles } from "@/features/projects/components/project-kanban-utils";
import type { StandaloneKanbanController } from "../hooks/use-standalone-kanban";

type BoardContentProps = Pick<
  StandaloneKanbanController,
  | "activeTask"
  | "board"
  | "boardQuery"
  | "cancelDrag"
  | "endDrag"
  | "mutations"
  | "sensors"
  | "setSelectedTaskUuid"
  | "setTaskDraft"
  | "startDrag"
  | "submitTaskDraft"
  | "taskDraft"
>;

export function StandaloneKanbanBoard({
  activeTask,
  board,
  boardQuery,
  cancelDrag,
  endDrag,
  mutations,
  sensors,
  setSelectedTaskUuid,
  setTaskDraft,
  startDrag,
  submitTaskDraft,
  taskDraft,
}: BoardContentProps) {
  if (boardQuery.isLoading) {
    return (
      <div className={`${kanbanGridStyles} h-full min-h-0`}>
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-full min-h-80 rounded-xl" />
        ))}
      </div>
    );
  }
  if (boardQuery.isError || !board) {
    return (
      <Card className="items-center py-12">
        <CardTitle>Board could not be loaded</CardTitle>
        <Button variant="outline" onClick={() => boardQuery.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={startDrag}
      onDragEnd={endDrag}
      onDragCancel={cancelDrag}
    >
      <div
        className={`${kanbanGridStyles} h-full min-h-0 [&>section]:h-full [&>section]:min-h-80`}
      >
        {board.stages.map((stage) => (
          <KanbanColumn
            key={stage.uuid}
            stage={stage}
            archived={false}
            draft={taskDraft?.stage === stage.key ? taskDraft : undefined}
            isCreating={mutations.createTask.isPending}
            onAdd={() => setTaskDraft({ stage: stage.key, title: "" })}
            onDraftChange={(title) =>
              setTaskDraft((draft) =>
                draft?.stage === stage.key ? { ...draft, title } : draft,
              )
            }
            onDraftCancel={() => setTaskDraft(undefined)}
            onDraftSubmit={() => submitTaskDraft(stage.key)}
            onOpen={(task) => setSelectedTaskUuid(task.uuid)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
