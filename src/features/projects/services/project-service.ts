import { axiosClient } from "@/lib/axios";
import type {
  ProjectApiResponse,
  ProjectArchiveFilter,
  Board,
  BoardLabel,
  BoardLabelColor,
  BoardTask,
  BoardTaskInput,
  BoardStageKey,
  ProjectInput,
  ProjectDetail,
  ProjectListCard,
} from "../type";

const unwrap = <T>(request: Promise<{ data: ProjectApiResponse<T> }>) =>
  request.then((response) => response.data);

export const projectService = {
  list(status: ProjectArchiveFilter = "active") {
    return unwrap(
      axiosClient.get<ProjectApiResponse<ProjectListCard[]>>("/project", {
        params: { status },
      }),
    );
  },
  show(projectUuid: string) {
    return unwrap(
      axiosClient.get<ProjectApiResponse<ProjectDetail>>(
        `/project/${projectUuid}`,
      ),
    );
  },
  board(projectUuid: string, boardUuid: string) {
    return unwrap(
      axiosClient.get<ProjectApiResponse<Board>>(
        `/project/${projectUuid}/boards/${boardUuid}`,
      ),
    );
  },
  createBoard(projectUuid: string, name?: string) {
    return unwrap(
      axiosClient.post<ProjectApiResponse<Board>>(
        `/project/${projectUuid}/boards`,
        name ? { name } : {},
      ),
    );
  },
  updateBoard(projectUuid: string, boardUuid: string, name: string) {
    return unwrap(
      axiosClient.put<ProjectApiResponse<Board>>(
        `/project/${projectUuid}/boards/${boardUuid}`,
        { name },
      ),
    );
  },
  removeBoard(projectUuid: string, boardUuid: string) {
    return unwrap(
      axiosClient.delete<ProjectApiResponse<null>>(
        `/project/${projectUuid}/boards/${boardUuid}`,
      ),
    );
  },
  createTask(projectUuid: string, boardUuid: string, input: BoardTaskInput) {
    return unwrap(
      axiosClient.post<ProjectApiResponse<BoardTask>>(
        `/project/${projectUuid}/boards/${boardUuid}/tasks`,
        input,
      ),
    );
  },
  updateTask(
    projectUuid: string,
    boardUuid: string,
    taskUuid: string,
    input: BoardTaskInput,
  ) {
    return unwrap(
      axiosClient.put<ProjectApiResponse<BoardTask>>(
        `/project/${projectUuid}/boards/${boardUuid}/tasks/${taskUuid}`,
        input,
      ),
    );
  },
  removeTask(projectUuid: string, boardUuid: string, taskUuid: string) {
    return unwrap(
      axiosClient.delete<ProjectApiResponse<null>>(
        `/project/${projectUuid}/boards/${boardUuid}/tasks/${taskUuid}`,
      ),
    );
  },
  moveTask(
    projectUuid: string,
    boardUuid: string,
    taskUuid: string,
    stage: BoardStageKey,
    position: number,
  ) {
    return unwrap(
      axiosClient.patch<ProjectApiResponse<BoardTask>>(
        `/project/${projectUuid}/boards/${boardUuid}/tasks/${taskUuid}/move`,
        { stage, position },
      ),
    );
  },
  createLabel(
    projectUuid: string,
    boardUuid: string,
    input: { name: string; color: BoardLabelColor },
  ) {
    return unwrap(
      axiosClient.post<ProjectApiResponse<BoardLabel>>(
        `/project/${projectUuid}/boards/${boardUuid}/labels`,
        input,
      ),
    );
  },
  updateLabel(
    projectUuid: string,
    boardUuid: string,
    labelUuid: string,
    input: { name: string; color: BoardLabelColor },
  ) {
    return unwrap(
      axiosClient.put<ProjectApiResponse<BoardLabel>>(
        `/project/${projectUuid}/boards/${boardUuid}/labels/${labelUuid}`,
        input,
      ),
    );
  },
  removeLabel(projectUuid: string, boardUuid: string, labelUuid: string) {
    return unwrap(
      axiosClient.delete<ProjectApiResponse<null>>(
        `/project/${projectUuid}/boards/${boardUuid}/labels/${labelUuid}`,
      ),
    );
  },
  create(input: ProjectInput) {
    return unwrap(
      axiosClient.post<ProjectApiResponse<unknown>>("/project", input),
    );
  },
  update(projectUuid: string, input: ProjectInput) {
    const project = { ...input };
    delete project.area_uuid;
    delete project.area_name;
    return unwrap(
      axiosClient.put<ProjectApiResponse<unknown>>(
        `/project/${projectUuid}`,
        project,
      ),
    );
  },
  updateArea(
    projectUuid: string,
    input: Pick<ProjectInput, "area_uuid" | "area_name">,
  ) {
    return unwrap(
      axiosClient.patch<ProjectApiResponse<ProjectListCard>>(
        `/project/${projectUuid}/area`,
        input,
      ),
    );
  },
  remove(projectUuid: string) {
    return unwrap(
      axiosClient.delete<ProjectApiResponse<null>>(`/project/${projectUuid}`),
    );
  },
  archive(projectUuid: string) {
    return unwrap(
      axiosClient.post<ProjectApiResponse<unknown>>(
        `/project/${projectUuid}/archive`,
      ),
    );
  },
  restore(projectUuid: string) {
    return unwrap(
      axiosClient.post<ProjectApiResponse<unknown>>(
        `/project/${projectUuid}/restore`,
      ),
    );
  },
};
