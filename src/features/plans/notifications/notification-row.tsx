"use client";

import { BellRing, CalendarDays, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <Card
      role="listitem"
      size="sm"
      className="min-w-0 gap-3"
      aria-busy={pending}
    >
      <CardHeader className="min-w-0 gap-2">
        <CardTitle className="min-w-0 wrap-anywhere">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-1 shrink-0 [&_svg]:size-4" aria-hidden="true">
              {unread ? <BellRing /> : <CalendarDays />}
            </span>
            {item.data.plan_uuid ? (
              <Link
                href={`/plans?plan=${encodeURIComponent(item.data.plan_uuid)}`}
                aria-label={`View plan: ${title}`}
                className="block min-h-11 min-w-0 flex-1 rounded-sm py-1 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring md:min-h-0 md:py-0"
                onNavigate={(event) => {
                  event.preventDefault();
                  onOpenPlan(item);
                }}
              >
                {title}
              </Link>
            ) : (
              <span className="min-w-0 flex-1">{title}</span>
            )}
          </div>
        </CardTitle>
        {schedule && (
          <CardDescription
            className="wrap-anywhere"
            aria-label={`Scheduled for ${schedule}`}
          >
            {schedule}
          </CardDescription>
        )}
        {unread && (
          <CardAction>
            <Badge variant="secondary">Unread</Badge>
          </CardAction>
        )}
      </CardHeader>
      {error && unread && (
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Couldn’t mark as read</AlertTitle>
            <AlertDescription>
              Your reminder is still unread. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
      {(received || unread) && (
        <CardFooter className="flex-wrap justify-between gap-2 border-t">
          {received && (
            <time
              dateTime={received.dateTime}
              title={`Received ${received.absolute}`}
              className="text-xs text-muted-foreground"
            >
              Received {received.relative}
            </time>
          )}
          {unread && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto min-h-11 md:min-h-8"
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
        </CardFooter>
      )}
    </Card>
  );
}
