"use client";

import { Bell, BellOff, Globe, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PLAN_ACCENTS } from "../plan-accent";
import {
  browserTimezone,
  formatDayKey,
  formatPlanTime,
  planAccent,
  planDayKey,
  reminderLabel,
} from "../plan-time";
import type { CalendarPlan } from "../type";

type PlanDetailDialogProps = {
  open: boolean;
  plan?: CalendarPlan;
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function PlanDetailDialog({
  open,
  plan,
  isLoading,
  isError,
  onClose,
  onRetry,
  onEdit,
  onDelete,
}: PlanDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md gap-5">
        {isLoading ? (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Loading plan</DialogTitle>
              <DialogDescription className="sr-only">Getting the latest details.</DialogDescription>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </DialogHeader>
            <div className="grid gap-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </>
        ) : isError || !plan ? (
          <>
            <DialogHeader>
              <DialogTitle>Plan unavailable</DialogTitle>
              <DialogDescription>This plan may have been deleted or could not be loaded.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={onRetry}>Try again</Button>
            </DialogFooter>
          </>
        ) : (
          <PlanDetails plan={plan} onEdit={onEdit} onDelete={onDelete} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanDetails({
  plan,
  onEdit,
  onDelete,
}: {
  plan: CalendarPlan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const accent = PLAN_ACCENTS[planAccent(plan)];
  const link = plan.project ?? plan.area;
  const LinkIcon = accent.icon;
  const hasReminder = plan.reminder_status !== "none";
  const otherTimezone = plan.timezone !== browserTimezone();
  const remindAt = plan.remind_at
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(plan.remind_at))
    : null;

  return (
    <>
      <DialogHeader className="gap-1">
        <DialogTitle className="flex items-start gap-2.5 leading-snug">
          <span aria-hidden="true" className={cn("mt-2 size-2.5 shrink-0 rounded-full", accent.dotClass)} />
          <span className="min-w-0 break-words">{plan.title}</span>
        </DialogTitle>
        <DialogDescription className="pl-5">
          {formatDayKey(planDayKey(plan), { year: true })} · {formatPlanTime(plan)}
        </DialogDescription>
      </DialogHeader>

      <ItemGroup className="gap-1">
        {link && (
          <Item size="sm" className="px-0 py-1.5">
            <ItemMedia variant="icon" className="text-muted-foreground"><LinkIcon /></ItemMedia>
            <ItemContent className="gap-0">
              <ItemTitle className="font-normal">{link.name}</ItemTitle>
              <ItemDescription className="text-xs">{accent.label}</ItemDescription>
            </ItemContent>
          </Item>
        )}
        <Item size="sm" className="px-0 py-1.5">
          <ItemMedia variant="icon" className="text-muted-foreground">
            {hasReminder ? <Bell /> : <BellOff />}
          </ItemMedia>
          <ItemContent className="gap-0">
            <ItemTitle className={cn("font-normal", !hasReminder && "text-muted-foreground")}>
              {reminderLabel(plan)}
            </ItemTitle>
            {hasReminder && remindAt && plan.reminder_status === "scheduled" && (
              <ItemDescription className="text-xs">{remindAt}</ItemDescription>
            )}
          </ItemContent>
        </Item>
        {otherTimezone && (
          <Item size="sm" className="px-0 py-1.5">
            <ItemMedia variant="icon" className="text-muted-foreground"><Globe /></ItemMedia>
            <ItemContent className="gap-0">
              <ItemTitle className="font-normal">{plan.timezone}</ItemTitle>
              <ItemDescription className="text-xs">
                {plan.is_all_day ? "Calendar date in this timezone" : "Originally scheduled in this timezone"}
              </ItemDescription>
            </ItemContent>
          </Item>
        )}
      </ItemGroup>

      {plan.notes && (
        <p className="max-h-60 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm leading-6 whitespace-pre-wrap">
          {plan.notes}
        </p>
      )}

      <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 data-icon="inline-start" /> Delete
        </Button>
        <Button onClick={onEdit}>
          <Pencil data-icon="inline-start" /> Edit
        </Button>
      </DialogFooter>
    </>
  );
}
