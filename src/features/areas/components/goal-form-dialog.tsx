"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfYear,
  format,
  formatDistanceStrict,
  startOfDay,
} from "date-fns";
import { CalendarRange, CircleAlert, LoaderCircle } from "lucide-react";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProjectDateField } from "@/features/projects/components/project-date-field";
import { ApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";
import {
  goalStatusIcons,
  goalStatusOptions,
  goalStatusTintClassNames,
  parseGoalDate,
} from "../goal-status";
import { goalSchema, type GoalFormValues } from "../schemas/area-schema";
import type { Goal, GoalInput, GoalStatus } from "../type";
import { AreaIconPicker } from "./area-icon-picker";
import { AreaIcon } from "./area-icons";

const TITLE_MAX_LENGTH = 120;
const DEFAULT_GOAL_ICON = "Star";

const GOAL_SUGGESTED_ICONS = [
  "Target",
  "Trophy",
  "Flag",
  "Mountain",
  "Rocket",
  "Star",
  "Medal",
  "Award",
  "CircleCheckBig",
  "Footprints",
  "Dumbbell",
  "PiggyBank",
  "BookOpen",
  "GraduationCap",
  "Heart",
  "Briefcase",
  "Lightbulb",
  "Sprout",
  "Compass",
  "Zap",
] as const;

const duePresets: { label: string; from: (base: Date) => Date }[] = [
  { label: "In 1 week", from: (base) => addWeeks(base, 1) },
  { label: "In 1 month", from: (base) => addMonths(base, 1) },
  { label: "In 3 months", from: (base) => addMonths(base, 3) },
  { label: "End of year", from: (base) => endOfYear(base) },
];

function timelineSummary(start?: Date, due?: Date) {
  if (!due) return "Add a due date to track the time remaining.";
  if (start) {
    const days = differenceInCalendarDays(due, start);
    if (days < 0) return null;
    return `Spans ${formatDistanceStrict(due, start, { unit: days >= 60 ? "month" : "day" })} · ${days} ${days === 1 ? "day" : "days"}`;
  }
  const days = differenceInCalendarDays(due, startOfDay(new Date()));
  if (days < 0) return `Due date is ${-days} ${days === -1 ? "day" : "days"} ago`;
  if (days === 0) return "Due today";
  return `Due in ${days} ${days === 1 ? "day" : "days"}`;
}

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
  isPending: boolean;
  onSubmit: (input: GoalInput) => Promise<void>;
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
  } = useForm<GoalFormValues, unknown, GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      icon: DEFAULT_GOAL_ICON,
      description: "",
      status: "pending",
      start_date: "",
      due_date: "",
    },
  });
  const title = useWatch({ control, name: "title" }) ?? "";
  const selectedIcon = useWatch({ control, name: "icon" }) || DEFAULT_GOAL_ICON;
  const status = (useWatch({ control, name: "status" }) ?? "pending") as GoalStatus;
  const startDate = parseGoalDate(useWatch({ control, name: "start_date" }));
  const dueDate = parseGoalDate(useWatch({ control, name: "due_date" }));
  const summary = timelineSummary(startDate, dueDate);

  useEffect(() => {
    if (open) {
      reset({
        title: goal?.title ?? "",
        icon: goal?.icon || DEFAULT_GOAL_ICON,
        description: goal?.description ?? "",
        status: goal?.status ?? "pending",
        start_date: goal?.start_date?.slice(0, 10) ?? "",
        due_date: goal?.due_date?.slice(0, 10) ?? "",
      });
    }
  }, [goal, open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({ ...values, icon: values.icon || DEFAULT_GOAL_ICON });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        Object.entries(error.validationErrors).forEach(([field, messages]) => {
          setError(field as keyof GoalFormValues, { message: messages[0] });
        });
        return;
      }

      setError("root", { message: "The goal could not be saved." });
    }
  });

  const applyDuePreset = (preset: (typeof duePresets)[number]) =>
    setValue(
      "due_date",
      format(preset.from(startDate ?? startOfDay(new Date())), "yyyy-MM-dd"),
      { shouldDirty: true, shouldValidate: true },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 flex-row items-center gap-3 border-b px-5 py-5 pr-12 sm:px-6 sm:pr-12">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              goalStatusTintClassNames[status],
            )}
            aria-hidden="true"
          >
            <AreaIcon name={selectedIcon} className="size-5" />
          </div>
          <div className="grid gap-1">
            <DialogTitle>{goal ? "Edit goal" : "Add goal"}</DialogTitle>
            <DialogDescription>
              {goal
                ? "Update the details and keep its progress accurate."
                : "Name a clear outcome and give it a realistic timeline."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <form
          id="goal-form"
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

            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
              <Input
                {...register("title")}
                id={`${id}-title`}
                autoFocus
                maxLength={TITLE_MAX_LENGTH}
                placeholder="What do you want to accomplish?"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={`${id}-title-hint`}
              />
              <div className="flex items-start justify-between gap-3">
                {errors.title ? (
                  <FieldError id={`${id}-title-hint`}>{errors.title.message}</FieldError>
                ) : (
                  <FieldDescription id={`${id}-title-hint`}>
                    Make it specific, like &ldquo;Save a 6-month emergency fund&rdquo;.
                  </FieldDescription>
                )}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {title.length}/{TITLE_MAX_LENGTH}
                </span>
              </div>
            </Field>

            <div className="grid gap-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
              <Field data-invalid={Boolean(errors.icon)}>
                <FieldLabel htmlFor={`${id}-icon`}>Icon</FieldLabel>
                <AreaIconPicker
                  id={`${id}-icon`}
                  value={selectedIcon}
                  fallback={DEFAULT_GOAL_ICON}
                  suggested={GOAL_SUGGESTED_ICONS}
                  invalid={Boolean(errors.icon)}
                  onChange={(icon) =>
                    setValue("icon", icon, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                {errors.icon && <FieldError>{errors.icon.message}</FieldError>}
              </Field>

              <Field data-invalid={Boolean(errors.status)}>
                <FieldLabel id={`${id}-status-label`}>Status</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <ToggleGroup
                      variant="outline"
                      spacing={1}
                      aria-labelledby={`${id}-status-label`}
                      value={[field.value]}
                      onValueChange={(values) => {
                        const next = values[0];
                        if (next) field.onChange(next);
                      }}
                      className="w-full flex-wrap"
                    >
                      {goalStatusOptions.map((option) => {
                        const Icon = goalStatusIcons[option.value];
                        return (
                          <ToggleGroupItem
                            key={option.value}
                            value={option.value}
                            className="flex-1 gap-1.5 px-2.5 font-normal text-muted-foreground aria-pressed:font-medium aria-pressed:text-foreground"
                          >
                            <Icon aria-hidden="true" />
                            {option.label}
                          </ToggleGroupItem>
                        );
                      })}
                    </ToggleGroup>
                  )}
                />
                {errors.status && <FieldError>{errors.status.message}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
              <Textarea
                {...register("description")}
                id={`${id}-description`}
                rows={3}
                placeholder="Add context, motivation, or a definition of success…"
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description ? (
                <FieldError>{errors.description.message}</FieldError>
              ) : (
                <FieldDescription>
                  Optional. What does success look like, and why does it matter?
                </FieldDescription>
              )}
            </Field>

            <section
              aria-labelledby={`${id}-timeline`}
              className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:p-5"
            >
              <div className="flex items-start gap-2.5">
                <CalendarRange
                  className="mt-0.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="grid gap-0.5">
                  <h3 id={`${id}-timeline`} className="text-sm font-semibold">
                    Timeline
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Optional. Dates turn on the progress bar in the tracker.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="start_date"
                  render={({ field }) => (
                    <ProjectDateField
                      id={`${id}-start`}
                      label="Start date"
                      placeholder="Pick a start date"
                      value={field.value ?? ""}
                      error={errors.start_date?.message}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="due_date"
                  render={({ field }) => (
                    <ProjectDateField
                      id={`${id}-due`}
                      label="Due date"
                      placeholder="Pick a due date"
                      value={field.value ?? ""}
                      min={startDate}
                      error={errors.due_date?.message}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs text-muted-foreground">
                  Quick due date
                </span>
                {duePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="xs"
                    className="bg-background"
                    onClick={() => applyDuePreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {summary && (
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {summary}
                </p>
              )}
            </section>
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
            form="goal-form"
            type="submit"
            className="w-full sm:w-auto"
            disabled={isPending}
          >
            {isPending && <LoaderCircle className="animate-spin" />}
            {isPending ? "Saving…" : goal ? "Save changes" : "Add goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
