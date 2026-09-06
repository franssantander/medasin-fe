import { axiosClient } from "@/lib/axios";
import type {
  FocusApiResponse,
  FocusDashboard,
  FocusMood,
  FocusSession,
  FocusSessionType,
  FocusSettings,
  FocusTask,
  LinkableFocusTask,
} from "../type";

const unwrap = <T>(request: Promise<{ data: FocusApiResponse<T> }>) => request.then((response) => response.data);

export const focusService = {
  dashboard: (timezone: string) => unwrap(axiosClient.get<FocusApiResponse<FocusDashboard>>("/focus", { params: { timezone } })),
  tasks: (status: "active" | "completed" | "all") => unwrap(axiosClient.get<FocusApiResponse<FocusTask[]>>("/focus/tasks", { params: { status } })),
  linkableTasks: (search: string) => unwrap(axiosClient.get<FocusApiResponse<LinkableFocusTask[]>>("/focus/linkable-tasks", { params: { search } })),
  createTask: (input: { title?: string; board_task_uuid?: string }) => unwrap(axiosClient.post<FocusApiResponse<FocusTask>>("/focus/tasks", input)),
  updateTask: (uuid: string, input: { title?: string; completed?: boolean }) => unwrap(axiosClient.patch<FocusApiResponse<FocusTask>>(`/focus/tasks/${uuid}`, input)),
  deleteTask: (uuid: string) => unwrap(axiosClient.delete<FocusApiResponse<null>>(`/focus/tasks/${uuid}`)),
  updateSettings: (input: FocusSettings) => unwrap(axiosClient.put<FocusApiResponse<FocusSettings>>("/focus/settings", input)),
  startSession: (type: FocusSessionType, focusTaskUuid?: string) => unwrap(axiosClient.post<FocusApiResponse<FocusSession>>("/focus/sessions", { type, focus_task_uuid: focusTaskUuid })),
  sessionAction: (uuid: string, action: "pause" | "resume" | "complete" | "cancel") => unwrap(axiosClient.post<FocusApiResponse<FocusSession>>(`/focus/sessions/${uuid}/${action}`)),
  reflect: (uuid: string, mood: FocusMood | null, note: string | null) => unwrap(axiosClient.put<FocusApiResponse<FocusSession>>(`/focus/sessions/${uuid}/reflection`, { mood, note })),
};
