import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { moveTaskLocally } from "@/features/projects/components/project-kanban-utils";
import type {
  Board,
  BoardLabel,
  BoardStageKey,
  BoardSummary,
  BoardTaskInput,
  ProjectApiResponse,
} from "@/features/projects/type";
import { boardKeys } from "../queries/board-query";
import { boardService } from "../services/board-service";

type BoardDialogValue = { mode: "create" | "rename"; name: string };

export function useBoardMutations({
  selectedBoardUuid,
  selectedTaskUuid,
  boards,
  onBoardCreated,
  onBoardDeleted,
  onTaskDeleted,
}: {
  selectedBoardUuid?: string;
  selectedTaskUuid?: string;
  boards: BoardSummary[];
  onBoardCreated: (uuid: string) => void;
  onBoardDeleted: (uuid?: string) => void;
  onTaskDeleted: (uuid: string) => void;
}) {
  const queryClient = useQueryClient();
  const error = (value: Error) => toast.add({ type: "error", description: value.message });
  const refresh = async (message?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: boardKeys.list() }),
      selectedBoardUuid
        ? queryClient.invalidateQueries({ queryKey: boardKeys.detail(selectedBoardUuid) })
        : Promise.resolve(),
    ]);
    if (message) toast.add({ type: "success", description: message });
  };

  const createTask = useMutation({
    mutationFn: (input: BoardTaskInput) => boardService.createTask(selectedBoardUuid!, input),
    onSuccess: (response) => refresh(response.message),
    onError: error,
  });
  const updateTask = useMutation({
    scope: { id: `standalone-task:${selectedBoardUuid}:${selectedTaskUuid}` },
    mutationFn: ({ taskUuid, input }: { taskUuid: string; input: BoardTaskInput }) =>
      boardService.updateTask(selectedBoardUuid!, taskUuid, input),
    onSuccess: () => refresh(),
    onError: error,
  });
  const deleteTask = useMutation({
    mutationFn: (taskUuid: string) => boardService.removeTask(selectedBoardUuid!, taskUuid),
    onSuccess: async (response, taskUuid) => {
      onTaskDeleted(taskUuid);
      await refresh(response.message);
    },
    onError: error,
  });
  const saveBoard = useMutation({
    mutationFn: ({ mode, name }: BoardDialogValue) =>
      mode === "create"
        ? boardService.create(name || undefined)
        : boardService.update(selectedBoardUuid!, name),
    onSuccess: async (response, value) => {
      await refresh(response.message);
      if (value.mode === "create") onBoardCreated(response.data.uuid);
    },
    onError: error,
  });
  const deleteBoard = useMutation({
    mutationFn: () => boardService.remove(selectedBoardUuid!),
    onSuccess: async (response) => {
      const next = boards.find((board) => board.uuid !== selectedBoardUuid);
      onBoardDeleted(next?.uuid);
      await refresh(response.message);
    },
    onError: error,
  });
  const saveLabel = useMutation({
    mutationFn: ({ input, label }: {
      input: Parameters<typeof boardService.createLabel>[1];
      label?: BoardLabel;
    }) => label
      ? boardService.updateLabel(selectedBoardUuid!, label.uuid, input)
      : boardService.createLabel(selectedBoardUuid!, input),
    onSuccess: (response) => refresh(response.message),
    onError: error,
  });
  const deleteLabel = useMutation({
    mutationFn: (uuid: string) => boardService.removeLabel(selectedBoardUuid!, uuid),
    onSuccess: (response) => refresh(response.message),
    onError: error,
  });
  const moveTask = useMutation({
    mutationFn: ({ taskUuid, stage, position }: { taskUuid: string; stage: BoardStageKey; position: number }) =>
      boardService.moveTask(selectedBoardUuid!, taskUuid, stage, position),
    onMutate: ({ taskUuid, stage, position }) => {
      const key = boardKeys.detail(selectedBoardUuid!);
      const previous = queryClient.getQueryData<ProjectApiResponse<Board>>(key);
      queryClient.setQueryData<ProjectApiResponse<Board>>(key, (current) =>
        current ? { ...current, data: moveTaskLocally(current.data, taskUuid, stage, position) } : current,
      );
      return { previous };
    },
    onError: (value, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(boardKeys.detail(selectedBoardUuid!), context.previous);
      error(value);
    },
    onSuccess: (response) => refresh(response.message),
  });

  return { createTask, deleteBoard, deleteLabel, deleteTask, moveTask, saveBoard, saveLabel, updateTask };
}
