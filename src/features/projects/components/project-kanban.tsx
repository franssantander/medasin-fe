"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectKanbanMutations } from "../hooks/use-project-kanban-mutations";
import { useProjectBoardQuery } from "../queries/project-query";
import type { BoardStageKey, BoardSummary, BoardTask } from "../type";
import {
  KanbanColumn,
  TaskCard,
  type TaskDraftValue,
} from "./project-kanban-board";
import {
  ProjectBoardDialog,
  ProjectKanbanToolbar,
  type BoardDialogValue,
} from "./project-kanban-toolbar";
import { kanbanGridStyles } from "./project-kanban-utils";
import { ProjectLabelDialog } from "./project-label-dialog";
import { TaskDetailsSheet } from "./project-task-details-sheet";

export function ProjectKanban({
  projectUuid,
  boards,
  archived,
}: {
  projectUuid: string;
  boards: BoardSummary[];
  archived: boolean;
}) {
  const [selectedBoardUuid, setSelectedBoardUuid] = useState<
    string | undefined
  >(boards[0]?.uuid);
  const [taskDraft, setTaskDraft] = useState<TaskDraftValue>();
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [boardDialog, setBoardDialog] = useState<BoardDialogValue>();
  const [activeTask, setActiveTask] = useState<BoardTask>();
  const [selectedTaskUuid, setSelectedTaskUuid] = useState<string>();
  const boardQuery = useProjectBoardQuery(projectUuid, selectedBoardUuid);
  const board = boardQuery.data?.data;
  const selectedTask = board?.stages
    .flatMap((stage) => stage.tasks)
    .find((task) => task.uuid === selectedTaskUuid);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const mutations = useProjectKanbanMutations({
    projectUuid,
    selectedBoardUuid,
    selectedTaskUuid,
    boards,
    onBoardCreated: (boardUuid) => {
      setBoardDialog(undefined);
      setSelectedBoardUuid(boardUuid);
    },
    onBoardDeleted: (boardUuid) => setSelectedBoardUuid(boardUuid),
    onTaskDeleted: (taskUuid) => {
      if (selectedTaskUuid === taskUuid) setSelectedTaskUuid(undefined);
    },
  });

  const handleSelectBoard = (boardUuid: string) => {
    setTaskDraft(undefined);
    setSelectedTaskUuid(undefined);
    setSelectedBoardUuid(boardUuid);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(undefined);
    if (!board || !event.over || event.active.id === event.over.id) return;

    const task = board.stages
      .flatMap((stage) => stage.tasks)
      .find((item) => item.uuid === event.active.id);
    if (!task) return;

    const overId = String(event.over.id);
    const targetStage = overId.startsWith("stage:")
      ? board.stages.find((stage) => stage.key === overId.slice(6))
      : board.stages.find((stage) =>
          stage.tasks.some((item) => item.uuid === overId),
        );
    if (!targetStage) return;

    const position = overId.startsWith("stage:")
      ? targetStage.tasks.length
      : Math.max(
          0,
          targetStage.tasks.findIndex((item) => item.uuid === overId),
        );
    mutations.moveTask.mutate({
      taskUuid: task.uuid,
      stage: targetStage.key,
      position,
    });
  };

  const submitTaskDraft = (stage: BoardStageKey) => {
    const title = taskDraft?.title.trim();
    if (!title) return;

    mutations.createTask.mutate(
      {
        title,
        description: null,
        priority: "medium",
        stage,
        label_uuids: [],
        resource_uuids: [],
        note_uuids: [],
      },
      {
        onSuccess: () =>
          setTaskDraft((draft) =>
            draft?.stage === stage && draft.title.trim() === title
              ? undefined
              : draft,
          ),
      },
    );
  };

  return (
    <div className="@container grid min-w-0 gap-4">
      <ProjectKanbanToolbar
        boards={boards}
        selectedBoardUuid={selectedBoardUuid}
        archived={archived}
        boardName={board?.name}
        labelCount={board?.labels.length}
        onSelectBoard={handleSelectBoard}
        onOpenLabels={() => setLabelsOpen(true)}
        onOpenBoardDialog={setBoardDialog}
        onDeleteBoard={() => {
          if (window.confirm("Delete this board and all of its tasks?")) {
            mutations.deleteBoard.mutate();
          }
        }}
      />

      {boardQuery.isLoading ? (
        <div className={kanbanGridStyles}>
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-[32rem] rounded-xl" />
          ))}
        </div>
      ) : boardQuery.isError || !board ? (
        <Card className="items-center py-12">
          <CardTitle>Board could not be loaded</CardTitle>
          <Button variant="outline" onClick={() => boardQuery.refetch()}>
            Try again
          </Button>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event: DragStartEvent) =>
            setActiveTask(
              board.stages
                .flatMap((stage) => stage.tasks)
                .find((task) => task.uuid === event.active.id),
            )
          }
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(undefined)}
        >
          <div className={kanbanGridStyles}>
            {board.stages.map((stage) => (
              <KanbanColumn
                key={stage.uuid}
                stage={stage}
                archived={archived}
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
      )}

      <TaskDetailsSheet
        key={selectedTask?.uuid ?? "closed"}
        task={selectedTask}
        stages={board?.stages ?? []}
        labels={board?.labels ?? []}
        archived={archived}
        isSaving={mutations.updateTask.isPending}
        isDeleting={mutations.deleteTask.isPending}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskUuid(undefined);
        }}
        onSave={(input) => {
          if (!selectedTask) return Promise.resolve();
          return mutations.updateTask
            .mutateAsync({ taskUuid: selectedTask.uuid, input })
            .then(() => undefined);
        }}
        onDelete={() => {
          if (selectedTask) {
            mutations.deleteTask.mutate(selectedTask.uuid);
          }
        }}
      />

      {board && (
        <ProjectLabelDialog
          open={labelsOpen}
          onOpenChange={setLabelsOpen}
          labels={board.labels}
          isPending={
            mutations.saveLabel.isPending || mutations.deleteLabel.isPending
          }
          onSave={(input, label) =>
            mutations.saveLabel
              .mutateAsync({ input, label })
              .then(() => undefined)
          }
          onDelete={(label) =>
            mutations.deleteLabel.mutateAsync(label.uuid).then(() => undefined)
          }
        />
      )}

      <ProjectBoardDialog
        dialog={boardDialog}
        isSaving={mutations.saveBoard.isPending}
        onChange={setBoardDialog}
        onClose={() => setBoardDialog(undefined)}
        onSave={(dialog) =>
          mutations.saveBoard.mutate(dialog, {
            onSuccess: () => setBoardDialog(undefined),
          })
        }
      />
    </div>
  );
}
