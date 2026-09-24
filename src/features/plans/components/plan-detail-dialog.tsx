"use client";

import { Bell, CalendarDays, FolderKanban, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPlanWhen, reminderLabel } from "../plan-time";
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
      <DialogContent>
        {isLoading ? (
          <>
            <DialogHeader>
              <DialogTitle>Loading plan</DialogTitle>
              <DialogDescription>Getting the latest details.</DialogDescription>
            </DialogHeader>
            <Skeleton className="h-28 rounded-lg" />
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
          <>
            <DialogHeader>
              <DialogTitle className="pr-4">{plan.title}</DialogTitle>
              <DialogDescription>Plan details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">{formatPlanWhen(plan)}</p>
                  <p className="text-xs text-muted-foreground">{plan.is_all_day ? `Calendar date in ${plan.timezone}` : `Originally scheduled in ${plan.timezone}`}</p>
                </div>
              </div>
              {(plan.project || plan.area) && (
                <div className="flex items-start gap-3">
                  <FolderKanban className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p>{plan.project ? `Project: ${plan.project.name}` : `Area: ${plan.area?.name}`}</p>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p>{reminderLabel(plan)}</p>
              </div>
              {plan.notes && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 leading-6">{plan.notes}</p>}
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={onDelete}><Trash2 /> Delete</Button>
              <Button variant="outline" onClick={onEdit}><Pencil /> Edit</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
