import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { ApiResponse } from "../type";
import { notificationService } from "./notification-service";
import type { NotificationFilter, NotificationPage } from "./type";

type NotificationList = InfiniteData<ApiResponse<NotificationPage>>;

export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  lists: ["notifications", "list"] as const,
  list: (filter: NotificationFilter) =>
    ["notifications", "list", filter] as const,
};

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: ({ signal }) =>
      notificationService
        .list({ per_page: 1, unread_only: 1 }, signal)
        .then((response) => response.data.total),
    refetchInterval: 60_000,
  });
}

export function useNotifications(
  open: boolean,
  filter: NotificationFilter = "all",
) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: ({ pageParam, signal }) =>
      notificationService.list(
        {
          page: pageParam,
          per_page: 15,
          ...(filter === "unread" ? { unread_only: 1 as const } : {}),
        },
        signal,
      ),
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
    onSuccess: async (response, id) => {
      await client.cancelQueries({ queryKey: notificationKeys.all });
      const cachedLists = client.getQueriesData<NotificationList>({
        queryKey: notificationKeys.lists,
      });
      const alreadyRead = cachedLists.some(([, list]) =>
        list?.pages.some((page) =>
          page.data.data.some((item) => item.id === id && item.read_at),
        ),
      );
      const readAt = response.data.read_at ?? new Date().toISOString();

      for (const [key] of cachedLists) {
        const unreadOnly = key[2] === "unread";
        client.setQueryData<NotificationList>(
          key,
          (list) =>
            list && {
              ...list,
              pages: list.pages.map((page) => ({
                ...page,
                data: {
                  ...page.data,
                  total:
                    unreadOnly && !alreadyRead
                      ? Math.max(0, page.data.total - 1)
                      : page.data.total,
                  data: unreadOnly
                    ? page.data.data.filter((item) => item.id !== id)
                    : page.data.data.map((item) =>
                        item.id === id ? { ...item, read_at: readAt } : item,
                      ),
                },
              })),
            },
        );
      }
      if (!alreadyRead) {
        client.setQueryData<number>(notificationKeys.unreadCount, (count) =>
          count === undefined ? count : Math.max(0, count - 1),
        );
      }
      void client.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
