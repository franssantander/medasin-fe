"use client";

import { CalendarCheck, Loader2, Pencil, Search, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAreasQuery } from "@/features/areas/queries/area-query";
import { AreaIcon, AREA_ICONS } from "@/features/areas/components/area-icons";
import { ApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";
import {
  habitSchema,
  type HabitFormValues,
  type HabitResolvedValues,
} from "../schemas/habit-schema";
import type { Habit, HabitInput, HabitWeekday } from "../type";
import { describeSchedule } from "./habit-calendar-utils";

const frequencies = [
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Weekly schedule" },
  { value: "custom", label: "Selected weekdays" },
  { value: "monthly", label: "Selected dates monthly" },
];
const weekdays: { value: HabitWeekday; label: string; short: string }[] = [
  { value: "sunday", label: "Sunday", short: "S" },
  { value: "monday", label: "Monday", short: "M" },
  { value: "tuesday", label: "Tuesday", short: "T" },
  { value: "wednesday", label: "Wednesday", short: "W" },
  { value: "thursday", label: "Thursday", short: "T" },
  { value: "friday", label: "Friday", short: "F" },
  { value: "saturday", label: "Saturday", short: "S" },
];
const dayPresets: { label: string; days: HabitWeekday[] }[] = [
  {
    label: "Weekdays",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  },
  { label: "Weekends", days: ["sunday", "saturday"] },
];
const chip =
  "rounded-full border-border data-[pressed]:border-emerald-500 data-[pressed]:bg-emerald-500 data-[pressed]:text-white aria-pressed:border-emerald-500 aria-pressed:bg-emerald-500 aria-pressed:text-white hover:aria-pressed:bg-emerald-500/90 dark:aria-pressed:bg-emerald-500";

export function HabitFormDialog({
  open,
  onOpenChange,
  onClosed,
  habit,
  isPending,
  onSubmit,
  initialAreaUuid,
  defaults,
  opener,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
  habit?: Habit;
  isPending: boolean;
  onSubmit: (input: HabitInput) => Promise<void>;
  initialAreaUuid?: string | null;
  defaults?: { name: string; icon: string };
  opener?: HTMLElement | null;
}) {
  const id = useId();
  const [initialOpener] = useState(() =>
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const [iconSearch, setIconSearch] = useState("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const areasQuery = useAreasQuery("active");
  const areas = areasQuery.data?.data;
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<HabitFormValues, unknown, HabitResolvedValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: "",
      icon: "Repeat2",
      description: "",
      frequency: "daily",
      schedule_days: [],
      schedule_dates: [],
      is_active: true,
      area_uuid: null,
    },
  });
  const frequency = useWatch({ control, name: "frequency" });
  const selectedIcon = useWatch({ control, name: "icon" }) || "Repeat2";
  const selectedDays = useWatch({ control, name: "schedule_days" }) ?? [];
  const selectedDates = useWatch({ control, name: "schedule_dates" }) ?? [];
  const scheduleSummary = describeSchedule(
    frequency,
    frequency === "monthly"
      ? { dates: selectedDates }
      : frequency === "daily"
        ? null
        : { days: selectedDays },
  );
  const areaOptions = useMemo(
    () => [
      { value: "none", label: "No Area" },
      ...(areas ?? []).map((area) => ({ value: area.uuid, label: area.name })),
      ...(habit?.area && !areas?.some((area) => area.uuid === habit.area?.uuid)
        ? [{ value: habit.area.uuid, label: habit.area.name }]
        : []),
    ],
    [areas, habit],
  );
  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    return query
      ? AREA_ICONS.filter(({ name }) => name.toLowerCase().includes(query))
      : AREA_ICONS;
  }, [iconSearch]);

  useEffect(() => {
    if (!open) return;
    reset({
      name: habit?.name ?? defaults?.name ?? "",
      icon: habit?.icon || defaults?.icon || "Repeat2",
      description: habit?.description ?? "",
      frequency: habit?.frequency ?? "daily",
      schedule_days: habit?.schedule?.days ?? [],
      schedule_dates: habit?.schedule?.dates ?? [],
      is_active: habit?.is_active ?? true,
      area_uuid: habit?.area?.uuid ?? initialAreaUuid ?? null,
    });
  }, [defaults, habit, initialAreaUuid, open, reset]);

  const submit = handleSubmit(async (values) => {
    if (isPending) return;
    clearErrors("root");
    try {
      const schedule =
        values.frequency === "daily"
          ? null
          : values.frequency === "monthly"
            ? { dates: [...values.schedule_dates].sort((a, b) => a - b) }
            : { days: values.schedule_days };
      await onSubmit({
        name: values.name,
        icon: values.icon,
        description: values.description,
        frequency: values.frequency,
        schedule,
        is_active: values.is_active,
        area_uuid: values.area_uuid,
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        const fields: Record<string, keyof HabitFormValues> = {
          name: "name",
          icon: "icon",
          description: "description",
          frequency: "frequency",
          "schedule.days": "schedule_days",
          "schedule.dates": "schedule_dates",
          area_uuid: "area_uuid",
          is_active: "is_active",
        };
        let mapped = false;
        Object.entries(error.validationErrors).forEach(([field, messages]) => {
          if (fields[field]) {
            setError(
              fields[field],
              { message: messages[0] },
              { shouldFocus: !mapped },
            );
            mapped = true;
          }
        });
        if (!mapped) setError("root", { message: error.message });
      } else
        setError("root", {
          message:
            error instanceof Error
              ? error.message
              : "The habit could not be saved.",
        });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !isPending && onOpenChange(next)}
      onOpenChangeComplete={(next) => !next && onClosed()}
    >
      <DialogContent
        showCloseButton={false}
        initialFocus={() => document.getElementById(id + "-name")}
        finalFocus={() => {
          const target = opener ?? initialOpener;
          return target?.isConnected && target !== document.body
            ? target
            : document.getElementById("add-habit-trigger");
        }}
        className="max-h-[92dvh] max-w-xl gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 px-5 py-4 pr-14 sm:px-6 sm:pr-14">
          <DialogTitle>{habit ? "Edit habit" : "Add habit"}</DialogTitle>
          <DialogDescription>
            Choose a small action and a rhythm you can return to.
          </DialogDescription>
        </DialogHeader>
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-4 top-4"
            />
          }
          aria-label="Close"
          disabled={isPending}
        >
          <X />
        </DialogClose>
        <Separator />
        <form
          onSubmit={submit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <FieldGroup className="workspace-list-scrollbar min-h-0 flex-1 gap-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1.5 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Change icon"
                    title="Change icon"
                    aria-expanded={iconPickerOpen}
                    aria-controls={id + "-icon-picker"}
                    disabled={isPending}
                    onClick={() => setIconPickerOpen(!iconPickerOpen)}
                    className="relative size-12 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 hover:text-emerald-700 aria-expanded:bg-emerald-500/20 aria-expanded:text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:text-emerald-300 dark:aria-expanded:text-emerald-300"
                  >
                    <AreaIcon name={selectedIcon} className="size-5" />
                    <span
                      aria-hidden="true"
                      className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs"
                    >
                      <Pencil className="size-2.5" />
                    </span>
                  </Button>
                </div>
                <Field
                  data-invalid={Boolean(errors.name)}
                  data-disabled={isPending}
                  className="min-w-0 flex-1"
                >
                  <FieldLabel htmlFor={id + "-name"}>Habit name</FieldLabel>
                  <Input
                    {...register("name")}
                    id={id + "-name"}
                    disabled={isPending}
                    maxLength={120}
                    placeholder="e.g. Read for 20 minutes"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      id +
                      "-name-help" +
                      (errors.name ? " " + id + "-name-error" : "")
                    }
                  />
                  <FieldDescription id={id + "-name-help"}>
                    Keep it specific and easy to start.
                  </FieldDescription>
                  {errors.name && (
                    <FieldError id={id + "-name-error"}>
                      {errors.name.message}
                    </FieldError>
                  )}
                </Field>
              </div>
              {iconPickerOpen && (
                <div
                  id={id + "-icon-picker"}
                  role="region"
                  aria-labelledby={id + "-icon-label"}
                  className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <FieldTitle id={id + "-icon-label"}>Habit icon</FieldTitle>
                    <span className="truncate text-xs text-muted-foreground">
                      {selectedIcon}
                    </span>
                  </div>
                  <InputGroup className="bg-background">
                    <InputGroupAddon>
                      <Search aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-label="Search habit icons"
                      disabled={isPending}
                      value={iconSearch}
                      onChange={(event) => setIconSearch(event.target.value)}
                      placeholder="Search icons…"
                    />
                  </InputGroup>
                  <div className="workspace-list-scrollbar grid max-h-44 grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1 overflow-y-auto">
                    {filteredIcons.map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        aria-label={"Use " + name + " icon"}
                        aria-pressed={selectedIcon === name}
                        disabled={isPending}
                        className={cn(
                          "flex min-h-11 items-center justify-center rounded-md outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50",
                          selectedIcon === name
                            ? "bg-emerald-500 text-white hover:bg-emerald-500"
                            : "text-muted-foreground",
                        )}
                        onClick={() =>
                          setValue("icon", name, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <Icon className="size-4" />
                      </button>
                    ))}
                  </div>
                  {!filteredIcons.length && (
                    <p className="py-3 text-center text-sm text-muted-foreground">
                      No icons match your search.
                    </p>
                  )}
                </div>
              )}
              {errors.icon && <FieldError>{errors.icon.message}</FieldError>}
            </div>

            <FieldSet className="gap-4 border-t pt-5">
              <FieldLegend className="mb-0 text-sm">Schedule</FieldLegend>
              <Field
                data-invalid={Boolean(errors.frequency)}
                data-disabled={isPending}
              >
                <FieldLabel htmlFor={id + "-frequency"}>Repeat</FieldLabel>
                <Controller
                  control={control}
                  name="frequency"
                  render={({ field }) => (
                    <Select
                      items={frequencies}
                      value={field.value}
                      disabled={isPending}
                      onValueChange={(value) => value && field.onChange(value)}
                    >
                      <SelectTrigger
                        id={id + "-frequency"}
                        className="w-full"
                        aria-invalid={Boolean(errors.frequency)}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {frequencies.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.frequency && (
                  <FieldError>{errors.frequency.message}</FieldError>
                )}
              </Field>
              {(frequency === "weekly" || frequency === "custom") && (
                <Field
                  data-invalid={Boolean(errors.schedule_days)}
                  data-disabled={isPending}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldTitle id={id + "-days-label"}>
                      Days of the week
                    </FieldTitle>
                    <div className="flex gap-1">
                      {dayPresets.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="ghost"
                          size="xs"
                          disabled={isPending}
                          onClick={() =>
                            setValue("schedule_days", preset.days, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <ToggleGroup
                    multiple
                    value={selectedDays}
                    disabled={isPending}
                    aria-labelledby={id + "-days-label"}
                    aria-invalid={Boolean(errors.schedule_days)}
                    aria-describedby={
                      errors.schedule_days ? id + "-days-error" : undefined
                    }
                    variant="outline"
                    spacing={1}
                    className="grid w-full grid-cols-7 justify-items-center"
                    onValueChange={(values) =>
                      setValue("schedule_days", values as HabitWeekday[], {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    {weekdays.map((day) => (
                      <ToggleGroupItem
                        key={day.value}
                        value={day.value}
                        aria-label={day.label}
                        title={day.label}
                        className={cn("aspect-square h-auto w-full max-w-11 min-w-0 px-0", chip)}
                      >
                        {day.short}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  {errors.schedule_days && (
                    <FieldError id={id + "-days-error"}>
                      {errors.schedule_days.message}
                    </FieldError>
                  )}
                </Field>
              )}
              {frequency === "monthly" && (
                <Field
                  data-invalid={Boolean(errors.schedule_dates)}
                  data-disabled={isPending}
                >
                  <FieldTitle id={id + "-dates-label"}>
                    Dates of the month
                  </FieldTitle>
                  <ToggleGroup
                    multiple
                    value={selectedDates.map(String)}
                    disabled={isPending}
                    aria-labelledby={id + "-dates-label"}
                    aria-invalid={Boolean(errors.schedule_dates)}
                    aria-describedby={
                      id +
                      "-dates-help" +
                      (errors.schedule_dates ? " " + id + "-dates-error" : "")
                    }
                    variant="outline"
                    spacing={1}
                    className="grid w-full grid-cols-7 justify-items-center"
                    onValueChange={(values) =>
                      setValue("schedule_dates", values.map(Number), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    {Array.from({ length: 31 }, (_, index) => index + 1).map(
                      (date) => (
                        <ToggleGroupItem
                          key={date}
                          value={String(date)}
                          aria-label={"Day " + date}
                          className={cn("aspect-square h-auto w-full max-w-11 min-w-0 px-0 tabular-nums", chip)}
                        >
                          {date}
                        </ToggleGroupItem>
                      ),
                    )}
                  </ToggleGroup>
                  <FieldDescription id={id + "-dates-help"}>
                    Dates that do not occur in a month are skipped.
                  </FieldDescription>
                  {errors.schedule_dates && (
                    <FieldError id={id + "-dates-error"}>
                      {errors.schedule_dates.message}
                    </FieldError>
                  )}
                </Field>
              )}
              <p
                className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
                aria-live="polite"
              >
                <CalendarCheck className="size-4 shrink-0" aria-hidden="true" />
                {scheduleSummary}
              </p>
            </FieldSet>

            <FieldSet className="gap-4 border-t pt-5">
              <FieldLegend className="mb-0 text-sm">Details</FieldLegend>
              <Field
                data-invalid={Boolean(errors.area_uuid)}
                data-disabled={isPending}
              >
                <FieldLabel htmlFor={id + "-area"}>
                  Area{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="area_uuid"
                  render={({ field }) => (
                    <Select
                      items={areaOptions}
                      value={field.value ?? "none"}
                      disabled={isPending || areasQuery.isLoading}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : value)
                      }
                    >
                      <SelectTrigger
                        id={id + "-area"}
                        className="w-full"
                        aria-invalid={Boolean(errors.area_uuid)}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {areaOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                {areasQuery.isError && (
                  <FieldDescription>
                    Areas could not be loaded.{" "}
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      disabled={isPending}
                      onClick={() => areasQuery.refetch()}
                    >
                      Try again
                    </Button>
                  </FieldDescription>
                )}
                {errors.area_uuid && (
                  <FieldError>{errors.area_uuid.message}</FieldError>
                )}
              </Field>
              <Field
                data-invalid={Boolean(errors.description)}
                data-disabled={isPending}
              >
                <FieldLabel htmlFor={id + "-description"}>
                  Description{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <Textarea
                  {...register("description")}
                  id={id + "-description"}
                  disabled={isPending}
                  className="min-h-20"
                  placeholder="A reminder of why this matters to you."
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description && (
                  <FieldError>{errors.description.message}</FieldError>
                )}
              </Field>
              <Field
                orientation="horizontal"
                data-disabled={isPending}
                className="items-center justify-between rounded-lg border p-3"
              >
                <FieldContent>
                  <FieldLabel htmlFor={id + "-active"}>Active habit</FieldLabel>
                  <FieldDescription>
                    Pause check-ins while keeping your history.
                  </FieldDescription>
                </FieldContent>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch
                      id={id + "-active"}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
              </Field>
            </FieldSet>
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
          <Separator />
          <DialogFooter className="shrink-0 px-5 py-4 sm:px-6">
            <DialogClose
              render={<Button type="button" variant="outline" />}
              disabled={isPending}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2
                  data-icon="inline-start"
                  className="animate-spin motion-reduce:animate-none"
                />
              )}
              {isPending ? "Saving…" : habit ? "Save changes" : "Add habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
