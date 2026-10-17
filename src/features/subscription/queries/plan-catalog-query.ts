"use client";

import { useQuery } from "@tanstack/react-query";
import { planCatalogService } from "../services/plan-catalog-service";

export const planCatalogKeys = {
  all: ["plan-catalog"] as const,
};

/** The public plan catalog; available to guests, so not keyed by account. */
export function usePlanCatalogQuery() {
  return useQuery({
    queryKey: planCatalogKeys.all,
    queryFn: ({ signal }) => planCatalogService.index(signal),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
