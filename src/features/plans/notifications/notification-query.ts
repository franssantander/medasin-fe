import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { notificationService } from "./notification-service";

export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  list: ["notifications", "list"] as const,
};

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: ({ signal }) =>
      notificationService.list({ per_page: 1, unread_only: 1 }, signal)
        .then((response) => response.data.total),
    refetchInterval: 60_000,
  });
}

export function useNotifications(open: boolean) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam, signal }) =>
      notificationService.list({ page: pageParam, per_page: 15 }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.data.current_page < lastPage.data.last_page
        ? lastPage.data.current_page + 1
        : undefined,
    enabled: open,
    refetchOnMount: "always",
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
}
