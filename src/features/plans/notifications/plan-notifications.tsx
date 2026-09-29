"use client";

import { Bell, BellRing, CalendarDays, Check, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useMarkNotificationRead, useNotifications, useUnreadCount } from "./notification-query";
import { notificationService } from "./notification-service";
import type { PlanNotification } from "./type";
import { usePlanReminderEvents } from "./use-plan-reminder-events";

function notificationWhen(item: PlanNotification) {
  if (!item.data.date) return null;
  const date = new Date(`${item.data.date}T12:00:00`);
  const label = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  return `${label}${item.data.time ? ` at ${item.data.time}` : " · All day"}${item.data.timezone ? ` (${item.data.timezone})` : ""}`;
}

export function PlanNotifications({ userId }: { userId?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unreadQuery = useUnreadCount();
  const listQuery = useNotifications(open);
  const markRead = useMarkNotificationRead();
  const count = unreadQuery.data ?? 0;
  const items = listQuery.data?.pages.flatMap((page) => page.data.data) ?? [];

  const openPlan = async (item: PlanNotification) => {
    const planUuid = item.data.plan_uuid;
    if (!planUuid) return;
    if (!item.read_at) {
      try {
        await markRead.mutateAsync(item.id);
      } catch {
        // The plan link remains useful if marking the notice read fails.
      }
    }
    setOpen(false);
    router.push(`/plans?plan=${encodeURIComponent(planUuid)}`);
  };

  const showReminderToast = async (notificationId: string) => {
    let item: PlanNotification | undefined;
    try {
      const response = await notificationService.list({ per_page: 50 });
      item = response.data.data.find((notice) => notice.id === notificationId);
    } catch {
      // The notification sheet can still load the reminder on demand.
    }

    const reminder = item;
    const toastId = toast.add({
      type: "info",
      title: "Plan reminder",
      description: reminder?.data.title || "You have a new plan reminder.",
      timeout: 5000,
      actionProps: {
        children: reminder?.data.plan_uuid ? "View plan" : "Open notifications",
        onClick: () => {
          toast.close(toastId);
          if (reminder?.data.plan_uuid) {
            void openPlan(reminder);
          } else {
            setOpen(true);
          }
        },
      },
    });
  };

  usePlanReminderEvents(userId, (id) => { void showReminderToast(id); });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="icon-sm" variant="outline" aria-label={count ? `Notifications, ${count} unread` : "Notifications"} />}>
        <span className="relative">
          <Bell />
          {count > 0 && <span className="absolute -right-2 -top-2 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
        </span>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b p-5 pr-14">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>{count ? `${count} unread notification${count === 1 ? "" : "s"}` : "Your reminders will appear here."}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listQuery.isLoading ? (
            <div className="grid gap-3 p-5">
              {[0, 1, 2].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}
            </div>
          ) : listQuery.isError ? (
            <div className="grid justify-items-start gap-3 p-5">
              <p className="text-sm text-destructive">Notifications could not be loaded.</p>
              <Button size="sm" variant="outline" onClick={() => void listQuery.refetch()}><RefreshCw /> Try again</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="grid justify-items-center gap-2 px-6 py-16 text-center">
              <Bell className="size-7 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">All caught up</p>
              <p className="text-sm text-muted-foreground">Plan reminders will appear here after they are sent.</p>
            </div>
          ) : (
            <div className="grid gap-3 p-5">
              {items.map((item) => {
                const planUuid = item.data.plan_uuid;
                const when = notificationWhen(item);
                const title = item.data.title || "Reminder";
                return (
                  <Card key={item.id} size="sm" className={cn("relative gap-0 py-0 transition-[box-shadow,transform] hover:shadow-sm", !item.read_at && "bg-primary/5 ring-primary/20")}>
                    <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-3 py-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground", !item.read_at && "bg-primary/10 text-primary")} aria-hidden="true">
                          {item.read_at ? <CalendarDays className="size-4" /> : <BellRing className="size-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Plan reminder</p>
                          <CardTitle className="break-words">
                            {planUuid ? (
                              <Link
                                href={`/plans?plan=${encodeURIComponent(planUuid)}`}
                                aria-label={`View plan: ${title}`}
                                className="after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                                onNavigate={(event) => { event.preventDefault(); void openPlan(item); }}
                              >
                                {title}
                              </Link>
                            ) : title}
                          </CardTitle>
                          {when && <CardDescription className="mt-1.5 flex items-start gap-1.5 text-xs"><CalendarDays className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{when}</CardDescription>}
                        </div>
                      </div>
                      <CardAction className="flex items-center gap-2">
                        {!item.read_at && <Badge variant="secondary">New</Badge>}
                        {planUuid && <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
                      </CardAction>
                    </CardHeader>
                    {!item.read_at && (
                      <CardFooter className="relative z-10 justify-end border-t py-1.5">
                        <Button size="sm" variant="ghost" disabled={markRead.isPending} onClick={() => markRead.mutate(item.id)}><Check data-icon="inline-start" /> Mark read</Button>
                      </CardFooter>
                    )}
                  </Card>
                );
              })}
              {listQuery.hasNextPage && (
                <div className="pt-2 text-center">
                  <Button size="sm" variant="outline" disabled={listQuery.isFetchingNextPage} onClick={() => void listQuery.fetchNextPage()}>
                    {listQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
