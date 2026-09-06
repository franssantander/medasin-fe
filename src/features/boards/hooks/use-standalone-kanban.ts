import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import type { TaskDraftValue } from "@/features/projects/components/project-kanban-board";
import type { BoardDialogValue } from "@/features/projects/components/project-kanban-toolbar";
import type { BoardStageKey, BoardTask } from "@/features/projects/type";
import { useBoardQuery, useBoardsQuery } from "../queries/board-query";
import { useBoardMutations } from "./use-board-mutations";

export function useStandaloneKanban() {
  const boardsQuery = useBoardsQuery();
  const boards = boardsQuery.data?.data ?? [];
  const [requestedBoardUuid, setRequestedBoardUuid] = useState<string>();
  const selectedBoardUuid = boards.some(
    (board) => board.uuid === requestedBoardUuid,
  )
    ? requestedBoardUuid
    : boards[0]?.uuid;
  const boardQuery = useBoardQuery(selectedBoardUuid);
  const board = boardQuery.data?.data;
  const [taskDraft, setTaskDraft] = useState<TaskDraftValue>();
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [boardDialog, setBoardDialog] = useState<BoardDialogValue>();
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<BoardTask>();
  const [selectedTaskUuid, setSelectedTaskUuid] = useState<string>();
  const selectedTask = board?.stages
    .flatMap((stage) => stage.tasks)
    .find((task) => task.uuid === selectedTaskUuid);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const mutations = useBoardMutations({
    selectedBoardUuid,
    selectedTaskUuid,
    boards,
    onBoardCreated: (uuid) => {
      setBoardDialog(undefined);
      setRequestedBoardUuid(uuid);
    },
    onBoardDeleted: setRequestedBoardUuid,
    onTaskDeleted: (uuid) => {
      if (selectedTaskUuid === uuid) setSelectedTaskUuid(undefined);
    },
  });

  const selectBoard = (uuid: string) => {
    setTaskDraft(undefined);
    setSelectedTaskUuid(undefined);
    setRequestedBoardUuid(uuid);
  };

  const startDrag = (event: DragStartEvent) => {
    setActiveTask(
      board?.stages
        .flatMap((stage) => stage.tasks)
        .find((task) => task.uuid === event.active.id),
    );
  };

  const endDrag = (event: DragEndEvent) => {
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
      { onSuccess: () => setTaskDraft(undefined) },
    );
  };

  return {
    activeTask,
    board,
    boardDialog,
    boardQuery,
    boards,
    boardsQuery,
    deleteBoardOpen,
    labelsOpen,
    mutations,
    selectedBoardUuid,
    selectedTask,
    sensors,
    taskDraft,
    cancelDrag: () => setActiveTask(undefined),
    endDrag,
    selectBoard,
    setBoardDialog,
    setDeleteBoardOpen,
    setLabelsOpen,
    setSelectedTaskUuid,
    setTaskDraft,
    startDrag,
    submitTaskDraft,
  };
}

export type StandaloneKanbanController = ReturnType<typeof useStandaloneKanban>;
