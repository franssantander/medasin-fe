"use client";

import { AlertCircle, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import PageHeader from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { CalendarSkeleton, PlansPageSkeleton } from "./plans-skeletons";
import { UpcomingPlans } from "./upcoming-plans";

const PlansCalendar = dynamic(
  () => import("./plans-calendar").then((module) => module.PlansCalendar),
  { ssr: false, loading: () => <CalendarSkeleton /> },
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
  if (!timezone) return <PlansPageSkeleton />;
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

  const newPlan = () => setForm({ date: localDateKey(new Date()) });
  const rangeEmpty =
    !listQuery.isFetching && !listQuery.isError && listQuery.data?.data.length === 0;

  return (
    <div className="mx-auto grid w-full max-w-[110rem] gap-6">
      <PageHeader
        title="Plans"
        description="See what is ahead and make space for what matters."
        action={<Button onClick={newPlan}><Plus data-icon="inline-start" /> New plan</Button>}
      />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid min-w-0 gap-3 self-start">
          {listQuery.isError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Plans could not be loaded for this date range.</AlertTitle>
              <AlertDescription>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => void listQuery.refetch()}>
                  {listQuery.isFetching
                    ? <LoaderCircle className="animate-spin" data-icon="inline-start" />
                    : <RefreshCw data-icon="inline-start" />}
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <PlansCalendar
            plans={listQuery.data?.data ?? []}
            focusDate={focusDate}
            isFetching={listQuery.isFetching}
            status={rangeEmpty ? "No plans in this view. Select a date or add a new plan." : undefined}
            onRangeChange={changeRange}
            onCreate={(date, time, allDay) => setForm({ date, time, allDay })}
            onOpenPlan={openPlan}
          />
        </div>
        <UpcomingPlans timezone={timezone} onOpenPlan={openPlan} onCreate={newPlan} />
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

      <AlertDialog
        open={Boolean(deletePlan)}
        onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeletePlan(undefined); }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Move plan to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deletePlan?.title}” will leave the calendar. You can restore it from Trash for 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => void confirmDelete()}>
              {deleteMutation.isPending && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
              {deleteMutation.isPending ? "Moving…" : "Move to Trash"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
