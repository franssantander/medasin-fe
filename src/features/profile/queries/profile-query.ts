"use client";

import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui/toast";
import { currentUserKey } from "@/features/auth/queries/auth-query";
import type { CurrentUserResponse } from "@/features/auth/type";
import { setRememberedUsername } from "@/features/auth/utils/remembered-username";
import { profileService } from "../services/profile-service";
import type { ChangePasswordRequest, DeleteAccountRequest } from "../types";

export const profileMutationKeys = {
  user: (userId: number | undefined) => ["profile", userId] as const,
  image: (userId: number) => ["profile", userId, "image"] as const,
  password: (userId: number) => ["profile", userId, "password"] as const,
  delete: (userId: number) => ["profile", userId, "delete"] as const,
};

export function useProfileBusy(userId: number) {
  const pendingProfile = useIsMutating({ mutationKey: profileMutationKeys.user(userId) });
  const pendingLogout = useIsMutating({ mutationKey: ["auth", "logout"] });
  return pendingProfile > 0 || pendingLogout > 0;
}

export function useProfileAccountPending(userId?: number) {
  return useIsMutating({
    mutationKey: profileMutationKeys.user(userId),
    predicate: (mutation) => mutation.options.mutationKey?.[2] !== "image",
  }) > 0;
}

function useAccountGuard(userId: number) {
  const client = useQueryClient();
  const isCurrentAccount = () => client.getQueryData<CurrentUserResponse>(currentUserKey)?.data.id === userId;
  const assertCurrentAccount = () => {
    if (!isCurrentAccount()) throw new Error("Your account changed. Reload the page and try again.");
  };
  return { client, isCurrentAccount, assertCurrentAccount };
}

export function useProfileImageMutation(userId: number) {
  const { client, isCurrentAccount, assertCurrentAccount } = useAccountGuard(userId);
  return useMutation({
    mutationKey: profileMutationKeys.image(userId),
    gcTime: 0,
    mutationFn: (image: File | null) => {
      assertCurrentAccount();
      return image ? profileService.uploadImage(image) : profileService.removeImage();
    },
    onSuccess: async (response) => {
      if (!isCurrentAccount() || response.data.id !== userId) return;
      await client.cancelQueries({ queryKey: currentUserKey });
      client.setQueryData<CurrentUserResponse>(currentUserKey, (current) => {
        if (!current || current.data.id !== userId) return current;
        return {
          ...current,
          data: { ...current.data, profile_image_url: response.data.profile_image_url ?? null },
        };
      });
      if (isCurrentAccount()) await client.invalidateQueries({ queryKey: currentUserKey });
    },
  });
}

export function useChangePasswordMutation(userId: number) {
  const { client, isCurrentAccount, assertCurrentAccount } = useAccountGuard(userId);
  return useMutation({
    mutationKey: profileMutationKeys.password(userId),
    gcTime: 0,
    mutationFn: (data: ChangePasswordRequest) => {
      assertCurrentAccount();
      return profileService.changePassword(data);
    },
    onSuccess: () => {
      if (isCurrentAccount()) return client.invalidateQueries({ queryKey: currentUserKey });
    },
  });
}

export function useDeleteAccountMutation(userId: number) {
  const router = useRouter();
  const { client, isCurrentAccount, assertCurrentAccount } = useAccountGuard(userId);
  return useMutation({
    mutationKey: profileMutationKeys.delete(userId),
    gcTime: 0,
    mutationFn: (data: DeleteAccountRequest) => {
      assertCurrentAccount();
      return profileService.deleteAccount(data);
    },
    onSuccess: async (response) => {
      if (!isCurrentAccount()) return;
      await client.cancelQueries();
      if (!isCurrentAccount()) return;
      client.removeQueries();
      setRememberedUsername(null);
      toast.add({ type: "success", description: response.message || "Your account has been permanently deleted." });
      router.replace("/login");
      router.refresh();
    },
  });
}
