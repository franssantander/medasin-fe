"use client";

import { CalendarDays, Plus, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import PageHeader from "@/components/shared/page-header";
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
import { browserTimezone, localDateKey } from "../plan-time";
import {
  useCreatePlan,
  useDeletePlan,
  usePlanListQuery,
  usePlanQuery,
  useUpdatePlan,
} from "../queries/plan-query";
import type { CalendarPlan, CalendarRange, PlanInput } from "../type";
import { PlanDetailDialog } from "./plan-detail-dialog";
import { PlanFormDialog } from "./plan-form-dialog";
import { UpcomingPlans } from "./upcoming-plans";

const PlansCalendar = dynamic(
  () => import("./plans-calendar").then((module) => module.PlansCalendar),
  { ssr: false, loading: () => <Skeleton className="h-[36rem] rounded-xl" /> },
);

const subscribeTimezone = () => () => {};
const serverTimezone = () => null;

type FormState = {
  plan?: CalendarPlan;
  date?: string;
  time?: string;
  allDay?: boolean;
};

export function PlansPage({ initialPlanUuid }: { initialPlanUuid?: string }) {
  const timezone = useSyncExternalStore(subscribeTimezone, browserTimezone, serverTimezone);
  if (!timezone) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[36rem] rounded-xl" />
      </div>
    );
  }
  return <PlansWorkspace key={timezone} timezone={timezone} initialPlanUuid={initialPlanUuid} />;
}

function PlansWorkspace({
  timezone,
  initialPlanUuid,
}: {
  timezone: string;
  initialPlanUuid?: string;
}) {
  const router = useRouter();
  const [range, setRange] = useState<CalendarRange | null>(null);
  const [form, setForm] = useState<FormState>();
  const [deletePlan, setDeletePlan] = useState<CalendarPlan>();
  const listQuery = usePlanListQuery(range, timezone);
  const detailQuery = usePlanQuery(initialPlanUuid);
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const deleteMutation = useDeletePlan();
  const detail = detailQuery.data?.data;
  const focusDate = detail
    ? detail.is_all_day
      ? detail.date
      : localDateKey(new Date(detail.starts_at))
    : undefined;

  const changeRange = useCallback((next: CalendarRange) => {
    setRange((current) =>
      current?.startDate === next.startDate && current.endDate === next.endDate
        ? current
        : next,
    );
  }, []);
  const openPlan = (uuid: string) => router.push(`/plans?plan=${encodeURIComponent(uuid)}`);
  const closeDetail = () => router.replace("/plans");
  const submitPlan = async (input: PlanInput) => {
    if (form?.plan) {
      await updateMutation.mutateAsync({ uuid: form.plan.uuid, input });
    } else {
      await createMutation.mutateAsync(input);
    }
  };
  const confirmDelete = async () => {
    if (!deletePlan) return;
    await deleteMutation.mutateAsync(deletePlan.uuid);
    setDeletePlan(undefined);
  };

  return (
    <div className="mx-auto grid w-full max-w-[110rem] gap-5">
      <PageHeader
        title="Plans"
        description="See what is ahead and make space for what matters."
        action={<Button onClick={() => setForm({ date: localDateKey(new Date()) })}><Plus /> New plan</Button>}
      />
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid min-w-0 gap-3 self-start">
          <PlansCalendar
            plans={listQuery.data?.data ?? []}
            focusDate={focusDate}
            onRangeChange={changeRange}
            onCreate={(date, time, allDay) => setForm({ date, time, allDay })}
            onOpenPlan={openPlan}
          />
          {listQuery.isFetching && <p className="px-1 text-xs text-muted-foreground" role="status">Loading plans…</p>}
          {listQuery.isError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p>Plans could not be loaded for this date range.</p>
              <Button size="sm" variant="outline" onClick={() => void listQuery.refetch()}><RefreshCw /> Try again</Button>
            </div>
          )}
          {!listQuery.isFetching && !listQuery.isError && listQuery.data?.data.length === 0 && (
            <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" /> No plans in this view. Select a date or add a new plan.</p>
          )}
        </div>
        <UpcomingPlans timezone={timezone} onOpenPlan={openPlan} />
      </div>

      <PlanDetailDialog
        open={Boolean(initialPlanUuid) && !form && !deletePlan}
        plan={detail}
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        onClose={closeDetail}
        onRetry={() => void detailQuery.refetch()}
        onEdit={() => { if (detail) { setForm({ plan: detail }); closeDetail(); } }}
        onDelete={() => { if (detail) { setDeletePlan(detail); closeDetail(); } }}
      />

      {form && (
        <PlanFormDialog
          key={form.plan?.uuid ?? `${form.date ?? "today"}-${form.time ?? ""}`}
          plan={form.plan}
          initialDate={form.date}
          initialTime={form.time}
          initialAllDay={form.allDay}
          timezone={timezone}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={() => setForm(undefined)}
          onSubmit={submitPlan}
        />
      )}

      <Dialog open={Boolean(deletePlan)} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeletePlan(undefined); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move plan to Trash?</DialogTitle>
            <DialogDescription>
              “{deletePlan?.title}” will leave the calendar. You can restore it from Trash for 30 days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => setDeletePlan(undefined)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => void confirmDelete()}>
              {deleteMutation.isPending ? "Moving…" : "Move to Trash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
