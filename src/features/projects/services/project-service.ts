import { axiosClient } from "@/lib/axios";
import type {
  ProjectApiResponse,
  ProjectArchiveFilter,
  ProjectInput,
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
