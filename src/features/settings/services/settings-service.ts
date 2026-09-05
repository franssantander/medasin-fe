import { axiosClient } from "@/lib/axios";
import type { ApiResponse } from "@/features/areas/type";
import type { TrashFilters, TrashPage } from "../types";

export const settingsService = {
  async trash(filters: TrashFilters, signal?: AbortSignal): Promise<TrashPage> {
    return (
      await axiosClient.get<TrashPage>("/trash", {
        params: filters,
        signal,
      })
    ).data;
  },
  async restoreTrash(uuid: string): Promise<ApiResponse<null>> {
    return (await axiosClient.post<ApiResponse<null>>(`/trash/${uuid}/restore`))
      .data;
  },
  async deleteTrash(uuid: string): Promise<ApiResponse<null>> {
    return (await axiosClient.delete<ApiResponse<null>>(`/trash/${uuid}`)).data;
  },
};
