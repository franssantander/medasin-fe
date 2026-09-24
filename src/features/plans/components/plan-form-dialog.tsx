"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, CalendarDays, Link2 } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormField } from "@/features/areas/components/form-field";
import { useAreasQuery } from "@/features/areas/queries/area-query";
import { useProjectsQuery } from "@/features/projects/queries/project-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/axios";
import { localDateKey } from "../plan-time";
import { planSchema, type PlanFormValues } from "../schemas/plan-schema";
import type { CalendarPlan, PlanInput } from "../type";

type PlanFormDialogProps = {
  plan?: CalendarPlan;
  initialDate?: string;
  initialTime?: string;
  initialAllDay?: boolean;
  timezone: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: PlanInput) => Promise<void>;
};

function reminderValues(offset: number | null | undefined): Pick<
  PlanFormValues,
  "reminder" | "custom_amount" | "custom_unit"
> {
  if (offset === 0) return { reminder: "at_time", custom_amount: "30", custom_unit: "minutes" };
  if (offset === 180) return { reminder: "three_hours", custom_amount: "30", custom_unit: "minutes" };
  if (offset === 1440) return { reminder: "one_day", custom_amount: "30", custom_unit: "minutes" };
  if (offset == null) return { reminder: "none", custom_amount: "30", custom_unit: "minutes" };
  if (offset % 1440 === 0) return { reminder: "custom", custom_amount: String(offset / 1440), custom_unit: "days" };
  if (offset % 60 === 0) return { reminder: "custom", custom_amount: String(offset / 60), custom_unit: "hours" };
  return { reminder: "custom", custom_amount: String(offset), custom_unit: "minutes" };
}

export function PlanFormDialog({
  plan,
  initialDate,
  initialTime,
  initialAllDay,
  timezone,
  isPending,
  onClose,
  onSubmit,
}: PlanFormDialogProps) {
  const projectsQuery = useProjectsQuery("active");
  const areasQuery = useAreasQuery("active");
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      title: plan?.title ?? "",
      notes: plan?.notes ?? "",
      date: plan?.date ?? initialDate ?? localDateKey(new Date()),
      time: plan?.time ?? initialTime ?? "09:00",
      is_all_day: plan?.is_all_day ?? initialAllDay ?? false,
      link: plan?.project
        ? `project:${plan.project.uuid}`
        : plan?.area
          ? `area:${plan.area.uuid}`
          : "none",
      ...reminderValues(plan?.reminder_offset_minutes),
    },
  });
  const allDay = useWatch({ control, name: "is_all_day" });
  const reminder = useWatch({ control, name: "reminder" });
  const formTimezone = plan?.timezone ?? timezone;
  const linkedProjectMissing = plan?.project &&
    !projectsQuery.data?.data.some((project) => project.uuid === plan.project?.uuid);
  const linkedAreaMissing = plan?.area &&
    !areasQuery.data?.data.some((area) => area.uuid === plan.area?.uuid);

  const submit = handleSubmit(async (values) => {
    const multiplier = { minutes: 1, hours: 60, days: 1440 }[values.custom_unit];
    const offset = {
      none: null,
      at_time: 0,
      three_hours: 180,
      one_day: 1440,
      custom: Number(values.custom_amount) * multiplier,
    }[values.reminder];
    const input: PlanInput = {
      title: values.title.trim(),
      notes: values.notes.trim() || null,
      date: values.date,
      is_all_day: values.is_all_day,
      timezone: formTimezone,
      reminder_offset_minutes: offset,
      ...(!values.is_all_day ? { time: values.time } : {}),
      ...(values.link.startsWith("project:")
        ? { project_uuid: values.link.slice(8) }
        : values.link.startsWith("area:")
          ? { area_uuid: values.link.slice(5) }
          : {}),
    };

    try {
      await onSubmit(input);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        for (const [field, messages] of Object.entries(error.validationErrors)) {
          const formField = {
            project_uuid: "link",
            area_uuid: "link",
            reminder_offset_minutes: "custom_amount",
            timezone: "root",
          }[field] ?? field;
          setError(formField as keyof PlanFormValues, { message: messages[0] });
        }
      } else {
        setError("root", { message: "The plan could not be saved. Try again." });
      }
    }
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>
            Set a date, connect it to your work, and choose whether to receive a reminder.
          </DialogDescription>
        </DialogHeader>

        <form id="plan-form" onSubmit={submit} className="grid gap-5">
          <FormField label="Title" error={errors.title?.message}>
            <Input {...register("title")} maxLength={120} placeholder="What are you planning?" aria-invalid={Boolean(errors.title)} autoFocus />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date" error={errors.date?.message}>
              <Input type="date" {...register("date")} aria-invalid={Boolean(errors.date)} />
            </FormField>
            {!allDay && (
              <FormField label="Time" error={errors.time?.message}>
                <Input type="time" {...register("time")} aria-invalid={Boolean(errors.time)} />
              </FormField>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">All-day plan</p>
                <p className="text-xs text-muted-foreground">Keep this on its calendar date.</p>
              </div>
            </div>
            <Controller
              control={control}
              name="is_all_day"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="All-day plan" />
              )}
            />
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="size-4" aria-hidden="true" /> Link to project or area</div>
            <Controller
              control={control}
              name="link"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "none")}>
                  <SelectTrigger className="w-full" aria-label="Link to project or area"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">No link</SelectItem>
                    </SelectGroup>
                    {(projectsQuery.data?.data.length ?? 0) > 0 && (
                      <SelectGroup>
                        <SelectLabel>Projects</SelectLabel>
                        {projectsQuery.data?.data.map((project) => (
                          <SelectItem key={project.uuid} value={`project:${project.uuid}`}>{project.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {linkedProjectMissing && (
                      <SelectGroup>
                        <SelectLabel>Current project</SelectLabel>
                        <SelectItem value={`project:${plan.project!.uuid}`}>{plan.project!.name}</SelectItem>
                      </SelectGroup>
                    )}
                    {(areasQuery.data?.data.length ?? 0) > 0 && (
                      <SelectGroup>
                        <SelectLabel>Areas</SelectLabel>
                        {areasQuery.data?.data.map((area) => (
                          <SelectItem key={area.uuid} value={`area:${area.uuid}`}>{area.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {linkedAreaMissing && (
                      <SelectGroup>
                        <SelectLabel>Current area</SelectLabel>
                        <SelectItem value={`area:${plan.area!.uuid}`}>{plan.area!.name}</SelectItem>
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {(projectsQuery.isError || areasQuery.isError) && (
              <p className="text-xs text-destructive">Some links could not be loaded. Reopen the form to try again.</p>
            )}
            {errors.link && <p className="text-xs text-destructive">{errors.link.message}</p>}
          </div>

          <FormField label="Notes" error={errors.notes?.message}>
            <Textarea {...register("notes")} maxLength={10_000} rows={3} placeholder="Details to remember later…" aria-invalid={Boolean(errors.notes)} />
          </FormField>

          <div className="grid gap-1.5">
            <div className="flex items-center gap-2 text-sm font-medium"><Bell className="size-4" aria-hidden="true" /> Reminder</div>
            <Controller
              control={control}
              name="reminder"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "none")}>
                  <SelectTrigger className="w-full" aria-label="Reminder"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">Don&apos;t notify me</SelectItem>
                      <SelectItem value="at_time">At the time of the event</SelectItem>
                      <SelectItem value="three_hours">3 hours before</SelectItem>
                      <SelectItem value="one_day">1 day before</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {reminder === "custom" && (
              <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2 pt-1">
                <div>
                  <Input type="number" min={1} step={1} {...register("custom_amount")} aria-label="Custom reminder amount" aria-invalid={Boolean(errors.custom_amount)} />
                  {errors.custom_amount && <p className="mt-1 text-xs text-destructive">{errors.custom_amount.message}</p>}
                </div>
                <Controller
                  control={control}
                  name="custom_unit"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "minutes")}>
                      <SelectTrigger className="w-full" aria-label="Custom reminder unit"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Timezone: {formTimezone}. All-day reminders are anchored at 9:00 AM.
            </p>
          </div>

          {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>Cancel</Button>
          <Button type="submit" form="plan-form" disabled={isPending}>
            {isPending ? "Saving…" : plan ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
