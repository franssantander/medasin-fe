"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, BellOff, CalendarDays, Clock, LoaderCircle, Unlink } from "lucide-react";
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
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { PLAN_ACCENTS } from "../plan-accent";
import { addDaysToKey, dateFromKey, localDateKey } from "../plan-time";
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
const ProjectIcon = PLAN_ACCENTS.project.icon;
const AreaIcon = PLAN_ACCENTS.area.icon;

function quickDates(todayKey: string) {
  const weekday = dateFromKey(todayKey).getDay();
  return [
    { label: "Today", value: todayKey },
    { label: "Tomorrow", value: addDaysToKey(todayKey, 1) },
    { label: "Next Monday", value: addDaysToKey(todayKey, ((8 - weekday) % 7) || 7) },
  ];
}

const UNIT_LABELS: Record<PlanFormValues["custom_unit"], string> = {
  minutes: "Minutes",
  hours: "Hours",
  days: "Days",
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

function LinkLabel({ value, projects, areas, plan }: {
  value: string;
  projects: PlanLink[];
  areas: PlanLink[];
  plan?: CalendarPlan;
}) {
  const label = selectedLinkLabel(value, projects, areas, plan);
  const Icon = value.startsWith("project:") ? ProjectIcon : value.startsWith("area:") ? AreaIcon : Unlink;
  return (
    <>
      <Icon className="text-muted-foreground" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </>
  );
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
  const todayKey = localDateKey(new Date());
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
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>Choose when it happens and how you want to be reminded.</DialogDescription>
        </DialogHeader>

        <form id="plan-form" onSubmit={submit} className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid gap-6 px-6 py-5">
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="plan-title" className="sr-only">Title</FieldLabel>
              <Input
                id="plan-title"
                {...register("title")}
                maxLength={120}
                placeholder="What are you planning?"
                className="h-10 text-base font-medium md:text-base"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "plan-title-error" : undefined}
                autoFocus
              />
              {errors.title && <FieldError id="plan-title-error">{errors.title.message}</FieldError>}
            </Field>

            <FieldSet className="gap-3">
              <FieldLegend className="sr-only">When</FieldLegend>
              <div className={cn("grid gap-3", !allDay && "sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]")}>
                <Field data-invalid={Boolean(errors.date)} className="gap-1.5">
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
                            <CalendarDays data-icon="inline-start" className="text-muted-foreground" aria-hidden="true" />
                            <span id="plan-date-value" className="truncate">
                              {selectedDate
                                ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(selectedDate)
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
                  <Field data-invalid={Boolean(errors.time)} className="gap-1.5">
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
                                <Clock className="text-muted-foreground" aria-hidden="true" />
                                {timePattern.test(field.value) ? timeLabel(field.value) : "Choose a time"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false} className="max-h-72">
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

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick dates">
                      {quickDates(todayKey).map((option) => {
                        const selected = field.value === option.value;
                        return (
                          <Button
                            key={option.label}
                            type="button"
                            size="xs"
                            variant={selected ? "secondary" : "outline"}
                            aria-pressed={selected}
                            onClick={() => field.onChange(option.value)}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                />
                <Field orientation="horizontal" className="w-auto gap-2">
                  <Controller
                    control={control}
                    name="is_all_day"
                    render={({ field }) => (
                      <Switch id="plan-all-day" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                  <FieldLabel htmlFor="plan-all-day" className="font-normal">All-day plan</FieldLabel>
                </Field>
              </div>
              <FieldDescription className="text-xs">
                {allDay && reminder !== "none"
                  ? `All-day reminders are sent at 9:00 AM in ${formTimezone}.`
                  : `Times use ${formTimezone}.`}
              </FieldDescription>
            </FieldSet>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.link)} className="min-w-0 gap-1.5">
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
                          <LinkLabel
                            value={field.value}
                            projects={projectsQuery.data?.data ?? []}
                            areas={areasQuery.data?.data ?? []}
                            plan={plan}
                          />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectGroup>
                          <SelectItem value="none"><Unlink className="text-muted-foreground" aria-hidden="true" />{NO_LINK_LABEL}</SelectItem>
                        </SelectGroup>
                        {(projectsQuery.data?.data.length ?? 0) > 0 && (
                          <SelectGroup>
                            <SelectLabel>Projects</SelectLabel>
                            {projectsQuery.data?.data.map((project) => (
                              <SelectItem key={project.uuid} value={`project:${project.uuid}`}>
                                <ProjectIcon className="text-muted-foreground" aria-hidden="true" />{project.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {linkedProjectMissing && (
                          <SelectGroup>
                            <SelectLabel>Current project</SelectLabel>
                            <SelectItem value={`project:${plan.project!.uuid}`}>
                              <ProjectIcon className="text-muted-foreground" aria-hidden="true" />{plan.project!.name}
                            </SelectItem>
                          </SelectGroup>
                        )}
                        {(areasQuery.data?.data.length ?? 0) > 0 && (
                          <SelectGroup>
                            <SelectLabel>Areas</SelectLabel>
                            {areasQuery.data?.data.map((area) => (
                              <SelectItem key={area.uuid} value={`area:${area.uuid}`}>
                                <AreaIcon className="text-muted-foreground" aria-hidden="true" />{area.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {linkedAreaMissing && (
                          <SelectGroup>
                            <SelectLabel>Current area</SelectLabel>
                            <SelectItem value={`area:${plan.area!.uuid}`}>
                              <AreaIcon className="text-muted-foreground" aria-hidden="true" />{plan.area!.name}
                            </SelectItem>
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

              <Field className="min-w-0 gap-1.5">
                <FieldLabel id="plan-reminder-label" htmlFor="plan-reminder">Remind me</FieldLabel>
                <Controller
                  control={control}
                  name="reminder"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "none")}>
                      <SelectTrigger id="plan-reminder" className="w-full" aria-label="Reminder">
                        <SelectValue>
                          {field.value === "none"
                            ? <BellOff className="text-muted-foreground" aria-hidden="true" />
                            : <Bell className="text-muted-foreground" aria-hidden="true" />}
                          <span className="truncate">{REMINDER_LABELS[field.value]}</span>
                        </SelectValue>
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
                <Field data-invalid={Boolean(errors.custom_amount)} className="gap-1.5 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="plan-custom-amount"
                      type="number"
                      min={1}
                      step={1}
                      className="w-20 tabular-nums"
                      {...register("custom_amount")}
                      aria-label="Custom reminder amount"
                      aria-invalid={Boolean(errors.custom_amount)}
                      aria-describedby={errors.custom_amount ? "plan-custom-amount-error" : undefined}
                    />
                    <Controller
                      control={control}
                      name="custom_unit"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "minutes")}>
                          <SelectTrigger id="plan-custom-unit" className="w-28" aria-label="Custom reminder unit">
                            <SelectValue>{UNIT_LABELS[field.value]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {(Object.keys(UNIT_LABELS) as PlanFormValues["custom_unit"][]).map((unit) => (
                                <SelectItem key={unit} value={unit}>{UNIT_LABELS[unit]}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <span className="text-sm text-muted-foreground">before</span>
                  </div>
                  {errors.custom_amount && <FieldError id="plan-custom-amount-error">{errors.custom_amount.message}</FieldError>}
                </Field>
              )}
            </div>

            <Field data-invalid={Boolean(errors.notes)} className="gap-1.5">
              <FieldLabel htmlFor="plan-notes">Notes</FieldLabel>
              <Textarea
                id="plan-notes"
                {...register("notes")}
                maxLength={10_000}
                rows={3}
                className="min-h-20"
                placeholder="Details to remember later…"
                aria-invalid={Boolean(errors.notes)}
                aria-describedby={errors.notes ? "plan-notes-error" : undefined}
              />
              {errors.notes && <FieldError id="plan-notes-error">{errors.notes.message}</FieldError>}
            </Field>

            {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
          </div>
        </form>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="plan-form" disabled={isPending}>
            {isPending && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
            {isPending ? "Saving…" : plan ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
