import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { projectKeys } from "../queries/project-query";
import { projectService } from "../services/project-service";
import type {
  Board,
  BoardLabel,
  BoardStageKey,
  BoardSummary,
  BoardTaskInput,
  ProjectApiResponse,
} from "../type";
import { moveTaskLocally } from "../components/project-kanban-utils";

type BoardDialogValue = {
  mode: "create" | "rename";
  name: string;
};

export function useProjectKanbanMutations({
  projectUuid,
  selectedBoardUuid,
  selectedTaskUuid,
  boards,
  onBoardCreated,
  onBoardDeleted,
  onTaskDeleted,
}: {
  projectUuid: string;
  selectedBoardUuid?: string;
  selectedTaskUuid?: string;
  boards: BoardSummary[];
  onBoardCreated: (boardUuid: string) => void;
  onBoardDeleted: (boardUuid?: string) => void;
  onTaskDeleted: (taskUuid: string) => void;
}) {
  const queryClient = useQueryClient();

  const refresh = async (message?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectUuid),
      }),
      selectedBoardUuid
        ? queryClient.invalidateQueries({
            queryKey: projectKeys.board(projectUuid, selectedBoardUuid),
          })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    ]);
    if (message) toast.add({ type: "success", description: message });
  };

  const mutationError = (error: Error) =>
    toast.add({ type: "error", description: error.message });

  const updateTask = useMutation({
    scope: { id: `task:${selectedBoardUuid}:${selectedTaskUuid}` },
    mutationFn: ({
      taskUuid,
      input,
    }: {
      taskUuid: string;
      input: BoardTaskInput;
    }) =>
      projectService.updateTask(
        projectUuid,
        selectedBoardUuid!,
        taskUuid,
        input,
      ),
    onSuccess: (response) => refresh(response.message),
    onError: mutationError,
  });

  const createTask = useMutation({
    mutationFn: (input: BoardTaskInput) =>
      projectService.createTask(projectUuid, selectedBoardUuid!, input),
    onSuccess: (response) => refresh(response.message),
    onError: mutationError,
  });

  const deleteTask = useMutation({
    mutationFn: (taskUuid: string) =>
      projectService.removeTask(projectUuid, selectedBoardUuid!, taskUuid),
    onSuccess: async (response, taskUuid) => {
      onTaskDeleted(taskUuid);
      await refresh(response.message);
    },
    onError: mutationError,
  });

  const saveBoard = useMutation({
    mutationFn: ({ mode, name }: BoardDialogValue) =>
      mode === "create"
        ? projectService.createBoard(projectUuid, name || undefined)
        : projectService.updateBoard(projectUuid, selectedBoardUuid!, name),
    onSuccess: async (response, values) => {
      await refresh(response.message);
      if (values.mode === "create") onBoardCreated(response.data.uuid);
    },
    onError: mutationError,
  });

  const deleteBoard = useMutation({
    mutationFn: () =>
      projectService.removeBoard(projectUuid, selectedBoardUuid!),
    onSuccess: async (response) => {
      const next = boards.find((item) => item.uuid !== selectedBoardUuid);
      onBoardDeleted(next?.uuid);
      await refresh(response.message);
    },
    onError: mutationError,
  });

  const saveLabel = useMutation({
    mutationFn: ({
      input,
      label,
    }: {
      input: Parameters<typeof projectService.createLabel>[2];
      label?: BoardLabel;
    }) =>
      label
        ? projectService.updateLabel(
            projectUuid,
            selectedBoardUuid!,
            label.uuid,
            input,
          )
        : projectService.createLabel(projectUuid, selectedBoardUuid!, input),
    onSuccess: (response) => refresh(response.message),
    onError: mutationError,
  });

  const deleteLabel = useMutation({
    mutationFn: (labelUuid: string) =>
      projectService.removeLabel(projectUuid, selectedBoardUuid!, labelUuid),
    onSuccess: (response) => refresh(response.message),
    onError: mutationError,
  });

  const moveTask = useMutation({
    mutationFn: ({
      taskUuid,
      stage,
      position,
    }: {
      taskUuid: string;
      stage: BoardStageKey;
      position: number;
    }) =>
      projectService.moveTask(
        projectUuid,
        selectedBoardUuid!,
        taskUuid,
        stage,
        position,
      ),
    onMutate: ({ taskUuid, stage, position }) => {
      const key = projectKeys.board(projectUuid, selectedBoardUuid!);
      const previous = queryClient.getQueryData<ProjectApiResponse<Board>>(key);
      queryClient.setQueryData<ProjectApiResponse<Board>>(key, (current) =>
        current
          ? {
              ...current,
              data: moveTaskLocally(current.data, taskUuid, stage, position),
            }
          : current,
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          projectKeys.board(projectUuid, selectedBoardUuid!),
          context.previous,
        );
      }
      mutationError(error);
    },
    onSuccess: (response) => refresh(response.message),
  });

  return {
    createTask,
    deleteBoard,
    deleteLabel,
    deleteTask,
    moveTask,
    saveBoard,
    saveLabel,
    updateTask,
  };
}
