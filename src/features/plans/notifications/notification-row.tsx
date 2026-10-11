"use client";

import { Bell, BellRing, CalendarClock, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
} from "@/components/ui/item";
import { cn } from "@/lib/utils";
import {
  notificationReceived,
  notificationSchedule,
} from "./notification-time";
import type { PlanNotification } from "./type";

export function NotificationRow({
  item,
  now,
  pending,
  error,
  onRead,
  onOpenPlan,
}: {
  item: PlanNotification;
  now: number;
  pending: boolean;
  error: boolean;
  onRead: (item: PlanNotification) => void;
  onOpenPlan: (item: PlanNotification) => void;
}) {
  const title = item.data.title || "Plan reminder";
  const unread = !item.read_at;
  const schedule = notificationSchedule(item);
  const received = notificationReceived(item, now);
  const planUuid = item.data.plan_uuid;

  return (
    <Item
      role="listitem"
      variant="outline"
      size="sm"
      aria-busy={pending}
      className={cn(
        "relative min-w-0 flex-nowrap items-start gap-3 rounded-xl",
        unread ? "border-primary/20 bg-primary/[0.04]" : "bg-card",
        planUuid &&
          "hover:bg-muted/50 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
      )}
    >
      <ItemMedia
        variant="icon"
        className={cn(
          "size-8 rounded-lg",
          unread
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {unread ? <BellRing /> : <Bell />}
      </ItemMedia>
      <ItemContent className="min-w-0 gap-1">
        <div className="flex min-w-0 items-start gap-3">
          <div
            data-slot="item-title"
            className="flex min-w-0 flex-1 items-start gap-2 text-sm leading-snug font-medium wrap-anywhere"
          >
            {planUuid ? (
              <Link
                href={`/plans?plan=${encodeURIComponent(planUuid)}`}
                aria-label={`View plan: ${title}`}
                className="min-w-0 outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
                onNavigate={(event) => {
                  event.preventDefault();
                  onOpenPlan(item);
                }}
              >
                {title}
              </Link>
            ) : (
              <span className="min-w-0">{title}</span>
            )}
            {unread && (
              <span className="mt-1.5 block size-2 shrink-0 rounded-full bg-primary">
                <span className="sr-only">Unread</span>
              </span>
            )}
          </div>
          {received && (
            <time
              dateTime={received.dateTime}
              title={`Received ${received.absolute}`}
              className="shrink-0 pt-px text-xs text-muted-foreground tabular-nums"
            >
              <span className="sr-only">Received </span>
              {received.relative}
            </time>
          )}
        </div>
        {schedule && (
          <ItemDescription
            className="flex items-start gap-1.5 text-xs wrap-anywhere"
            aria-label={`Scheduled for ${schedule}`}
          >
            <CalendarClock className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {schedule}
          </ItemDescription>
        )}
        {error && unread && (
          <Alert variant="destructive" className="relative z-10 mt-1 px-3 py-2 text-xs">
            <AlertTitle className="text-xs">Couldn’t mark as read</AlertTitle>
            <AlertDescription className="text-xs">
              Your reminder is still unread. Please try again.
            </AlertDescription>
          </Alert>
        )}
        {unread && (
          <Button
            size="xs"
            variant="ghost"
            className="relative z-10 -ml-2 mt-1 min-h-11 w-fit text-muted-foreground hover:text-foreground md:min-h-6"
            aria-label={`Mark as read: ${title}`}
            disabled={pending}
            focusableWhenDisabled
            onClick={() => onRead(item)}
          >
            {pending ? (
              <LoaderCircle
                data-icon="inline-start"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Check data-icon="inline-start" />
            )}
            {pending ? "Marking…" : "Mark read"}
          </Button>
        )}
      </ItemContent>
    </Item>
  );
}
