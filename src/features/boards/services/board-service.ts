import { axiosClient } from "@/lib/axios";
import type {
  Board,
  BoardLabel,
  BoardLabelColor,
  BoardSummary,
  BoardTask,
  BoardTaskInput,
  BoardStageKey,
  ProjectApiResponse,
} from "@/features/projects/type";

const unwrap = <T>(request: Promise<{ data: ProjectApiResponse<T> }>) =>
  request.then((response) => response.data);

export const boardService = {
  list: () =>
    unwrap(axiosClient.get<ProjectApiResponse<BoardSummary[]>>("/board")),
  show: (boardUuid: string) =>
    unwrap(axiosClient.get<ProjectApiResponse<Board>>(`/board/${boardUuid}`)),
  create: (name?: string) =>
    unwrap(
      axiosClient.post<ProjectApiResponse<Board>>(
        "/board",
        name ? { name } : {},
      ),
    ),
  update: (boardUuid: string, name: string) =>
    unwrap(
      axiosClient.put<ProjectApiResponse<Board>>(`/board/${boardUuid}`, {
        name,
      }),
    ),
  remove: (boardUuid: string) =>
    unwrap(axiosClient.delete<ProjectApiResponse<null>>(`/board/${boardUuid}`)),
  createTask: (boardUuid: string, input: BoardTaskInput) =>
    unwrap(
      axiosClient.post<ProjectApiResponse<BoardTask>>(
        `/board/${boardUuid}/tasks`,
        input,
      ),
    ),
  updateTask: (boardUuid: string, taskUuid: string, input: BoardTaskInput) =>
    unwrap(
      axiosClient.put<ProjectApiResponse<BoardTask>>(
        `/board/${boardUuid}/tasks/${taskUuid}`,
        input,
      ),
    ),
  removeTask: (boardUuid: string, taskUuid: string) =>
    unwrap(
      axiosClient.delete<ProjectApiResponse<null>>(
        `/board/${boardUuid}/tasks/${taskUuid}`,
      ),
    ),
  moveTask: (
    boardUuid: string,
    taskUuid: string,
    stage: BoardStageKey,
    position: number,
  ) =>
    unwrap(
      axiosClient.patch<ProjectApiResponse<BoardTask>>(
        `/board/${boardUuid}/tasks/${taskUuid}/move`,
        { stage, position },
      ),
    ),
  createLabel: (
    boardUuid: string,
    input: { name: string; color: BoardLabelColor },
  ) =>
    unwrap(
      axiosClient.post<ProjectApiResponse<BoardLabel>>(
        `/board/${boardUuid}/labels`,
        input,
      ),
    ),
  updateLabel: (
    boardUuid: string,
    labelUuid: string,
    input: { name: string; color: BoardLabelColor },
  ) =>
    unwrap(
      axiosClient.put<ProjectApiResponse<BoardLabel>>(
        `/board/${boardUuid}/labels/${labelUuid}`,
        input,
      ),
    ),
  removeLabel: (boardUuid: string, labelUuid: string) =>
    unwrap(
      axiosClient.delete<ProjectApiResponse<null>>(
        `/board/${boardUuid}/labels/${labelUuid}`,
      ),
    ),
};
