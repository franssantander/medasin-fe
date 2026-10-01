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

export function useLogoutMutation() {
  const clearSessionQueries = useSessionCleanup();

  return useMutation({
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
