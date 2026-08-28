"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
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
import { goalSchema, type GoalFormValues } from "../schemas/area-schema";
import type { Goal, GoalInput, GoalStatus } from "../type";
import { AREA_ICONS, AreaIcon } from "./area-icons";
import { FormField } from "./form-field";

const goalStatuses: { value: GoalStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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
  const [iconSearch, setIconSearch] = useState("");
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
      icon: "Target",
      description: "",
      status: "pending",
      start_date: "",
      due_date: "",
    },
  });
  const startDate = useWatch({ control, name: "start_date" });
  const selectedIcon = useWatch({ control, name: "icon" });
  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    return query
      ? AREA_ICONS.filter(({ name }) => name.toLowerCase().includes(query))
      : AREA_ICONS;
  }, [iconSearch]);

  useEffect(() => {
    if (open) {
      reset({
        title: goal?.title ?? "",
        icon: goal?.icon || "Target",
        description: goal?.description ?? "",
        status: goal?.status ?? "pending",
        start_date: goal?.start_date?.slice(0, 10) ?? "",
        due_date: goal?.due_date?.slice(0, 10) ?? "",
      });
    }
  }, [goal, open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({ ...values, icon: values.icon || "Target" });
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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <AreaIcon name={selectedIcon || "Target"} className="size-5" />
          </div>
          <DialogTitle>{goal ? "Edit goal" : "Add goal"}</DialogTitle>
          <DialogDescription>
            {goal
              ? "Update the goal details and keep its progress accurate."
              : "Define a clear outcome and give it a realistic timeline."}
          </DialogDescription>
        </DialogHeader>

        <form id="goal-form" onSubmit={submit} className="grid gap-5">
          <FormField label="Title" error={errors.title?.message}>
            <Input
              {...register("title")}
              autoFocus
              placeholder="What do you want to accomplish?"
              aria-invalid={Boolean(errors.title)}
            />
          </FormField>

          <FormField label="Icon" error={errors.icon?.message}>
            <div className="overflow-hidden rounded-xl border">
              <div className="flex items-center gap-3 border-b p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <AreaIcon
                    name={selectedIcon || "Target"}
                    className="size-4"
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
              <div className="grid max-h-48 grid-cols-7 gap-1 overflow-y-auto p-3 sm:grid-cols-9">
                {filteredIcons.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    aria-label={`Use ${name} icon`}
                    aria-pressed={(selectedIcon || "Target") === name}
                    className="flex aspect-square items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
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
              className="min-h-24 resize-y"
              placeholder="Add context, motivation, or a definition of success…"
              aria-invalid={Boolean(errors.description)}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Status" error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    items={goalStatuses}
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value)}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={Boolean(errors.status)}
                    >
                      <SelectValue placeholder="Choose a status" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {goalStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start date" error={errors.start_date?.message}>
                <Input
                  {...register("start_date")}
                  type="date"
                  aria-invalid={Boolean(errors.start_date)}
                />
              </FormField>
              <FormField label="Due date" error={errors.due_date?.message}>
                <Input
                  {...register("due_date")}
                  type="date"
                  min={startDate || undefined}
                  aria-invalid={Boolean(errors.due_date)}
                />
              </FormField>
            </div>
          </div>

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
          <Button form="goal-form" type="submit" disabled={isPending}>
            {isPending ? "Saving…" : goal ? "Save changes" : "Add goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
