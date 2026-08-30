"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAreasQuery } from "@/features/areas/queries/area-query";
import { ApiError } from "@/lib/axios";
import {
  projectSchema,
  type ProjectFormValues,
} from "../schemas/project-schema";
import type { ProjectInput, ProjectListCard } from "../type";
import {
  PROJECT_BADGE_COLORS,
  PROJECT_ICONS,
  ProjectIcon,
  projectBadgeStyle,
} from "./project-icons";

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error && (
        <span className="text-xs font-normal text-destructive">{error}</span>
      )}
    </label>
  );
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
  const [iconSearch, setIconSearch] = useState("");
  const areasQuery = useAreasQuery("active");
  const areas = areasQuery.data?.data ?? [];
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "Rocket",
      background: "#000000",
      start_date: "",
      due_date: "",
      area_mode: "existing",
      area_uuid: "",
      area_name: "",
    },
  });
  const areaMode = useWatch({ control, name: "area_mode" });
  const selectedIcon = useWatch({ control, name: "icon" });
  const badgeColor = useWatch({ control, name: "background" });
  const selectedAreaUuid = useWatch({ control, name: "area_uuid" });
  const selectedAreaName =
    areas.find((area) => area.uuid === selectedAreaUuid)?.name ??
    (project?.area?.uuid === selectedAreaUuid ? project.area.name : undefined);
  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    return query
      ? PROJECT_ICONS.filter(({ name }) => name.toLowerCase().includes(query))
      : PROJECT_ICONS;
  }, [iconSearch]);

  useEffect(() => {
    if (!open) return;

    reset({
      name: project?.name ?? "",
      description: project?.description ?? "",
      icon: project?.icon ?? "Rocket",
      background: project?.background ?? "#000000",
      start_date: project?.start_date ?? "",
      due_date: project?.due_date ?? "",
      area_mode: "existing",
      area_uuid: project?.area?.uuid ?? "",
      area_name: "",
    });
  }, [open, project, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setIconSearch("");
    onOpenChange(nextOpen);
  };

  const submit = handleSubmit(async (values) => {
    const input: ProjectInput = {
      name: values.name.trim(),
      description: values.description?.trim() || null,
      icon: values.icon?.trim() || null,
      background: values.background,
      start_date: values.start_date || null,
      due_date: values.due_date || null,
      ...(values.area_mode === "existing"
        ? { area_uuid: values.area_uuid }
        : { area_name: values.area_name?.trim() }),
    };

    try {
      await onSubmit(input);
      handleOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        Object.entries(error.validationErrors).forEach(([field, messages]) => {
          setError(field as keyof ProjectFormValues, { message: messages[0] });
        });
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "Create project"}</DialogTitle>
          <DialogDescription>
            Define the outcome, timeline, and area this project supports.
          </DialogDescription>
        </DialogHeader>

        <form id="project-form" onSubmit={submit} className="grid gap-5">
          <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={projectBadgeStyle(badgeColor)}
            >
              <ProjectIcon name={selectedIcon} className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">
                {project ? project.name : "Project preview"}
              </p>
              <p className="text-xs text-muted-foreground">
                Your icon and badge color appear together on the project card.
              </p>
            </div>
          </div>

          <FormField label="Name" error={errors.name?.message}>
            <Input
              {...register("name")}
              placeholder="Launch a portfolio, plan a trip…"
              aria-invalid={Boolean(errors.name)}
            />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <Textarea
              {...register("description")}
              placeholder="What does completing this project look like?"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Start date" error={errors.start_date?.message}>
              <Input type="date" {...register("start_date")} />
            </FormField>
            <FormField label="Due date" error={errors.due_date?.message}>
              <Input
                type="date"
                {...register("due_date")}
                aria-invalid={Boolean(errors.due_date)}
              />
            </FormField>
          </div>

          <div className="grid gap-3">
              <div className="flex gap-2" role="group" aria-label="Area source">
                <Button
                  type="button"
                  size="sm"
                  variant={areaMode === "existing" ? "default" : "outline"}
                  onClick={() => setValue("area_mode", "existing")}
                >
                  Existing area
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={areaMode === "new" ? "default" : "outline"}
                  onClick={() => setValue("area_mode", "new")}
                >
                  Create new area
                </Button>
              </div>

              {areaMode === "existing" ? (
                <FormField label="Area" error={errors.area_uuid?.message}>
                  <Select
                    value={selectedAreaUuid}
                    onValueChange={(value) =>
                      setValue("area_uuid", value ?? "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    disabled={areasQuery.isLoading || areas.length === 0}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={Boolean(errors.area_uuid)}
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
                        {selectedAreaName}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      {areas.map((area) => (
                        <SelectItem key={area.uuid} value={area.uuid}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {areasQuery.isError && (
                    <span className="text-xs font-normal text-destructive">
                      Areas could not be loaded. Try again or create a new one.
                    </span>
                  )}
                </FormField>
              ) : (
                <FormField label="New area name" error={errors.area_name?.message}>
                  <Input
                    {...register("area_name")}
                    placeholder="Career, Health, Finances…"
                    aria-invalid={Boolean(errors.area_name)}
                  />
                </FormField>
              )}
          </div>

          <FormField
            label="Icon badge color"
            error={errors.background?.message}
          >
            <div className="grid gap-4 rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">Choose a color</p>
                <p className="text-xs text-muted-foreground">
                  Black is used by default. Icon contrast adjusts automatically.
                </p>
              </div>
              <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
                {PROJECT_BADGE_COLORS.map((color) => {
                  const isSelected =
                    badgeColor?.toLowerCase() === color.value.toLowerCase();

                  return (
                    <button
                      key={color.value}
                      type="button"
                      title={color.name}
                      aria-label={`Use ${color.name} (${color.value})`}
                      aria-pressed={isSelected}
                      className="flex aspect-square items-center justify-center rounded-full border border-black/10 shadow-sm outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{ backgroundColor: color.value }}
                      onClick={() =>
                        setValue("background", color.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      {isSelected && (
                        <Check
                          className="size-4 drop-shadow-sm"
                          strokeWidth={3}
                          style={{
                            color: projectBadgeStyle(color.value).color,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                  style={projectBadgeStyle(badgeColor)}
                >
                  <ProjectIcon name={selectedIcon} className="size-5" />
                </div>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <label
                    htmlFor="project-badge-color"
                    className="text-xs font-medium"
                  >
                    Custom hex color
                  </label>
                  <Input
                    {...register("background")}
                    id="project-badge-color"
                    maxLength={7}
                    placeholder="#000000"
                    spellCheck={false}
                    aria-invalid={Boolean(errors.background)}
                    className="font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </FormField>

          <FormField label="Icon" error={errors.icon?.message}>
            <div className="overflow-hidden rounded-xl border">
              <div className="relative border-b p-3">
                <Search className="absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={iconSearch}
                  onChange={(event) => setIconSearch(event.target.value)}
                  placeholder={`Search ${PROJECT_ICONS.length} Lucide icons…`}
                  className="pl-9"
                />
              </div>
              <div className="grid max-h-48 grid-cols-[repeat(auto-fill,2rem)] justify-between gap-1 overflow-y-auto p-3">
                {filteredIcons.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    aria-label={`Use ${name} icon`}
                    aria-pressed={selectedIcon === name}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-black aria-pressed:text-white"
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
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="project-form" disabled={isPending}>
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
