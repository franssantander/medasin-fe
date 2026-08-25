"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCurrentUserQuery } from "../queries/auth-query";

export function useRoleGate() {
  const router = useRouter();
  const { data, isLoading, isError } = useCurrentUserQuery();
  const currentUser = data?.data;

  useEffect(() => {
    if (isError) {
      return;
    }
  }, [isLoading, isError, currentUser, router]);

  return {
    isReady: !isLoading && !isError,
    currentUser,
  };
}
