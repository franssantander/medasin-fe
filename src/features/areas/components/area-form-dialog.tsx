"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ImagePlus, LoaderCircle, Palette, Undo2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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
} from "@/components/ui/field";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PlanLimitAlert } from "@/features/subscription/components/plan-limit-alert";
import { isPlanLimitError } from "@/features/subscription/plan-limit-error";
import { ApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";
import {
  AREA_IMAGE_MAX_SIZE,
  AREA_IMAGE_TYPES,
  areaSchema,
  type AreaFormValues,
} from "../schemas/area-schema";
import type { Area, AreaInput } from "../type";
import { AreaIconPicker } from "./area-icon-picker";
import { AreaIcon, areaBadgeStyle } from "./area-icons";

export const DEFAULT_AREA_BACKGROUND =
  "https://images.unsplash.com/photo-1763936783251-4a3eb135f07f?auto=format&fit=crop&w=1200&q=80&sat=-100";

const NAME_MAX_LENGTH = 120;
const DEFAULT_BADGE_COLOR = "#000000";

const AREA_BADGE_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Lime", value: "#84CC16" },
  { name: "Emerald", value: "#10B981" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Sky", value: "#0EA5E9" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
] as const;

const isHexColor = (value?: string | null): value is string =>
  Boolean(value && /^#[0-9a-f]{6}$/i.test(value));

export function AreaFormDialog({
  open,
  onOpenChange,
  area,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: Area;
  isPending: boolean;
  onSubmit: (input: AreaInput) => Promise<void>;
}) {
  const id = useId();
  const [quotaError, setQuotaError] = useState<ApiError | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const quotaAlertRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedAreaRef = useRef<string | null>(null);
  useEffect(() => {
    if (quotaError) quotaAlertRef.current?.focus();
  }, [quotaError]);
  const [cropSource, setCropSource] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    setValue,
    formState: { errors },
  } = useForm<AreaFormValues, unknown, AreaInput>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "Leaf",
      background: DEFAULT_BADGE_COLOR,
      background_image: null,
    },
  });
  const name = useWatch({ control, name: "name" }) ?? "";
  const description = useWatch({ control, name: "description" });
  const selectedIcon = useWatch({ control, name: "icon" });
  const badgeColor = useWatch({ control, name: "background" });
  const selectedImage = useWatch({ control, name: "background_image" });
  const uploadPreview = useMemo(
    () =>
      selectedImage instanceof File ? URL.createObjectURL(selectedImage) : null,
    [selectedImage],
  );
  const presetColor = AREA_BADGE_COLORS.find(
    (color) => color.value.toLowerCase() === badgeColor?.toLowerCase(),
  );
  const coverImage =
    uploadPreview || area?.background_image_url || DEFAULT_AREA_BACKGROUND;

  useEffect(
    () => () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    },
    [uploadPreview],
  );

  useEffect(
    () => () => {
      if (cropSource) URL.revokeObjectURL(cropSource.url);
    },
    [cropSource],
  );

  useEffect(() => {
    if (!open) {
      initializedAreaRef.current = null;
      return;
    }
    const identity = area?.uuid ?? "create";
    if (initializedAreaRef.current !== identity) {
      initializedAreaRef.current = identity;
      reset({
        name: area?.name ?? "",
        description: area?.description ?? "",
        icon: area?.icon ?? "Leaf",
        background: area?.background ?? DEFAULT_BADGE_COLOR,
        background_image: null,
      });
    }
  }, [area, open, reset]);

  const closeDialog = () => {
    setCropSource(null);
    setQuotaError(null);
    setIsDraggingFile(false);
    onOpenChange(false);
  };

  const changeDialogOpen = (nextOpen: boolean) => {
    if (nextOpen) onOpenChange(true);
    else if (!isPending) closeDialog();
  };

  const submit = handleSubmit(async (values) => {
    setQuotaError(null);
    try {
      await onSubmit(values);
      closeDialog();
    } catch (error) {
      if (isPlanLimitError(error)) {
        setQuotaError(error);
      } else if (error instanceof ApiError && error.validationErrors) {
        Object.entries(error.validationErrors).forEach(([field, messages]) => {
          setError(field as keyof AreaFormValues, { message: messages[0] });
        });
      }
    }
  });

  const selectImage = (file: File | undefined) => {
    if (!file) return;

    if (
      !AREA_IMAGE_TYPES.includes(
        file.type as (typeof AREA_IMAGE_TYPES)[number],
      )
    ) {
      setError("background_image", {
        message: "Choose a JPG, PNG, or WebP image.",
      });
      return;
    }

    if (file.size > AREA_IMAGE_MAX_SIZE) {
      setError("background_image", { message: "Choose an image up to 5 MB." });
      return;
    }

    clearErrors("background_image");
    setCropSource({ file, url: URL.createObjectURL(file) });
  };

  const setBadgeColor = (value: string) =>
    setValue("background", value.toUpperCase(), {
      shouldDirty: true,
      shouldValidate: true,
    });

  return (
    <Dialog open={open} onOpenChange={changeDialogOpen}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 sm:px-6 sm:pr-12">
          <DialogTitle>{area ? "Edit area" : "Create area"}</DialogTitle>
          <DialogDescription>
            Define an enduring part of life you want to tend with intention.
          </DialogDescription>
        </DialogHeader>

        <form
          id="area-form"
          onSubmit={submit}
          className="min-h-0 overflow-y-auto overscroll-contain"
        >
          <FieldGroup className="gap-6 p-5 sm:p-6">
            {quotaError && (
              <div ref={quotaAlertRef} tabIndex={-1} className="outline-none">
                <PlanLimitAlert error={quotaError} />
              </div>
            )}

            <Field data-invalid={Boolean(errors.background_image)}>
              <FieldLabel htmlFor={`${id}-cover`}>Cover image</FieldLabel>
              <div
                className={cn(
                  "overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow",
                  isDraggingFile && "ring-3 ring-ring/50",
                )}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes("Files")) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setIsDraggingFile(true);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setIsDraggingFile(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(false);
                  selectImage(event.dataTransfer.files[0]);
                }}
              >
                <div className="relative aspect-16/7 overflow-hidden bg-muted">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${coverImage}')` }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/40 via-black/0 to-black/10" />
                  {isDraggingFile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                      Drop to use as cover
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                    {selectedImage && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        aria-label="Undo new cover"
                        title="Undo new cover"
                        className="bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
                        onClick={() =>
                          setValue("background_image", null, {
                            shouldDirty: true,
                          })
                        }
                      >
                        <Undo2 />
                      </Button>
                    )}
                    <Button
                      id={`${id}-cover`}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus />
                      {selectedImage || area?.background_image_url
                        ? "Change cover"
                        : "Upload cover"}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-1 px-4 pb-4" aria-hidden="true">
                  <div
                    className="relative z-1 -mt-6 mb-1.5 flex size-12 items-center justify-center rounded-xl shadow-md ring-4 ring-card"
                    style={areaBadgeStyle(
                      isHexColor(badgeColor) ? badgeColor : DEFAULT_BADGE_COLOR,
                    )}
                  >
                    <AreaIcon name={selectedIcon} className="size-5" />
                  </div>
                  <p
                    className={cn(
                      "truncate font-semibold",
                      !name.trim() && "text-muted-foreground",
                    )}
                  >
                    {name.trim() || "Untitled area"}
                  </p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {description?.trim() || (
                      <span className="italic">No description yet.</span>
                    )}
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={AREA_IMAGE_TYPES.join(",")}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  selectImage(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              {errors.background_image ? (
                <FieldError>{errors.background_image.message}</FieldError>
              ) : (
                <FieldDescription>
                  JPG, PNG, or WebP up to 5 MB. Drag an image onto the preview
                  or upload one. A calm monochrome image is used by default.
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
              <Input
                {...register("name")}
                id={`${id}-name`}
                autoFocus={!area}
                maxLength={NAME_MAX_LENGTH}
                placeholder="Health, Career, Family…"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={`${id}-name-hint`}
              />
              <div className="flex items-start justify-between gap-3">
                {errors.name ? (
                  <FieldError id={`${id}-name-hint`}>{errors.name.message}</FieldError>
                ) : (
                  <FieldDescription id={`${id}-name-hint`}>
                    A short name you&apos;ll recognize at a glance.
                  </FieldDescription>
                )}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {name.length}/{NAME_MAX_LENGTH}
                </span>
              </div>
            </Field>

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
              <Textarea
                {...register("description")}
                id={`${id}-description`}
                rows={3}
                placeholder="What does this area help you maintain?"
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description ? (
                <FieldError>{errors.description.message}</FieldError>
              ) : (
                <FieldDescription>
                  Optional. Describe the standard you want to keep here.
                </FieldDescription>
              )}
            </Field>

            <section
              aria-labelledby={`${id}-appearance`}
              className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:p-5"
            >
              <div className="flex items-start gap-2.5">
                <Palette
                  className="mt-0.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="grid gap-0.5">
                  <h3 id={`${id}-appearance`} className="text-sm font-semibold">
                    Appearance
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Pick an icon and badge color. Icon contrast adjusts
                    automatically.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                <Field data-invalid={Boolean(errors.icon)}>
                  <FieldLabel htmlFor={`${id}-icon`}>Icon</FieldLabel>
                  <AreaIconPicker
                    id={`${id}-icon`}
                    value={selectedIcon}
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

                <Field data-invalid={Boolean(errors.background)}>
                  <FieldLabel id={`${id}-color-label`}>Badge color</FieldLabel>
                  <ToggleGroup
                    aria-labelledby={`${id}-color-label`}
                    spacing={1}
                    value={presetColor ? [presetColor.value] : []}
                    onValueChange={(values) => {
                      const next = values[0];
                      if (next) setBadgeColor(next);
                    }}
                    className="flex-wrap"
                  >
                    {AREA_BADGE_COLORS.map((color) => {
                      const isSelected = presetColor?.value === color.value;

                      return (
                        <ToggleGroupItem
                          key={color.value}
                          value={color.value}
                          title={color.name}
                          aria-label={`${color.name} (${color.value})`}
                          className="size-7 min-w-0 rounded-full border border-black/10 p-0 shadow-xs transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-2 aria-pressed:ring-offset-background motion-reduce:hover:scale-100 dark:border-white/15"
                          style={{ backgroundColor: color.value }}
                        >
                          {isSelected && (
                            <Check
                              className="size-3.5"
                              strokeWidth={3}
                              style={{ color: areaBadgeStyle(color.value).color }}
                              aria-hidden="true"
                            />
                          )}
                        </ToggleGroupItem>
                      );
                    })}
                  </ToggleGroup>

                  <InputGroup className="max-w-48 bg-background">
                    <InputGroupAddon>
                      <span className="relative size-5 overflow-hidden rounded-sm border border-black/10 dark:border-white/15">
                        <input
                          type="color"
                          aria-label="Pick a custom color"
                          value={
                            isHexColor(badgeColor)
                              ? badgeColor.toLowerCase()
                              : DEFAULT_BADGE_COLOR
                          }
                          onChange={(event) => setBadgeColor(event.target.value)}
                          className="absolute -inset-2 size-[calc(100%+1rem)] cursor-pointer border-0 p-0"
                        />
                      </span>
                    </InputGroupAddon>
                    <InputGroupInput
                      {...register("background")}
                      aria-label="Custom hex color"
                      maxLength={7}
                      placeholder="#000000"
                      spellCheck={false}
                      aria-invalid={Boolean(errors.background)}
                      className="font-mono uppercase"
                    />
                  </InputGroup>
                  {errors.background ? (
                    <FieldError>{errors.background.message}</FieldError>
                  ) : (
                    <FieldDescription>
                      {presetColor
                        ? presetColor.name
                        : "Custom color"}
                    </FieldDescription>
                  )}
                </Field>
              </div>
            </section>
          </FieldGroup>
        </form>

        <DialogFooter className="shrink-0 border-t bg-popover px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={closeDialog}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="area-form"
            className="w-full sm:w-auto"
            disabled={isPending}
          >
            {isPending && <LoaderCircle className="animate-spin" />}
            {isPending ? "Saving…" : area ? "Save changes" : "Create area"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {cropSource && (
        <ImageCropDialog
          open
          source={cropSource.url}
          file={cropSource.file}
          aspect={16 / 9}
          title="Crop background image"
          onOpenChange={(cropOpen) => {
            if (!cropOpen) setCropSource(null);
          }}
          onCrop={(file) =>
            setValue("background_image", file, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      )}
    </Dialog>
  );
}
