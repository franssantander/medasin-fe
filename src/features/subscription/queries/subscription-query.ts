"use client";

import { useQuery } from "@tanstack/react-query";
import { useCurrentUserQuery } from "@/features/auth/queries/auth-query";
import { subscriptionService } from "../services/subscription-service";

export const subscriptionKeys = {
  all: ["subscription"] as const,
  account: (userId: number | null) => [...subscriptionKeys.all, userId] as const,
};

export function useSubscriptionQuery() {
  const currentUser = useCurrentUserQuery();
  const id = currentUser.data?.data.id;
  const userId = typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null;

  return useQuery({
    queryKey: subscriptionKeys.account(userId),
    queryFn: ({ signal }) => subscriptionService.show(signal),
    enabled: userId !== null && !currentUser.isError,
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
}
