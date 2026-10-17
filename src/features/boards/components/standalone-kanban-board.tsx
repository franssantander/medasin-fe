import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  KanbanColumn,
  TaskCard,
} from "@/features/projects/components/project-kanban-board";
import { KanbanTaskLayout } from "@/features/projects/components/project-kanban-layout";
import { kanbanGridStyles } from "@/features/projects/components/project-kanban-utils";
import { KanbanBoardSkeleton } from "@/features/projects/components/project-skeletons";
import { TaskDetailsPanel } from "@/features/projects/components/project-task-details-panel";
import { cn } from "@/lib/utils";
import type { StandaloneKanbanController } from "../hooks/use-standalone-kanban";

type BoardContentProps = Pick<
  StandaloneKanbanController,
  | "activeTask"
  | "board"
  | "boardQuery"
  | "cancelDrag"
  | "closeTask"
  | "endDrag"
  | "mutations"
  | "selectedTask"
  | "sensors"
  | "setSelectedTaskUuid"
  | "setTaskDraft"
  | "setTaskExpanded"
  | "startDrag"
  | "submitTaskDraft"
  | "taskDraft"
  | "taskExpanded"
> & { className?: string };

export function StandaloneKanbanBoard({
  activeTask,
  board,
  boardQuery,
  cancelDrag,
  closeTask,
  endDrag,
  mutations,
  selectedTask,
  sensors,
  setSelectedTaskUuid,
  setTaskDraft,
  setTaskExpanded,
  startDrag,
  submitTaskDraft,
  taskDraft,
  taskExpanded,
  className,
}: BoardContentProps) {
  if (boardQuery.isLoading) {
    return (
      <div className={className}>
        <KanbanBoardSkeleton fill />
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
    <KanbanTaskLayout
      className={className}
      expanded={taskExpanded}
      board={
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={startDrag}
          onDragEnd={endDrag}
          onDragCancel={cancelDrag}
        >
          <div className={cn(kanbanGridStyles, "h-full min-h-0")}>
            {board.stages.map((stage) => (
              <KanbanColumn
                key={stage.uuid}
                stage={stage}
                archived={false}
                draft={taskDraft?.stage === stage.key ? taskDraft : undefined}
                isCreating={mutations.createTask.isPending}
                selectedTaskUuid={selectedTask?.uuid}
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
      }
      panel={
        selectedTask && (
          <TaskDetailsPanel
            key={selectedTask.uuid}
            task={selectedTask}
            boardName={board.name}
            stages={board.stages}
            labels={board.labels}
            archived={false}
            isSaving={mutations.updateTask.isPending}
            isDeleting={mutations.deleteTask.isPending}
            expanded={taskExpanded}
            onExpandedChange={setTaskExpanded}
            onClose={closeTask}
            onSave={(input) =>
              mutations.updateTask
                .mutateAsync({ taskUuid: selectedTask.uuid, input })
                .then(() => undefined)
            }
            onDelete={() => mutations.deleteTask.mutate(selectedTask.uuid)}
          />
        )
      }
    />
  );
}
