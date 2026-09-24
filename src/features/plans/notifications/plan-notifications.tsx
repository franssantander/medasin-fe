"use client";

import { Bell, Check, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkNotificationRead, useNotifications, useUnreadCount } from "./notification-query";
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
  usePlanReminderEvents(userId);
  const unreadQuery = useUnreadCount();
  const listQuery = useNotifications(open);
  const markRead = useMarkNotificationRead();
  const count = unreadQuery.data ?? 0;
  const items = listQuery.data?.pages.flatMap((page) => page.data.data) ?? [];

  const openPlan = async (item: PlanNotification) => {
    if (!item.read_at) {
      try {
        await markRead.mutateAsync(item.id);
      } catch {
        // The plan link remains useful if marking the notice read fails.
      }
    }
    setOpen(false);
    router.push(`/plans?plan=${encodeURIComponent(item.data.plan_uuid!)}`);
  };

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
              {[0, 1, 2].map((item) => <Skeleton key={item} className="h-24 rounded-lg" />)}
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
            <div className="divide-y">
              {items.map((item) => {
                const planUuid = item.data.plan_uuid;
                const when = notificationWhen(item);
                return (
                  <div key={item.id} className="grid gap-2 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read_at ? "bg-transparent" : "bg-primary"}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium">{item.data.title || "Reminder"}</p>
                        {when && <p className="mt-1 text-xs text-muted-foreground">{when}</p>}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      {!item.read_at && <Button size="sm" variant="ghost" disabled={markRead.isPending} onClick={() => markRead.mutate(item.id)}><Check /> Mark read</Button>}
                      {planUuid && <Button size="sm" variant="outline" onClick={() => void openPlan(item)}>View plan</Button>}
                    </div>
                  </div>
                );
              })}
              {listQuery.hasNextPage && (
                <div className="p-5 text-center">
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
