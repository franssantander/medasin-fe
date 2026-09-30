import { axiosClient } from "@/lib/axios";
import type { ApiResponse } from "@/features/areas/type";
import type { TrashFilters, TrashPage, UserPreferences } from "../types";

export const settingsService = {
  async updatePreferences(preferences: UserPreferences): Promise<ApiResponse<UserPreferences>> {
    return (
      await axiosClient.patch<ApiResponse<UserPreferences>>("/settings/preferences", preferences)
    ).data;
  },
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
