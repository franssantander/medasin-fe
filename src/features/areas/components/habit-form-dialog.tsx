"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarClock,
  CircleAlert,
  LoaderCircle,
  Repeat,
  Sparkles,
} from "lucide-react";
import { useEffect, useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError } from "@/lib/axios";
import {
  habitSchema,
  type HabitFormValues,
  type HabitResolvedValues,
} from "../schemas/area-schema";
import type { Habit, HabitFrequency, HabitInput, HabitWeekday } from "../type";
import { AreaIconPicker } from "./area-icon-picker";
import { AreaIcon } from "./area-icons";

const NAME_MAX_LENGTH = 120;
const DEFAULT_HABIT_ICON = "Flame";

type RepeatMode = "daily" | "days" | "monthly";

const repeatModes: { value: RepeatMode; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "days", label: "Specific days" },
  { value: "monthly", label: "Monthly" },
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
const weekdayOrder = weekdays.map((day) => day.value);

const dayPresets: { label: string; days: HabitWeekday[] }[] = [
  { label: "Weekdays", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
  { label: "Weekends", days: ["sunday", "saturday"] },
  { label: "Mon · Wed · Fri", days: ["monday", "wednesday", "friday"] },
];

const datePresets: { label: string; dates: number[] }[] = [
  { label: "1st", dates: [1] },
  { label: "15th", dates: [15] },
  { label: "1st & 15th", dates: [1, 15] },
];

const HABIT_SUGGESTED_ICONS = [
  "Flame",
  "Droplets",
  "GlassWater",
  "BookOpen",
  "Footprints",
  "Dumbbell",
  "Brain",
  "Bed",
  "Apple",
  "Salad",
  "Coffee",
  "NotebookPen",
  "Music",
  "Leaf",
  "Sun",
  "Moon",
  "Bike",
  "HeartPulse",
  "PiggyBank",
  "Timer",
] as const;

const starterIdeas: {
  name: string;
  icon: string;
  frequency: HabitFrequency;
  days?: HabitWeekday[];
}[] = [
  { name: "Drink water", icon: "GlassWater", frequency: "daily" },
  { name: "Read 20 minutes", icon: "BookOpen", frequency: "daily" },
  { name: "Walk 10 minutes", icon: "Footprints", frequency: "daily" },
  { name: "Meditate", icon: "Brain", frequency: "daily" },
  { name: "Work out", icon: "Dumbbell", frequency: "custom", days: ["monday", "wednesday", "friday"] },
  { name: "Review budget", icon: "PiggyBank", frequency: "custom", days: ["sunday"] },
];

const serverFieldNames: Record<string, keyof HabitFormValues> = {
  "schedule.days": "schedule_days",
  "schedule.dates": "schedule_dates",
};

function ordinal(value: number) {
  const suffix =
    value % 100 >= 11 && value % 100 <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[value % 10] ?? "th";
  return `${value}${suffix}`;
}

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function sortDays(days: HabitWeekday[]) {
  return [...days].sort((a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b));
}

function scheduleSummary(mode: RepeatMode, days: HabitWeekday[], dates: number[]) {
  if (mode === "daily") return "Every day · 7 times a week";
  if (mode === "days") {
    if (days.length === 0) return "Pick at least one day.";
    if (days.length === 7) return "Every day of the week · 7 times a week";
    const names = sortDays(days).map(
      (day) => day.charAt(0).toUpperCase() + day.slice(1, 3),
    );
    return `${names.join(", ")} · ${days.length} ${days.length === 1 ? "time" : "times"} a week`;
  }
  if (dates.length === 0) return "Pick at least one date.";
  return `On the ${listJoin([...dates].sort((a, b) => a - b).map(ordinal))} of each month`;
}

export function HabitFormDialog({
  open,
  onOpenChange,
  habit,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit;
  isPending: boolean;
  onSubmit: (input: HabitInput) => Promise<void>;
}) {
  const id = useId();
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<HabitFormValues, unknown, HabitResolvedValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: "",
      icon: DEFAULT_HABIT_ICON,
      description: "",
      frequency: "daily",
      schedule_days: [],
      schedule_dates: [],
      is_active: true,
    },
  });
  const name = useWatch({ control, name: "name" }) ?? "";
  const frequency = useWatch({ control, name: "frequency" }) ?? "daily";
  const selectedIcon = useWatch({ control, name: "icon" }) || DEFAULT_HABIT_ICON;
  const selectedDays = useWatch({ control, name: "schedule_days" }) ?? [];
  const selectedDates = useWatch({ control, name: "schedule_dates" }) ?? [];
  const mode: RepeatMode =
    frequency === "daily" ? "daily" : frequency === "monthly" ? "monthly" : "days";
  const summary = scheduleSummary(mode, selectedDays, selectedDates);

  useEffect(() => {
    if (!open) return;
    reset({
      name: habit?.name ?? "",
      icon: habit?.icon || DEFAULT_HABIT_ICON,
      description: habit?.description ?? "",
      frequency: habit?.frequency ?? "daily",
      schedule_days: habit?.schedule?.days ?? [],
      schedule_dates: habit?.schedule?.dates ?? [],
      is_active: habit?.is_active ?? true,
    });
  }, [habit, open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      const schedule =
        values.frequency === "daily"
          ? null
          : values.frequency === "monthly"
            ? { dates: [...values.schedule_dates].sort((a, b) => a - b) }
            : { days: sortDays(values.schedule_days) };
      await onSubmit({
        name: values.name,
        icon: values.icon || DEFAULT_HABIT_ICON,
        description: values.description,
        frequency: values.frequency,
        schedule,
        is_active: values.is_active,
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        Object.entries(error.validationErrors).forEach(([field, messages]) =>
          setError(serverFieldNames[field] ?? (field as keyof HabitFormValues), {
            message: messages[0],
          }),
        );
      } else setError("root", { message: "The habit could not be saved." });
    }
  });

  const changeMode = (next: RepeatMode) => {
    const nextFrequency: HabitFrequency =
      next === "daily"
        ? "daily"
        : next === "monthly"
          ? "monthly"
          : habit?.frequency === "weekly"
            ? "weekly"
            : "custom";
    setValue("frequency", nextFrequency, { shouldDirty: true, shouldValidate: true });
  };
  const setDays = (days: HabitWeekday[]) =>
    setValue("schedule_days", days, { shouldDirty: true, shouldValidate: true });
  const setDates = (dates: number[]) =>
    setValue("schedule_dates", dates, { shouldDirty: true, shouldValidate: true });
  const applyIdea = (idea: (typeof starterIdeas)[number]) => {
    setValue("name", idea.name, { shouldDirty: true, shouldValidate: true });
    setValue("icon", idea.icon, { shouldDirty: true });
    setValue("frequency", idea.frequency, { shouldDirty: true });
    setDays(idea.days ?? []);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !isPending && onOpenChange(next)}
    >
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 flex-row items-center gap-3 border-b px-5 py-5 pr-12 sm:px-6 sm:pr-12">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400"
            aria-hidden="true"
          >
            <AreaIcon name={selectedIcon} className="size-5" />
          </div>
          <div className="grid gap-1">
            <DialogTitle>{habit ? "Edit habit" : "Add habit"}</DialogTitle>
            <DialogDescription>
              Small and repeatable beats big and occasional.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form
          id="habit-form"
          onSubmit={submit}
          className="min-h-0 overflow-y-auto overscroll-contain"
        >
          <FieldGroup className="gap-6 p-5 sm:p-6">
            {errors.root?.message && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor={`${id}-name`}>Habit name</FieldLabel>
              <Input
                {...register("name")}
                id={`${id}-name`}
                autoFocus
                maxLength={NAME_MAX_LENGTH}
                placeholder="e.g. Read for 20 minutes"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={`${id}-name-hint`}
              />
              <div className="flex items-start justify-between gap-3">
                {errors.name ? (
                  <FieldError id={`${id}-name-hint`}>{errors.name.message}</FieldError>
                ) : (
                  <FieldDescription id={`${id}-name-hint`}>
                    Keep it small enough to do on a busy day.
                  </FieldDescription>
                )}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {name.length}/{NAME_MAX_LENGTH}
                </span>
              </div>
              {!habit && !name.trim() && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="mr-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    Need an idea?
                  </span>
                  {starterIdeas.map((idea) => (
                    <Button
                      key={idea.name}
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => applyIdea(idea)}
                    >
                      <AreaIcon name={idea.icon} />
                      {idea.name}
                    </Button>
                  ))}
                </div>
              )}
            </Field>

            <div className="grid gap-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
              <Field data-invalid={Boolean(errors.icon)}>
                <FieldLabel htmlFor={`${id}-icon`}>Icon</FieldLabel>
                <AreaIconPicker
                  id={`${id}-icon`}
                  value={selectedIcon}
                  fallback={DEFAULT_HABIT_ICON}
                  suggested={HABIT_SUGGESTED_ICONS}
                  invalid={Boolean(errors.icon)}
                  onChange={(icon) =>
                    setValue("icon", icon, { shouldDirty: true, shouldValidate: true })
                  }
                />
                {errors.icon && <FieldError>{errors.icon.message}</FieldError>}
              </Field>

              <Field data-invalid={Boolean(errors.description)}>
                <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
                <Textarea
                  {...register("description")}
                  id={`${id}-description`}
                  rows={3}
                  placeholder="Why does this habit matter?"
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description ? (
                  <FieldError>{errors.description.message}</FieldError>
                ) : (
                  <FieldDescription>
                    Optional. A reason helps on hard days.
                  </FieldDescription>
                )}
              </Field>
            </div>

            <section
              aria-labelledby={`${id}-schedule`}
              className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:p-5"
            >
              <div className="flex items-start gap-2.5">
                <CalendarClock
                  className="mt-0.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="grid gap-0.5">
                  <h3 id={`${id}-schedule`} className="text-sm font-semibold">
                    Schedule
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Check-ins and streaks only count on scheduled days.
                  </p>
                </div>
              </div>

              <Field data-invalid={Boolean(errors.frequency)}>
                <FieldLabel id={`${id}-repeat-label`}>Repeat</FieldLabel>
                <ToggleGroup
                  variant="outline"
                  spacing={0}
                  aria-labelledby={`${id}-repeat-label`}
                  value={[mode]}
                  onValueChange={(values) => {
                    const next = values[0] as RepeatMode | undefined;
                    if (next) changeMode(next);
                  }}
                  className="w-full bg-background"
                >
                  {repeatModes.map((item) => (
                    <ToggleGroupItem
                      key={item.value}
                      value={item.value}
                      className="flex-1 font-normal text-muted-foreground aria-pressed:font-medium aria-pressed:text-foreground"
                    >
                      {item.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {errors.frequency && <FieldError>{errors.frequency.message}</FieldError>}
              </Field>

              {mode === "days" && (
                <Field data-invalid={Boolean(errors.schedule_days)}>
                  <FieldLabel id={`${id}-days-label`}>On these days</FieldLabel>
                  <ToggleGroup
                    multiple
                    variant="outline"
                    spacing={1}
                    aria-labelledby={`${id}-days-label`}
                    value={selectedDays}
                    onValueChange={(values) => setDays(values as HabitWeekday[])}
                    className="w-full justify-between"
                  >
                    {weekdays.map((day) => (
                      <ToggleGroupItem
                        key={day.value}
                        value={day.value}
                        aria-label={day.label}
                        title={day.label}
                        className="size-10 min-w-0 rounded-full bg-background p-0 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                      >
                        {day.short}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <div className="flex flex-wrap gap-1">
                    {dayPresets.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground"
                        onClick={() => setDays(preset.days)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  {errors.schedule_days && (
                    <FieldError>{errors.schedule_days.message}</FieldError>
                  )}
                </Field>
              )}

              {mode === "monthly" && (
                <Field data-invalid={Boolean(errors.schedule_dates)}>
                  <FieldLabel id={`${id}-dates-label`}>On these dates</FieldLabel>
                  <ToggleGroup
                    multiple
                    variant="outline"
                    spacing={1}
                    aria-labelledby={`${id}-dates-label`}
                    value={selectedDates.map(String)}
                    onValueChange={(values) => setDates(values.map(Number))}
                    className="grid w-full grid-cols-7"
                  >
                    {Array.from({ length: 31 }, (_, index) => index + 1).map((date) => (
                      <ToggleGroupItem
                        key={date}
                        value={String(date)}
                        aria-label={`Day ${date}`}
                        className="h-9 min-w-0 bg-background px-0 tabular-nums aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                      >
                        {date}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <div className="flex flex-wrap gap-1">
                    {datePresets.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground"
                        onClick={() => setDates(preset.dates)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  {selectedDates.some((date) => date >= 29) && (
                    <FieldDescription>Months without that date are skipped.</FieldDescription>
                  )}
                  {errors.schedule_dates && (
                    <FieldError>{errors.schedule_dates.message}</FieldError>
                  )}
                </Field>
              )}

              <p
                className="flex items-center gap-2 text-sm text-muted-foreground"
                aria-live="polite"
              >
                <Repeat className="size-4 shrink-0" aria-hidden="true" />
                <span>{summary}</span>
              </p>
            </section>

            {habit && (
              <Field
                orientation="horizontal"
                className="items-center justify-between rounded-lg border bg-background p-3"
              >
                <FieldContent>
                  <FieldLabel htmlFor={`${id}-active`}>Track this habit</FieldLabel>
                  <FieldDescription>
                    Paused habits keep their history but don&apos;t ask for check-ins.
                  </FieldDescription>
                </FieldContent>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch
                      id={`${id}-active`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
              </Field>
            )}
          </FieldGroup>
        </form>

        <DialogFooter className="shrink-0 border-t bg-popover px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            form="habit-form"
            type="submit"
            className="w-full sm:w-auto"
            disabled={isPending}
          >
            {isPending && <LoaderCircle className="animate-spin" />}
            {isPending ? "Saving…" : habit ? "Save changes" : "Add habit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
