import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/auth-service";

export const currentUserKey = ["current-user"] as const;

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: ({ signal }) => authService.getCurrentUser(signal),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: currentUserKey });
      queryClient.removeQueries({ queryKey: currentUserKey });
      queryClient.removeQueries({ queryKey: ["home"] });
      queryClient.removeQueries({ queryKey: ["resources"] });
      queryClient.removeQueries({ queryKey: ["calendar-plans"] });
      queryClient.removeQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: currentUserKey });
      queryClient.removeQueries({ queryKey: currentUserKey });
      queryClient.removeQueries({ queryKey: ["home"] });
      queryClient.removeQueries({ queryKey: ["resources"] });
      queryClient.removeQueries({ queryKey: ["calendar-plans"] });
      queryClient.removeQueries({ queryKey: ["notifications"] });
    },
  });
}
