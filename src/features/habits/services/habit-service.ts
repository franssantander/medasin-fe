import { axiosClient } from "@/lib/axios";
import type {
  ApiResponse,
  Habit,
  HabitCalendarData,
  HabitInput,
} from "../type";

export const habitService = {
  list(signal?: AbortSignal) {
    return axiosClient
      .get<ApiResponse<Habit[]>>("/habits", { signal })
      .then((response) => response.data);
  },
  calendar(
    startDate: string,
    endDate: string,
    timezone: string,
    signal?: AbortSignal,
  ) {
    return axiosClient
      .get<ApiResponse<HabitCalendarData>>("/habits/calendar", {
        params: { start_date: startDate, end_date: endDate, timezone },
        signal,
      })
      .then((response) => response.data);
  },
  create(input: HabitInput) {
    return axiosClient
      .post<ApiResponse<Habit>>("/habits", input)
      .then((response) => response.data);
  },
  update(habitUuid: string, input: Partial<HabitInput>) {
    return axiosClient
      .patch<ApiResponse<Habit>>(`/habits/${habitUuid}`, input)
      .then((response) => response.data);
  },
  remove(habitUuid: string) {
    return axiosClient
      .delete<ApiResponse<null>>(`/habits/${habitUuid}`)
      .then((response) => response.data);
  },
  checkIn(
    habitUuid: string,
    date: string,
    completed: boolean,
    timezone: string,
  ) {
    return axiosClient
      .put<
        ApiResponse<HabitCheckIn>
      >(`/habits/${habitUuid}/check-ins/${date}`, { completed, timezone })
      .then((response) => response.data);
  },
};

type HabitCheckIn = { date: string; completed: boolean };
