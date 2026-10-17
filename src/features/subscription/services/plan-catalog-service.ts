import type { ApiResponse } from "@/features/areas/type";
import { ApiError, axiosClient } from "@/lib/axios";
import { planCatalogSchema, type CatalogPlan } from "../types";

export const planCatalogService = {
  async index(signal?: AbortSignal): Promise<ApiResponse<CatalogPlan[]>> {
    const response = await axiosClient.get<ApiResponse<unknown>>("/plan", { signal });
    const parsed = planCatalogSchema.safeParse(response.data?.data);

    if (!parsed.success) {
      throw new ApiError("The server returned incomplete plan pricing. Please try again.", 502);
    }

    return { ...response.data, data: parsed.data };
  },
};
