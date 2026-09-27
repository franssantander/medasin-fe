import { axiosClient } from "@/lib/axios";
import type { DashboardApiResponse } from "../type";

export const dashboardService = {
  show(timezone: string, signal?: AbortSignal) {
    return axiosClient
      .get<DashboardApiResponse>("/dashboard", {
        params: { timezone },
        signal,
      })
      .then((response) => response.data);
  },
};
