import { axiosClient } from "@/lib/axios";
import type { HomeApiResponse } from "../type";

export const homeService = {
  show(timezone: string, signal?: AbortSignal) {
    return axiosClient
      .get<HomeApiResponse>("/home", {
        params: { timezone },
        signal,
      })
      .then((response) => response.data);
  },
};
