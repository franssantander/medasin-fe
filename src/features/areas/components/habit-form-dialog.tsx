"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { StarCheck, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";
import {
  habitSchema,
  type HabitFormValues,
  type HabitResolvedValues,
} from "../schemas/area-schema";
import type { Habit, HabitFrequency, HabitInput, HabitWeekday } from "../type";
import { AREA_ICONS, AreaIcon } from "./area-icons";
import { FormField } from "./form-field";

const frequencies: { value: HabitFrequency; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Weekly schedule" },
  { value: "custom", label: "Selected weekdays" },
  { value: "monthly", label: "Selected dates monthly" },
];
const weekdays: { value: HabitWeekday; short: string }[] = [
  { value: "sunday", short: "S" },
  { value: "monday", short: "M" },
  { value: "tuesday", short: "T" },
  { value: "wednesday", short: "W" },
  { value: "thursday", short: "T" },
  { value: "friday", short: "F" },
  { value: "saturday", short: "S" },
];

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
  const [iconSearch, setIconSearch] = useState("");
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
      icon: "StartCheck",
      description: "",
      frequency: "daily",
      schedule_days: [],
      schedule_dates: [],
      is_active: true,
    },
  });
  const frequency = useWatch({ control, name: "frequency" });
  const selectedIcon = useWatch({ control, name: "icon" });
  const selectedDays = useWatch({ control, name: "schedule_days" }) ?? [];
  const selectedDates = useWatch({ control, name: "schedule_dates" }) ?? [];
  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    return query
      ? AREA_ICONS.filter(({ name }) => name.toLowerCase().includes(query))
      : AREA_ICONS;
  }, [iconSearch]);

  useEffect(() => {
    if (!open) return;
    reset({
      name: habit?.name ?? "",
      icon: habit?.icon || "StarCheck",
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
            : { days: values.schedule_days };
      await onSubmit({
        name: values.name,
        icon: values.icon || "StarCheck",
        description: values.description,
        frequency: values.frequency,
        schedule,
        is_active: values.is_active,
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        Object.entries(error.validationErrors).forEach(([field, messages]) =>
          setError(field as keyof HabitFormValues, { message: messages[0] }),
        );
      } else setError("root", { message: "The habit could not be saved." });
    }
  });

  const toggleDay = (day: HabitWeekday) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((item) => item !== day)
      : [...selectedDays, day];
    setValue("schedule_days", next, { shouldValidate: true });
  };
  const toggleDate = (date: number) =>
    setValue(
      "schedule_dates",
      selectedDates.includes(date)
        ? selectedDates.filter((item) => item !== date)
        : [...selectedDates, date],
      { shouldValidate: true },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !isPending && onOpenChange(next)}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <StarCheck className="size-5" />
          </div>
          <DialogTitle>{habit ? "Edit habit" : "Add habit"}</DialogTitle>
          <DialogDescription>
            Define when this habit counts so every check-in and streak stays
            meaningful.
          </DialogDescription>
        </DialogHeader>
        <form id="habit-form" onSubmit={submit} className="grid gap-5">
          <FormField label="Habit name" error={errors.name?.message}>
            <Input
              {...register("name")}
              autoFocus
              placeholder="e.g. Read for 20 minutes"
            />
          </FormField>
          <FormField label="Icon" error={errors.icon?.message}>
            <div className="overflow-hidden rounded-xl border">
              <div className="flex items-center gap-3 border-b p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <AreaIcon
                    name={selectedIcon || "StarCheck"}
                    className="size-3.5"
                  />
                </div>
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={iconSearch}
                    onChange={(event) => setIconSearch(event.target.value)}
                    placeholder={`Search ${AREA_ICONS.length} Lucide icons…`}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid max-h-48 grid-cols-[repeat(auto-fill,2rem)] justify-between gap-1 overflow-y-auto p-3">
                {filteredIcons.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    aria-label={`Use ${name} icon`}
                    aria-pressed={(selectedIcon || "StarCheck") === name}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    onClick={() =>
                      setValue("icon", name, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
              {filteredIcons.length === 0 && (
                <p className="px-3 pb-4 text-center text-sm text-muted-foreground">
                  No icons match “{iconSearch}”.
                </p>
              )}
            </div>
          </FormField>
          <FormField label="Description" error={errors.description?.message}>
            <Textarea
              {...register("description")}
              className="min-h-20"
              placeholder="Why does this habit matter?"
            />
          </FormField>
          <FormField label="Frequency" error={errors.frequency?.message}>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <Select
                  items={frequencies}
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {frequencies.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {(frequency === "weekly" || frequency === "custom") && (
            <FormField
              label="Days of the week"
              error={errors.schedule_days?.message}
            >
              <div className="grid grid-cols-7 gap-2">
                {weekdays.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    size="sm"
                    variant={
                      selectedDays.includes(day.value) ? "default" : "outline"
                    }
                    className="px-0"
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            </FormField>
          )}
          {frequency === "monthly" && (
            <FormField
              label="Dates of the month"
              error={errors.schedule_dates?.message}
            >
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 31 }, (_, index) => index + 1).map(
                  (date) => (
                    <button
                      key={date}
                      type="button"
                      className={cn(
                        "h-8 rounded-md border text-xs transition-colors",
                        selectedDates.includes(date)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-accent",
                      )}
                      onClick={() => toggleDate(date)}
                    >
                      {date}
                    </button>
                  ),
                )}
              </div>
            </FormField>
          )}
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                />
                <span>
                  <span className="block font-medium">Active habit</span>
                  <span className="text-muted-foreground">
                    Paused habits keep their history but do not request
                    check-ins.
                  </span>
                </span>
              </label>
            )}
          />
          {errors.root?.message && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button form="habit-form" type="submit" disabled={isPending}>
            {isPending ? "Saving…" : habit ? "Save changes" : "Add habit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
