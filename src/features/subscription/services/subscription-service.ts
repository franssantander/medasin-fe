import type { ApiResponse } from "@/features/areas/type";
import { ApiError, axiosClient } from "@/lib/axios";
import { subscriptionSchema, type Subscription } from "../types";

export const subscriptionService = {
  async show(signal?: AbortSignal): Promise<ApiResponse<Subscription>> {
    const response = await axiosClient.get<ApiResponse<unknown>>("/subscription", {
      signal,
    });
    const parsed = subscriptionSchema.safeParse(response.data?.data);

    if (!parsed.success) {
      throw new ApiError(
        "The server returned incomplete plan information. Please try again.",
        502,
      );
    }

    return { ...response.data, data: parsed.data };
  },
};
