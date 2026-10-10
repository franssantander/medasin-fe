"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInCalendarDays, format } from "date-fns";
import { CalendarDays, Inbox, Layers, Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AreaIcon } from "@/features/areas/components/area-icons";
import { useAreasQuery } from "@/features/areas/queries/area-query";
import { ApiError } from "@/lib/axios";
import { PlanLimitAlert } from "@/features/subscription/components/plan-limit-alert";
import { isPlanLimitError } from "@/features/subscription/plan-limit-error";
import {
  projectSchema,
  type ProjectFormValues,
} from "../schemas/project-schema";
import type { ProjectInput, ProjectListCard } from "../type";
import {
  isHexColor,
  ProjectAppearanceField,
  type ProjectAppearanceTab,
} from "./project-appearance-field";
import { parseDateKey, ProjectDateField } from "./project-date-field";
import { ProjectIcon, projectBadgeStyle } from "./project-icons";

type AreaMode = ProjectFormValues["area_mode"];

function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

function timelineHint(start?: Date, due?: Date) {
  if (start && due && due >= start) {
    const days = differenceInCalendarDays(due, start) + 1;
    if (days === 1) return "A one-day project.";
    const weeks = Math.round(days / 7);
    return `Runs ${plural(days, "day")}${days >= 14 ? ` (about ${plural(weeks, "week")})` : ""}.`;
  }
  if (due) {
    const left = differenceInCalendarDays(due, new Date());
    if (left === 0) return "Due today.";
    return left > 0
      ? `Due in ${plural(left, "day")}.`
      : `This due date was ${plural(-left, "day")} ago.`;
  }
  return "Both dates are optional.";
}

function timelineLabel(start?: Date, due?: Date) {
  if (start && due) return `${format(start, "MMM d")} – ${format(due, "MMM d, yyyy")}`;
  if (due) return `Due ${format(due, "MMM d, yyyy")}`;
  if (start) return `Starts ${format(start, "MMM d, yyyy")}`;
  return null;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectListCard;
  isPending: boolean;
  onSubmit: (input: ProjectInput) => Promise<void>;
}) {
  const [appearanceTab, setAppearanceTab] =
    useState<ProjectAppearanceTab>("icon");
  const [quotaError, setQuotaError] = useState<ApiError | null>(null);
  const quotaAlertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (quotaError) quotaAlertRef.current?.focus();
  }, [quotaError]);
  const areasQuery = useAreasQuery("active");
  const areas = areasQuery.data?.data ?? [];
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "Rocket",
      background: "#000000",
      start_date: "",
      due_date: "",
      area_mode: "inbox",
      area_uuid: "",
      area_name: "",
    },
  });
  const [
    name,
    areaMode,
    selectedIcon,
    badgeColor,
    selectedAreaUuid,
    newAreaName,
    startDate,
    dueDate,
  ] = useWatch({
    control,
    name: [
      "name",
      "area_mode",
      "icon",
      "background",
      "area_uuid",
      "area_name",
      "start_date",
      "due_date",
    ],
  });
  const selectedArea =
    areas.find((area) => area.uuid === selectedAreaUuid) ??
    (project?.area && project.area.uuid === selectedAreaUuid
      ? project.area
      : undefined);
  const start = parseDateKey(startDate);
  const due = parseDateKey(dueDate);
  const previewArea =
    areaMode === "existing"
      ? selectedArea
        ? { name: selectedArea.name, icon: selectedArea.icon }
        : null
      : areaMode === "new"
        ? { name: newAreaName?.trim() || "New area", icon: null }
        : null;
  const previewTimeline = timelineLabel(start, due);

  useEffect(() => {
    if (!open) return;

    reset({
      name: project?.name ?? "",
      description: project?.description ?? "",
      icon: project?.icon ?? "Rocket",
      background: project?.background ?? "#000000",
      start_date: project?.start_date ?? "",
      due_date: project?.due_date ?? "",
      area_mode: project?.area ? "existing" : "inbox",
      area_uuid: project?.area?.uuid ?? "",
      area_name: "",
    });
  }, [open, project, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAppearanceTab("icon");
      setQuotaError(null);
    }
    onOpenChange(nextOpen);
  };

  const update = (
    field: "icon" | "background" | "start_date" | "due_date" | "area_uuid",
    value: string,
  ) =>
    setValue(field, value, { shouldDirty: true, shouldValidate: isSubmitted });

  const changeAreaMode = (mode: AreaMode) =>
    setValue("area_mode", mode, { shouldDirty: true });

  const submit = handleSubmit(
    async (values) => {
      setQuotaError(null);
      const input: ProjectInput = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        icon: values.icon?.trim() || null,
        background: values.background,
        start_date: values.start_date || null,
        due_date: values.due_date || null,
        ...(values.area_mode === "existing"
          ? { area_uuid: values.area_uuid }
          : values.area_mode === "new"
            ? { area_name: values.area_name?.trim() }
            : {}),
      };

      try {
        await onSubmit(input);
        handleOpenChange(false);
      } catch (error) {
        if (isPlanLimitError(error)) {
          setQuotaError(error);
        } else if (error instanceof ApiError && error.validationErrors) {
          Object.entries(error.validationErrors).forEach(([field, messages]) => {
            setError(field as keyof ProjectFormValues, { message: messages[0] });
          });
          if (error.validationErrors.background) setAppearanceTab("color");
        }
      }
    },
    (formErrors) => {
      if (formErrors.background) setAppearanceTab("color");
    },
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(92dvh,52rem)] max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 py-4 pr-14">
          <DialogTitle>{project ? "Edit project" : "Create project"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Update the details, timeline, area, and look of this project."
              : "Give it a clear outcome and a timeline. You can change any of this later."}
          </DialogDescription>
        </DialogHeader>
        <Separator />

        <form
          id="project-form"
          onSubmit={submit}
          noValidate
          className="workspace-list-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
        >
          <FieldGroup className="gap-6">
            {quotaError && (
              <div ref={quotaAlertRef} tabIndex={-1}>
                <PlanLimitAlert error={quotaError}>
                  {project && (
                    <p>Project details were saved, but the new Area was not created.</p>
                  )}
                </PlanLimitAlert>
              </div>
            )}

            <div
              aria-hidden="true"
              className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3"
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-colors motion-reduce:transition-none"
                style={projectBadgeStyle(isHexColor(badgeColor) ? badgeColor : "#000000")}
              >
                <ProjectIcon name={selectedIcon} className="size-5" />
              </div>
              <div className="grid min-w-0 flex-1 gap-1">
                <p
                  className={
                    name?.trim()
                      ? "truncate text-sm font-semibold"
                      : "truncate text-sm font-semibold text-muted-foreground/70"
                  }
                >
                  {name?.trim() || "Untitled project"}
                </p>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {previewArea ? (
                    <span className="inline-flex h-5 max-w-full items-center gap-1 rounded-md bg-background px-1.5 ring-1 ring-foreground/10">
                      <AreaIcon name={previewArea.icon} className="size-3 shrink-0" />
                      <span className="truncate">{previewArea.name}</span>
                    </span>
                  ) : (
                    <span className="inline-flex h-5 items-center gap-1">
                      <Inbox className="size-3 shrink-0" />
                      Inbox
                    </span>
                  )}
                  {previewTimeline && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3 shrink-0" />
                      {previewTimeline}
                    </span>
                  )}
                </div>
              </div>
              <span className="self-start text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground/70">
                Preview
              </span>
            </div>

            <Field data-invalid={Boolean(errors.name)} className="gap-2">
              <FieldLabel htmlFor="project-name">Name</FieldLabel>
              <Input
                {...register("name")}
                id="project-name"
                maxLength={120}
                placeholder="Launch a portfolio, plan a trip…"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "project-name-error" : undefined}
              />
              {errors.name && (
                <FieldError id="project-name-error">{errors.name.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={Boolean(errors.description)} className="gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <FieldLabel htmlFor="project-description">Description</FieldLabel>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <Textarea
                {...register("description")}
                id="project-description"
                className="min-h-20"
                placeholder="What does completing this project look like?"
                aria-invalid={Boolean(errors.description)}
                aria-describedby={
                  errors.description ? "project-description-error" : undefined
                }
              />
              {errors.description && (
                <FieldError id="project-description-error">
                  {errors.description.message}
                </FieldError>
              )}
            </Field>

            <FieldSet className="gap-3">
              <FieldLegend variant="label" className="mb-0">
                Timeline
              </FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <ProjectDateField
                  id="project-start-date"
                  label="Start date"
                  placeholder="No start date"
                  value={startDate}
                  max={due}
                  error={errors.start_date?.message}
                  onChange={(value) => update("start_date", value)}
                />
                <ProjectDateField
                  id="project-due-date"
                  label="Due date"
                  placeholder="No due date"
                  value={dueDate}
                  min={start}
                  error={errors.due_date?.message}
                  onChange={(value) => update("due_date", value)}
                />
              </div>
              <FieldDescription className="text-xs">
                {timelineHint(start, due)}
              </FieldDescription>
            </FieldSet>

            <FieldSet className="gap-3">
              <FieldLegend id="project-area-legend" variant="label" className="mb-0">
                Area
              </FieldLegend>
              <ToggleGroup
                aria-label="Area source"
                variant="outline"
                spacing={0}
                value={[areaMode]}
                onValueChange={(value) => {
                  const next = value[0] as AreaMode | undefined;
                  if (next) changeAreaMode(next);
                }}
                className="grid w-full grid-cols-3"
              >
                <ToggleGroupItem value="inbox" className="min-w-0 px-1.5 text-muted-foreground aria-pressed:text-foreground sm:px-2.5">
                  <Inbox className="max-sm:hidden" />
                  Inbox
                </ToggleGroupItem>
                <ToggleGroupItem value="existing" className="min-w-0 px-1.5 text-muted-foreground aria-pressed:text-foreground sm:px-2.5">
                  <Layers className="max-sm:hidden" />
                  Existing area
                </ToggleGroupItem>
                <ToggleGroupItem value="new" className="min-w-0 px-1.5 text-muted-foreground aria-pressed:text-foreground sm:px-2.5">
                  <Plus className="max-sm:hidden" />
                  New area
                </ToggleGroupItem>
              </ToggleGroup>

              {areaMode === "inbox" ? (
                <FieldDescription className="text-xs">
                  Projects without an area stay in Inbox. You can assign one later.
                </FieldDescription>
              ) : areaMode === "existing" ? (
                <Field data-invalid={Boolean(errors.area_uuid)} className="gap-2">
                  <Select
                    value={selectedAreaUuid}
                    onValueChange={(value) => update("area_uuid", value ?? "")}
                    disabled={areasQuery.isLoading || areas.length === 0}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-labelledby="project-area-legend"
                      aria-invalid={Boolean(errors.area_uuid)}
                      aria-describedby={
                        errors.area_uuid ? "project-area-error" : undefined
                      }
                    >
                      <SelectValue
                        placeholder={
                          areasQuery.isLoading
                            ? "Loading areas…"
                            : areas.length === 0
                              ? "No active areas"
                              : "Choose an area"
                        }
                      >
                        {selectedArea && (
                          <span className="flex min-w-0 items-center gap-2">
                            <AreaIcon
                              name={selectedArea.icon}
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                            <span className="truncate">{selectedArea.name}</span>
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      {areas.map((area) => (
                        <SelectItem key={area.uuid} value={area.uuid}>
                          <span className="flex min-w-0 items-center gap-2">
                            <AreaIcon
                              name={area.icon}
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                            {area.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {areasQuery.isError ? (
                    <FieldError>
                      Areas could not be loaded. Try again or create a new one.
                    </FieldError>
                  ) : (
                    !areasQuery.isLoading &&
                    areas.length === 0 && (
                      <FieldDescription className="text-xs">
                        You don&apos;t have any active areas yet.{" "}
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => changeAreaMode("new")}
                        >
                          Create a new area instead
                        </Button>
                      </FieldDescription>
                    )
                  )}
                  {errors.area_uuid && (
                    <FieldError id="project-area-error">
                      {errors.area_uuid.message}
                    </FieldError>
                  )}
                </Field>
              ) : (
                <Field data-invalid={Boolean(errors.area_name)} className="gap-2">
                  <FieldLabel htmlFor="project-area-name">New area name</FieldLabel>
                  <Input
                    {...register("area_name")}
                    id="project-area-name"
                    maxLength={120}
                    placeholder="Career, Health, Finances…"
                    aria-invalid={Boolean(errors.area_name)}
                    aria-describedby={
                      errors.area_name ? "project-area-name-error" : undefined
                    }
                  />
                  {errors.area_name && (
                    <FieldError id="project-area-name-error">
                      {errors.area_name.message}
                    </FieldError>
                  )}
                </Field>
              )}
            </FieldSet>

            <ProjectAppearanceField
              icon={selectedIcon ?? "Rocket"}
              background={badgeColor ?? ""}
              error={errors.background?.message}
              tab={appearanceTab}
              onTabChange={setAppearanceTab}
              onIconChange={(icon) => update("icon", icon)}
              onBackgroundChange={(color) => update("background", color)}
            />
            {errors.icon && <FieldError>{errors.icon.message}</FieldError>}
          </FieldGroup>
        </form>

        <Separator />
        <DialogFooter className="shrink-0 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="project-form" disabled={isPending}>
            {isPending && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {isPending
              ? "Saving…"
              : project
                ? "Save changes"
                : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
