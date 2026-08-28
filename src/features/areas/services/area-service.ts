import { axiosClient } from "@/lib/axios";
import type {
  ApiResponse,
  Area,
  AreaInput,
  AreaStatusFilter,
  GoalFilter,
  Goal,
  GoalInput,
  GoalTrackerData,
  Habit,
  HabitHistory,
  HabitInput,
  Note,
  NoteInput,
  Paginated,
  Project,
  Resource,
} from "../type";

const unwrap = <T>(request: Promise<{ data: ApiResponse<T> }>) =>
  request.then((response) => response.data);

const areaFormData = (input: AreaInput, method?: "PUT") => {
  const data = new FormData();
  if (method) data.append("_method", method);
  data.append("name", input.name);
  data.append("description", input.description ?? "");
  if (input.icon) data.append("icon", input.icon);
  if (input.background) data.append("background", input.background);
  if (input.background_image) data.append("background_image", input.background_image);
  return data;
};

export const areaService = {
  list(status: AreaStatusFilter = "active") {
    return unwrap(axiosClient.get<ApiResponse<Area[]>>("/area", { params: { status } }));
  },
  show(areaUuid: string) {
    return unwrap(axiosClient.get<ApiResponse<Area>>(`/area/${areaUuid}`));
  },
  create(input: AreaInput) {
    return unwrap(axiosClient.post<ApiResponse<Area>>("/area", areaFormData(input)));
  },
  update(areaUuid: string, input: AreaInput) {
    return unwrap(axiosClient.post<ApiResponse<Area>>(`/area/${areaUuid}`, areaFormData(input, "PUT")));
  },
  remove(areaUuid: string) {
    return unwrap(axiosClient.delete<ApiResponse<null>>(`/area/${areaUuid}`));
  },
  archive(areaUuid: string) {
    return unwrap(axiosClient.post<ApiResponse<Area>>(`/area/${areaUuid}/archive`));
  },
  restore(areaUuid: string) {
    return unwrap(axiosClient.post<ApiResponse<Area>>(`/area/${areaUuid}/restore`));
  },
  goals(areaUuid: string, page = 1, filter: GoalFilter = "all") {
    return unwrap(axiosClient.get<ApiResponse<GoalTrackerData>>(`/area/${areaUuid}/goals`, { params: { page, filter } }));
  },
  createGoal(areaUuid: string, input: GoalInput) {
    return unwrap(axiosClient.post<ApiResponse<Goal>>(`/area/${areaUuid}/goals`, input));
  },
  updateGoal(areaUuid: string, goalUuid: string, input: Partial<GoalInput>) {
    return unwrap(axiosClient.put<ApiResponse<Goal>>(`/area/${areaUuid}/goals/${goalUuid}`, input));
  },
  removeGoal(areaUuid: string, goalUuid: string) {
    return unwrap(axiosClient.delete<ApiResponse<null>>(`/area/${areaUuid}/goals/${goalUuid}`));
  },
  habits(areaUuid: string, page = 1) {
    return unwrap(axiosClient.get<ApiResponse<Paginated<Habit>>>(`/area/${areaUuid}/habits`, { params: { page } }));
  },
  createHabit(areaUuid: string, input: HabitInput) {
    return unwrap(axiosClient.post<ApiResponse<Habit>>(`/area/${areaUuid}/habits`, input));
  },
  updateHabit(areaUuid: string, habitUuid: string, input: HabitInput) {
    return unwrap(axiosClient.put<ApiResponse<Habit>>(`/area/${areaUuid}/habits/${habitUuid}`, input));
  },
  removeHabit(areaUuid: string, habitUuid: string) {
    return unwrap(axiosClient.delete<ApiResponse<null>>(`/area/${areaUuid}/habits/${habitUuid}`));
  },
  habitHistory(areaUuid: string, habitUuid: string, startDate: string, endDate: string, timezone = "UTC") {
    return unwrap(axiosClient.get<ApiResponse<HabitHistory>>(`/area/${areaUuid}/habits/${habitUuid}/history`, { params: { start_date: startDate, end_date: endDate, timezone } }));
  },
  checkInHabit(areaUuid: string, habitUuid: string, date: string, completed: boolean, timezone = "UTC") {
    return unwrap(axiosClient.put<ApiResponse<HabitHistory>>(`/area/${areaUuid}/habits/${habitUuid}/check-ins/${date}`, { completed, timezone }));
  },
  notes(areaUuid: string, page = 1) {
    return unwrap(axiosClient.get<ApiResponse<Paginated<Note>>>(`/area/${areaUuid}/notes`, { params: { page } }));
  },
  createNote(areaUuid: string, input: NoteInput) {
    return unwrap(axiosClient.post<ApiResponse<Note>>(`/area/${areaUuid}/notes`, input));
  },
  updateNote(areaUuid: string, noteUuid: string, input: NoteInput) {
    return unwrap(axiosClient.put<ApiResponse<Note>>(`/area/${areaUuid}/notes/${noteUuid}`, input));
  },
  removeNote(areaUuid: string, noteUuid: string) {
    return unwrap(axiosClient.delete<ApiResponse<null>>(`/area/${areaUuid}/notes/${noteUuid}`));
  },
  projects(areaUuid: string, page = 1) {
    return unwrap(axiosClient.get<ApiResponse<Paginated<Project>>>(`/area/${areaUuid}/projects`, { params: { page } }));
  },
  allProjects() {
    return unwrap(axiosClient.get<ApiResponse<Project[]>>("/project"));
  },
  linkProject(areaUuid: string, projectUuid: string) {
    return unwrap(axiosClient.post<ApiResponse<Project>>(`/area/${areaUuid}/projects`, { project_uuid: projectUuid }));
  },
  detachProject(areaUuid: string, projectUuid: string) {
    return unwrap(axiosClient.delete<ApiResponse<null>>(`/area/${areaUuid}/projects/${projectUuid}`));
  },
  resources(areaUuid: string, page = 1) {
    return unwrap(axiosClient.get<ApiResponse<Paginated<Resource>>>(`/area/${areaUuid}/resources`, { params: { page } }));
  },
  allResources() {
    return unwrap(axiosClient.get<ApiResponse<Resource[]>>("/resource"));
  },
  linkResource(areaUuid: string, resourceUuid: string) {
    return unwrap(axiosClient.post<ApiResponse<Resource>>(`/area/${areaUuid}/resources`, { resource_uuid: resourceUuid }));
  },
  detachResource(areaUuid: string, resourceUuid: string) {
    return unwrap(axiosClient.delete<ApiResponse<null>>(`/area/${areaUuid}/resources/${resourceUuid}`));
  },
};
