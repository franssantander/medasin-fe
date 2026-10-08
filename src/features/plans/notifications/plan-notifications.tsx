"use client";

import { Bell, CheckCheck, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast, type PlanReminderToastData } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "./notification-query";
import { notificationService } from "./notification-service";
import { NotificationRow } from "./notification-row";
import { notificationSchedule } from "./notification-time";
import type { NotificationFilter, PlanNotification } from "./type";
import { usePlanReminderEvents } from "./use-plan-reminder-events";

function subscribeViewport(onChange: () => void) {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function desktopSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}
function serverViewport() {
  return false;
}
function subscribeMinute(onChange: () => void) {
  const interval = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(interval);
}
function inactiveSubscription() {
  return () => {};
}
function minuteSnapshot() {
  return Math.floor(Date.now() / 60_000);
}
function serverMinute() {
  return 0;
}

export function PlanNotifications({
  userId,
  toastsEnabled = true,
}: {
  userId?: number;
  toastsEnabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [pendingReadIds, setPendingReadIds] = useState(() => new Set<string>());
  const [failedReadIds, setFailedReadIds] = useState(() => new Set<string>());
  const isDesktop = useSyncExternalStore(
    subscribeViewport,
    desktopSnapshot,
    serverViewport,
  );
  const minute = useSyncExternalStore(
    open ? subscribeMinute : inactiveSubscription,
    minuteSnapshot,
    serverMinute,
  );
  const unreadQuery = useUnreadCount();
  const listQuery = useNotifications(open, filter);
  const markRead = useMarkNotificationRead();
  const count = unreadQuery.data ?? 0;
  const items = Array.from(
    new Map(
      listQuery.data?.pages
        .flatMap((page) => page.data.data)
        .map((item) => [item.id, item]) ?? [],
    ).values(),
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerActionsRef = useRef<{
    close: () => void;
    unmount: () => void;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastListFocusRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const drawerVisibleRef = useRef(false);
  const navigatingRef = useRef(false);
  const toastsEnabledRef = useRef(toastsEnabled);
  const reminderEpochRef = useRef(0);
  const reminderToastsRef = useRef(new Set<string>());
  const pendingReadRef = useRef(new Set<string>());
  const completedReadRef = useRef(new Set<string>());

  useLayoutEffect(() => {
    const previousFocus = lastListFocusRef.current;
    if (
      open &&
      previousFocus &&
      !previousFocus.isConnected &&
      document.activeElement === document.body
    ) {
      scrollRef.current?.focus({ preventScroll: true });
    }
  });

  const dismissReminderToasts = useCallback(() => {
    reminderEpochRef.current += 1;
    for (const id of reminderToastsRef.current) toast.close(id);
    reminderToastsRef.current.clear();
  }, []);

  useEffect(() => {
    toastsEnabledRef.current = toastsEnabled;
    if (!toastsEnabled) {
      dismissReminderToasts();
      drawerActionsRef.current?.close();
    }
  }, [toastsEnabled, dismissReminderToasts]);

  useEffect(
    () => () => {
      toastsEnabledRef.current = false;
      dismissReminderToasts();
    },
    [dismissReminderToasts],
  );

  const changeOpen = (nextOpen: boolean) => {
    openRef.current = nextOpen;
    if (nextOpen) {
      drawerVisibleRef.current = true;
      navigatingRef.current = false;
      dismissReminderToasts();
    }
    setOpen(nextOpen);
  };

  const changeFilter = (nextFilter: NotificationFilter) => {
    setFilter(nextFilter);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const readNotification = async (item: PlanNotification) => {
    if (
      item.read_at ||
      pendingReadRef.current.has(item.id) ||
      completedReadRef.current.has(item.id)
    )
      return;
    pendingReadRef.current.add(item.id);
    setPendingReadIds(new Set(pendingReadRef.current));
    setFailedReadIds((ids) => {
      const next = new Set(ids);
      next.delete(item.id);
      return next;
    });
    try {
      await markRead.mutateAsync(item.id);
      completedReadRef.current.add(item.id);
    } catch {
      setFailedReadIds((ids) => new Set(ids).add(item.id));
      if (!openRef.current)
        toast.add({
          type: "error",
          title: "Couldn’t mark reminder as read",
          description: "Your reminder is still unread. Please try again.",
        });
    } finally {
      pendingReadRef.current.delete(item.id);
      setPendingReadIds(new Set(pendingReadRef.current));
    }
  };

  const openPlan = (item: PlanNotification) => {
    if (!item.data.plan_uuid) return;
    void readNotification(item);
    navigatingRef.current = true;
    changeOpen(false);
    router.push(`/plans?plan=${encodeURIComponent(item.data.plan_uuid)}`);
  };

  const showReminderToast = async (notificationId: string) => {
    if (!toastsEnabledRef.current || drawerVisibleRef.current) return;
    const epoch = reminderEpochRef.current;
    let reminder: PlanNotification | undefined;
    try {
      const response = await notificationService.list({ per_page: 50 });
      reminder = response.data.data.find(
        (notice) => notice.id === notificationId,
      );
    } catch {
      // The inbox remains the source of truth when reminder details are unavailable.
    }
    if (
      !toastsEnabledRef.current ||
      drawerVisibleRef.current ||
      epoch !== reminderEpochRef.current
    )
      return;

    const item = reminder;
    const toastId = toast.add({
      type: "info",
      title: "Plan reminder",
      description: item?.data.title || "You have a new plan reminder.",
      data: {
        variant: "plan-reminder",
        schedule: item ? notificationSchedule(item) : undefined,
      } satisfies PlanReminderToastData,
      timeout: 5000,
      actionProps: {
        children: item?.data.plan_uuid ? "View plan" : "Open notifications",
        onClick: () => {
          toast.close(toastId);
          if (item?.data.plan_uuid) openPlan(item);
          else {
            changeFilter("all");
            changeOpen(true);
          }
        },
      },
      onClose: () => {
        reminderToastsRef.current.delete(toastId);
      },
    });
    reminderToastsRef.current.add(toastId);
  };

  usePlanReminderEvents(userId, (id) => {
    void showReminderToast(id);
  });

  const initialError = listQuery.isError && !listQuery.data;
  const empty = listQuery.data && items.length === 0 && !listQuery.hasNextPage;

  return (
    <Drawer
      actionsRef={drawerActionsRef}
      open={open}
      onOpenChange={changeOpen}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen && !openRef.current) drawerVisibleRef.current = false;
      }}
      swipeDirection={isDesktop ? "right" : "down"}
      showSwipeHandle={!isDesktop}
    >
      <DrawerTrigger
        render={
          <Button
            ref={triggerRef}
            size="icon-sm"
            variant="outline"
            className="relative min-h-11 min-w-11 md:min-h-8 md:min-w-8"
            aria-label={
              count ? `Notifications, ${count} unread` : "Notifications"
            }
          />
        }
      >
        <Bell aria-hidden="true" />
        {count > 0 && (
          <Badge
            variant="default"
            className="pointer-events-none absolute -top-1.5 -right-1.5 min-w-5 justify-center px-1.5"
            aria-hidden="true"
          >
            {count > 99 ? "99+" : count}
          </Badge>
        )}
      </DrawerTrigger>
      <DrawerContent
        initialFocus={closeRef}
        finalFocus={() =>
          !navigatingRef.current && toastsEnabledRef.current
            ? triggerRef.current
            : false
        }
        className="max-w-full pb-[env(safe-area-inset-bottom)]"
        style={
          {
            "--drawer-content-height": isDesktop ? "100dvh" : "85dvh",
            "--drawer-content-max-height":
              "calc(100dvh - env(safe-area-inset-top))",
            "--drawer-content-width": isDesktop ? "28rem" : "100%",
          } as CSSProperties
        }
      >
        <DrawerHeader className="p-4 group-data-[swipe-axis=y]/drawer-popup:text-left md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <DrawerTitle>Notifications</DrawerTitle>
              <DrawerDescription>
                {unreadQuery.data === undefined
                  ? unreadQuery.isError
                    ? "Your plan reminders, in one place."
                    : "Checking your reminders…"
                  : count
                    ? `${count} unread notification${count === 1 ? "" : "s"}`
                    : "You’re up to date."}
              </DrawerDescription>
            </div>
            <DrawerClose
              render={
                <Button
                  ref={closeRef}
                  size="icon-sm"
                  variant="ghost"
                  className="-mt-1 -mr-1 min-h-11 min-w-11 md:min-h-8 md:min-w-8"
                  aria-label="Close"
                />
              }
            >
              <X aria-hidden="true" />
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="shrink-0 px-4 pb-4 md:px-5">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[filter]}
            onValueChange={(values) => {
              if (values[0] === "all" || values[0] === "unread")
                changeFilter(values[0]);
            }}
            className="w-full"
            aria-label="Notification view"
          >
            <ToggleGroupItem value="all" className="min-h-11 flex-1 md:min-h-8">
              All
            </ToggleGroupItem>
            <ToggleGroupItem
              value="unread"
              className="min-h-11 flex-1 md:min-h-8"
              aria-label="Unread"
            >
              Unread{" "}
              {count > 0 && (
                <Badge variant="secondary" aria-hidden="true">
                  {count > 99 ? "99+" : count}
                </Badge>
              )}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Separator />
        <div
          ref={scrollRef}
          role="region"
          aria-label="Notification list"
          tabIndex={0}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:p-4"
          aria-busy={listQuery.isFetching}
          onFocusCapture={(event) => {
            lastListFocusRef.current = event.target;
          }}
        >
          {listQuery.isPending ? (
            <div
              role="status"
              aria-label="Loading notifications"
              className="flex flex-col gap-3"
            >
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : initialError ? (
            <Alert variant="destructive">
              <AlertTitle>Notifications could not be loaded</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                Check your connection and try again.
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 md:min-h-8"
                  onClick={() => void listQuery.refetch()}
                >
                  <RefreshCw data-icon="inline-start" /> Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {listQuery.isRefetchError && (
                <Alert>
                  <AlertTitle>Couldn’t refresh notifications</AlertTitle>
                  <AlertDescription className="flex flex-col items-start gap-2">
                    Your loaded reminders are still available.
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11 md:min-h-8"
                      disabled={listQuery.isFetching}
                      onClick={() => void listQuery.refetch()}
                    >
                      <RefreshCw data-icon="inline-start" /> Try again
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {empty ? (
                <Empty className="px-4 py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      {filter === "unread" ? (
                        <CheckCheck aria-hidden="true" />
                      ) : (
                        <Bell aria-hidden="true" />
                      )}
                    </EmptyMedia>
                    <EmptyTitle>
                      {filter === "unread"
                        ? "All caught up"
                        : "No notifications yet"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {filter === "unread"
                        ? "You’ve read all your reminders."
                        : "Plan reminders will appear here when they’re delivered."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {filter === "unread" && (
                    <EmptyContent>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-11 md:min-h-8"
                        onClick={() => changeFilter("all")}
                      >
                        View all notifications
                      </Button>
                    </EmptyContent>
                  )}
                </Empty>
              ) : (
                <ItemGroup aria-label="Plan reminders">
                  {items.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      now={minute * 60_000}
                      pending={pendingReadIds.has(item.id)}
                      error={failedReadIds.has(item.id)}
                      onRead={(notice) => {
                        void readNotification(notice);
                      }}
                      onOpenPlan={openPlan}
                    />
                  ))}
                </ItemGroup>
              )}
              {listQuery.hasNextPage && (
                <div className="flex flex-col items-center gap-3 py-3">
                  {listQuery.isFetchNextPageError && (
                    <Alert>
                      <AlertTitle>Couldn’t load more reminders</AlertTitle>
                      <AlertDescription>
                        Your loaded reminders are still available. Try loading
                        the next page again.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11 md:min-h-8"
                    disabled={listQuery.isFetching}
                    onClick={() => {
                      if (!listQuery.isFetching) void listQuery.fetchNextPage();
                    }}
                  >
                    {listQuery.isFetchingNextPage && (
                      <LoaderCircle
                        data-icon="inline-start"
                        className="animate-spin motion-reduce:animate-none"
                      />
                    )}
                    {listQuery.isFetchingNextPage
                      ? "Loading…"
                      : listQuery.isFetchNextPageError
                        ? "Retry loading more"
                        : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
