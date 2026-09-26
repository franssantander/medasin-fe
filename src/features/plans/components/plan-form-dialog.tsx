"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, CalendarDays, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useAreasQuery } from "@/features/areas/queries/area-query";
import { useProjectsQuery } from "@/features/projects/queries/project-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";
import { localDateKey } from "../plan-time";
import { planSchema, type PlanFormValues } from "../schemas/plan-schema";
import type { CalendarPlan, PlanInput, PlanLink } from "../type";

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

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const NO_LINK_LABEL = "No link";
const REMINDER_LABELS: Record<PlanFormValues["reminder"], string> = {
  none: "Don't notify me",
  at_time: "At the time of the event",
  three_hours: "3 hours before",
  one_day: "1 day before",
  custom: "Custom",
};
const timeSlots = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

function localDateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day, 12);
  return localDateKey(date) === value ? date : undefined;
}

function timeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function timeChoices(selected: string) {
  if (!timePattern.test(selected) || timeSlots.includes(selected)) return timeSlots;
  return [...timeSlots, selected].sort();
}

function selectedLinkLabel(value: string, projects: PlanLink[], areas: PlanLink[], plan?: CalendarPlan) {
  if (value === "none") return NO_LINK_LABEL;
  if (value.startsWith("project:")) {
    const uuid = value.slice(8);
    return projects.find((project) => project.uuid === uuid)?.name
      ?? (plan?.project?.uuid === uuid ? plan.project.name : undefined)
      ?? "Link unavailable";
  }
  if (value.startsWith("area:")) {
    const uuid = value.slice(5);
    return areas.find((area) => area.uuid === uuid)?.name
      ?? (plan?.area?.uuid === uuid ? plan.area.name : undefined)
      ?? "Link unavailable";
  }
  return "Link unavailable";
}

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
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
      setOpen(false);
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) setOpen(false); }}
      onOpenChangeComplete={(nextOpen) => { if (!nextOpen) onClose(); }}
    >
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 sm:px-6 sm:pr-12">
          <DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>
            Give it a name, choose when it happens, and add the details you need.
          </DialogDescription>
        </DialogHeader>

        <form id="plan-form" onSubmit={submit} className="min-h-0 overflow-y-auto overscroll-contain">
          <FieldGroup className="gap-6 p-5 sm:p-6">
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="plan-title">Title</FieldLabel>
              <Input
                id="plan-title"
                {...register("title")}
                maxLength={120}
                placeholder="What are you planning?"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "plan-title-error" : undefined}
                autoFocus
              />
              {errors.title && <FieldError id="plan-title-error">{errors.title.message}</FieldError>}
            </Field>

            <section aria-labelledby="plan-schedule-heading" className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:p-5">
              <div className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                <div className="grid gap-0.5">
                  <h3 id="plan-schedule-heading" className="text-sm font-semibold">Schedule</h3>
                  <p className="text-xs text-muted-foreground">Choose when this plan happens.</p>
                </div>
              </div>

              <FieldGroup className="gap-4">
                <div className={cn("grid gap-4", !allDay && "sm:grid-cols-2")}>
                  <Field data-invalid={Boolean(errors.date)}>
                    <FieldLabel id="plan-date-label" htmlFor="plan-date">Date</FieldLabel>
                    <Controller
                      control={control}
                      name="date"
                      render={({ field }) => {
                        const selectedDate = localDateFromKey(field.value);
                        return (
                          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                            <PopoverTrigger
                              render={
                                <Button
                                  id="plan-date"
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                  aria-labelledby="plan-date-label plan-date-value"
                                  aria-invalid={Boolean(errors.date)}
                                  aria-describedby={errors.date ? "plan-date-error" : undefined}
                                />
                              }
                            >
                              <CalendarDays data-icon="inline-start" aria-hidden="true" />
                              <span id="plan-date-value">
                                {selectedDate
                                  ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(selectedDate)
                                  : "Choose a date"}
                              </span>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-auto p-0">
                              <PopoverTitle className="sr-only">Choose a date</PopoverTitle>
                              <Calendar
                                mode="single"
                                required
                                selected={selectedDate}
                                defaultMonth={selectedDate}
                                onSelect={(date) => {
                                  if (!date) return;
                                  field.onChange(localDateKey(date));
                                  setDatePickerOpen(false);
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        );
                      }}
                    />
                    {errors.date && <FieldError id="plan-date-error">{errors.date.message}</FieldError>}
                  </Field>

                  {!allDay && (
                    <Field data-invalid={Boolean(errors.time)}>
                      <FieldLabel id="plan-time-label" htmlFor="plan-time">Time</FieldLabel>
                      <Controller
                        control={control}
                        name="time"
                        render={({ field }) => {
                          const choices = timeChoices(field.value);
                          return (
                            <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                              <SelectTrigger
                                id="plan-time"
                                className="w-full"
                                aria-labelledby="plan-time-label"
                                aria-invalid={Boolean(errors.time)}
                                aria-describedby={errors.time ? "plan-time-error" : undefined}
                              >
                                <SelectValue>
                                  {timePattern.test(field.value) ? timeLabel(field.value) : "Choose a time"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent alignItemWithTrigger={false}>
                                <SelectGroup>
                                  <SelectLabel>AM</SelectLabel>
                                  {choices.filter((choice) => choice < "12:00").map((choice) => (
                                    <SelectItem key={choice} value={choice}>{timeLabel(choice)}</SelectItem>
                                  ))}
                                </SelectGroup>
                                <SelectGroup>
                                  <SelectLabel>PM</SelectLabel>
                                  {choices.filter((choice) => choice >= "12:00").map((choice) => (
                                    <SelectItem key={choice} value={choice}>{timeLabel(choice)}</SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          );
                        }}
                      />
                      {errors.time && <FieldError id="plan-time-error">{errors.time.message}</FieldError>}
                    </Field>
                  )}
                </div>

                <Field orientation="horizontal" className="justify-between rounded-lg border bg-background p-3">
                  <div className="grid gap-0.5">
                    <FieldLabel htmlFor="plan-all-day">All-day plan</FieldLabel>
                    <FieldDescription>Keep this plan on its calendar date.</FieldDescription>
                  </div>
                  <Controller
                    control={control}
                    name="is_all_day"
                    render={({ field }) => (
                      <Switch id="plan-all-day" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">Times use {formTimezone}.</p>
              </FieldGroup>
            </section>

            <section aria-labelledby="plan-details-heading" className="grid gap-4">
              <div className="flex items-start gap-2.5">
                <Link2 className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                <div className="grid gap-0.5">
                  <h3 id="plan-details-heading" className="text-sm font-semibold">Details</h3>
                  <p className="text-xs text-muted-foreground">Connect this plan to your work or leave yourself a note.</p>
                </div>
              </div>
              <FieldGroup className="gap-4">
                <Field data-invalid={Boolean(errors.link)}>
                  <FieldLabel id="plan-link-label" htmlFor="plan-link">Link to project or area</FieldLabel>
                  <Controller
                    control={control}
                    name="link"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "none")}>
                        <SelectTrigger
                          id="plan-link"
                          className="w-full"
                          aria-labelledby="plan-link-label"
                          aria-invalid={Boolean(errors.link)}
                          aria-describedby={errors.link ? "plan-link-error" : undefined}
                        >
                          <SelectValue>
                            {selectedLinkLabel(field.value, projectsQuery.data?.data ?? [], areasQuery.data?.data ?? [], plan)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">{NO_LINK_LABEL}</SelectItem>
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
                    <p role="alert" className="text-xs text-destructive">Some links could not be loaded. Reopen the form to try again.</p>
                  )}
                  {errors.link && <FieldError id="plan-link-error">{errors.link.message}</FieldError>}
                </Field>

                <Field data-invalid={Boolean(errors.notes)}>
                  <FieldLabel htmlFor="plan-notes">Notes</FieldLabel>
                  <Textarea
                    id="plan-notes"
                    {...register("notes")}
                    maxLength={10_000}
                    rows={3}
                    placeholder="Details to remember later…"
                    aria-invalid={Boolean(errors.notes)}
                    aria-describedby={errors.notes ? "plan-notes-error" : undefined}
                  />
                  {errors.notes && <FieldError id="plan-notes-error">{errors.notes.message}</FieldError>}
                </Field>
              </FieldGroup>
            </section>

            <section aria-labelledby="plan-reminder-heading" className="grid gap-4 border-t pt-5">
              <div className="flex items-start gap-2.5">
                <Bell className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                <div className="grid gap-0.5">
                  <h3 id="plan-reminder-heading" className="text-sm font-semibold">Reminder</h3>
                  <p className="text-xs text-muted-foreground">Get a notification before this plan starts.</p>
                </div>
              </div>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel id="plan-reminder-label" htmlFor="plan-reminder">Remind me</FieldLabel>
                  <Controller
                    control={control}
                    name="reminder"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "none")}>
                        <SelectTrigger id="plan-reminder" className="w-full" aria-label="Reminder">
                          <SelectValue>{REMINDER_LABELS[field.value]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">{REMINDER_LABELS.none}</SelectItem>
                            <SelectItem value="at_time">{REMINDER_LABELS.at_time}</SelectItem>
                            <SelectItem value="three_hours">{REMINDER_LABELS.three_hours}</SelectItem>
                            <SelectItem value="one_day">{REMINDER_LABELS.one_day}</SelectItem>
                            <SelectItem value="custom">{REMINDER_LABELS.custom}</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                {reminder === "custom" && (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.75fr)] gap-3">
                    <Field data-invalid={Boolean(errors.custom_amount)}>
                      <FieldLabel htmlFor="plan-custom-amount">Amount</FieldLabel>
                      <Input
                        id="plan-custom-amount"
                        type="number"
                        min={1}
                        step={1}
                        {...register("custom_amount")}
                        aria-label="Custom reminder amount"
                        aria-invalid={Boolean(errors.custom_amount)}
                        aria-describedby={errors.custom_amount ? "plan-custom-amount-error" : undefined}
                      />
                      {errors.custom_amount && <FieldError id="plan-custom-amount-error">{errors.custom_amount.message}</FieldError>}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="plan-custom-unit">Unit</FieldLabel>
                      <Controller
                        control={control}
                        name="custom_unit"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "minutes")}>
                            <SelectTrigger id="plan-custom-unit" className="w-full" aria-label="Custom reminder unit"><SelectValue /></SelectTrigger>
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
                    </Field>
                  </div>
                )}
                {allDay && <FieldDescription>All-day reminders are sent at 9:00 AM in {formTimezone}.</FieldDescription>}
              </FieldGroup>
            </section>

            {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
          </FieldGroup>
        </form>

        <DialogFooter className="shrink-0 border-t bg-popover px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={isPending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="plan-form" className="w-full sm:w-auto" disabled={isPending}>
            {isPending ? "Saving…" : plan ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
