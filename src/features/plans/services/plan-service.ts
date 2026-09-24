import { axiosClient } from "@/lib/axios";
import type { ApiResponse, CalendarPlan, CalendarRange, PlanInput } from "../type";

export const planService = {
  list(range: CalendarRange, timezone: string, signal?: AbortSignal) {
    return axiosClient
      .get<ApiResponse<CalendarPlan[]>>("/calendar/plans", {
        params: {
          start_date: range.startDate,
          end_date: range.endDate,
          timezone,
        },
        signal,
      })
      .then((response) => response.data);
  },
  upcoming(timezone: string, signal?: AbortSignal) {
    return axiosClient
      .get<ApiResponse<CalendarPlan[]>>("/calendar/plans/upcoming", {
        params: { timezone, limit: 10 },
        signal,
      })
      .then((response) => response.data);
  },
  show(uuid: string, signal?: AbortSignal) {
    return axiosClient
      .get<ApiResponse<CalendarPlan>>(`/calendar/plans/${uuid}`, { signal })
      .then((response) => response.data);
  },
  create(input: PlanInput) {
    return axiosClient
      .post<ApiResponse<CalendarPlan>>("/calendar/plans", input)
      .then((response) => response.data);
  },
  update(uuid: string, input: PlanInput) {
    return axiosClient
      .put<ApiResponse<CalendarPlan>>(`/calendar/plans/${uuid}`, input)
      .then((response) => response.data);
  },
  remove(uuid: string) {
    return axiosClient
      .delete<ApiResponse<null>>(`/calendar/plans/${uuid}`)
      .then((response) => response.data);
  },
};
