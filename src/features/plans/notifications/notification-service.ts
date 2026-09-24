import { axiosClient } from "@/lib/axios";
import type { ApiResponse } from "../type";
import type { NotificationPage, PlanNotification } from "./type";

export const notificationService = {
  list(
    params: { page?: number; per_page?: number; unread_only?: 1 },
    signal?: AbortSignal,
  ) {
    return axiosClient
      .get<ApiResponse<NotificationPage>>("/notifications", { params, signal })
      .then((response) => response.data);
  },
  markRead(id: string) {
    return axiosClient
      .patch<ApiResponse<PlanNotification>>(`/notifications/${id}/read`)
      .then((response) => response.data);
  },
};
