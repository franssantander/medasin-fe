"use client";

import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { currentUserKey, useCurrentUserQuery } from "@/features/auth/queries/auth-query";
import type { CurrentUserResponse } from "@/features/auth/type";
import { settingsService } from "../services/settings-service";
import { resolveFontFamily } from "../font-families";
import type { AppFontFamily } from "../types";

export function useFontPreference() {
  const client = useQueryClient();
  const { data } = useCurrentUserQuery();
  const userId = data?.data.id;
  const mutationKey = ["settings", "font", userId] as const;
  const pendingCount = useIsMutating({ mutationKey, exact: true });

  const updateFont = (font: AppFontFamily, expectedUserId: number | undefined) => {
    client.setQueryData<CurrentUserResponse>(currentUserKey, (profile) => {
      if (!profile || profile.data.id !== expectedUserId) return profile;
      return { ...profile, data: { ...profile.data, font_family: font } };
    });
  };

  const mutation = useMutation({
    mutationKey,
    mutationFn: (font: AppFontFamily) => {
      const profile = client.getQueryData<CurrentUserResponse>(currentUserKey);
      if (userId === undefined || profile?.data.id !== userId) {
        throw new Error("Your account changed. Please reload and try again.");
      }
      return settingsService.updatePreferences({ font_family: font });
    },
    onMutate: async (font) => {
      await client.cancelQueries({ queryKey: currentUserKey });
      const profile = client.getQueryData<CurrentUserResponse>(currentUserKey);
      const previousFont = resolveFontFamily(profile?.data.font_family);
      updateFont(font, userId);
      return { previousFont, userId };
    },
    onError: (_error, _font, context) => {
      if (context) updateFont(context.previousFont, context.userId);
    },
    onSuccess: (response, _font, context) => {
      updateFont(resolveFontFamily(response.data.font_family), context?.userId);
    },
    onSettled: (_response, _error, _font, context) => {
      const profile = client.getQueryData<CurrentUserResponse>(currentUserKey);
      if (profile && profile.data.id === context?.userId) {
        return client.invalidateQueries({ queryKey: currentUserKey });
      }
    },
  });

  return {
    fontFamily: resolveFontFamily(data?.data.font_family),
    isPending: pendingCount > 0,
    isSaved: mutation.isSuccess,
    error: mutation.error,
    selectFont: (font: AppFontFamily) => {
      if (userId !== undefined && pendingCount === 0 && font !== resolveFontFamily(data?.data.font_family)) {
        mutation.mutate(font);
      }
    },
  };
}
