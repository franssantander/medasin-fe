import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/auth-service";

export const currentUserKey = ["current-user"] as const;

function useSessionCleanup() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.cancelQueries();
    queryClient.removeQueries();
  };
}

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: ({ signal }) => authService.getCurrentUser(signal),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoginMutation() {
  const clearSessionQueries = useSessionCleanup();

  return useMutation({
    mutationFn: authService.login,
    gcTime: 0,
    onSuccess: clearSessionQueries,
  });
}

export function useCompleteGoogleLoginMutation() {
  const queryClient = useQueryClient();
  const clearSessionQueries = useSessionCleanup();

  return useMutation({
    mutationFn: async () => {
      const response = await authService.getCurrentUser();
      if (!response.data || !Number.isInteger(response.data.id) || response.data.id <= 0) {
        throw new Error("Google sign-in did not return an authenticated user.");
      }
      return response;
    },
    gcTime: 0,
    onSuccess: async (response) => {
      await clearSessionQueries();
      queryClient.setQueryData(currentUserKey, response);
    },
  });
}

export function useLogoutMutation() {
  const clearSessionQueries = useSessionCleanup();

  return useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: authService.logout,
    onSuccess: clearSessionQueries,
  });
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: authService.register, gcTime: 0 });
}

export function useVerifyEmailMutation() {
  const clearSessionQueries = useSessionCleanup();
  return useMutation({ mutationFn: authService.verifyEmail, gcTime: 0, onSuccess: clearSessionQueries });
}

export function useResendVerificationMutation() {
  return useMutation({ mutationFn: authService.resendVerification, gcTime: 0 });
}

export function useForgotPasswordMutation() {
  return useMutation({ mutationFn: authService.forgotPassword, gcTime: 0 });
}

export function useVerifyPasswordResetMutation() {
  return useMutation({ mutationFn: authService.verifyPasswordReset, gcTime: 0 });
}

export function useResetPasswordMutation() {
  const clearSessionQueries = useSessionCleanup();
  return useMutation({ mutationFn: authService.resetPassword, gcTime: 0, onSuccess: clearSessionQueries });
}
