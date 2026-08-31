"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ImagePlus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/axios";
import {
  AREA_IMAGE_MAX_SIZE,
  AREA_IMAGE_TYPES,
  areaSchema,
  type AreaFormValues,
} from "../schemas/area-schema";
import type { Area, AreaInput } from "../type";
import { AREA_ICONS, AreaIcon, areaBadgeStyle } from "./area-icons";
import { FormField } from "./form-field";
import { ImageCropDialog } from "./image-crop-dialog";

export const DEFAULT_AREA_BACKGROUND =
  "https://images.unsplash.com/photo-1763936783251-4a3eb135f07f?auto=format&fit=crop&w=1200&q=80&sat=-100";

const AREA_BADGE_COLORS = [
  { name: "Rose", value: "#F43F5E" },
  { name: "Pink", value: "#EC4899" },
  { name: "Fuchsia", value: "#D946EF" },
  { name: "Purple", value: "#A855F7" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Sky", value: "#0EA5E9" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Emerald", value: "#10B981" },
  { name: "Green", value: "#22C55E" },
  { name: "Lime", value: "#84CC16" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Orange", value: "#F97316" },
  { name: "Coral", value: "#FB7185" },
  { name: "Blush", value: "#F472B6" },
  { name: "Lavender", value: "#C084FC" },
  { name: "Periwinkle", value: "#818CF8" },
  { name: "Ocean", value: "#0284C7" },
  { name: "Aqua", value: "#2DD4BF" },
  { name: "Meadow", value: "#4ADE80" },
  { name: "Sunshine", value: "#FACC15" },
] as const;

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
  const [iconSearch, setIconSearch] = useState("");
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
      background: "#000000",
      background_image: null,
    },
  });
  const selectedIcon = useWatch({ control, name: "icon" });
  const badgeColor = useWatch({ control, name: "background" });
  const selectedImage = useWatch({ control, name: "background_image" });
  const uploadPreview = useMemo(
    () =>
      selectedImage instanceof File ? URL.createObjectURL(selectedImage) : null,
    [selectedImage],
  );
  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    return query
      ? AREA_ICONS.filter(({ name }) => name.toLowerCase().includes(query))
      : AREA_ICONS;
  }, [iconSearch]);

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
    if (open) {
      reset({
        name: area?.name ?? "",
        description: area?.description ?? "",
        icon: area?.icon ?? "Leaf",
        background: area?.background ?? "#000000",
        background_image: null,
      });
    }
  }, [area, open, reset]);

  const changeDialogOpen = (nextOpen: boolean) => {
    if (!nextOpen) setCropSource(null);
    onOpenChange(nextOpen);
  };

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      changeDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
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

  return (
    <Dialog open={open} onOpenChange={changeDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{area ? "Edit area" : "Create area"}</DialogTitle>
          <DialogDescription>
            Define an enduring part of life you want to tend with intention.
          </DialogDescription>
        </DialogHeader>

        <form id="area-form" onSubmit={submit} className="grid gap-5">
          <FormField
            label="Background image"
            error={errors.background_image?.message}
          >
            <label className="group relative block h-36 cursor-pointer overflow-hidden rounded-xl border bg-muted">
              <span
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                style={{
                  backgroundImage: `url('${uploadPreview || area?.background_image_url || DEFAULT_AREA_BACKGROUND}')`,
                }}
              />
              <span className="absolute inset-0 bg-black/25" />
              <span
                className="absolute bottom-3 left-3 flex size-11 items-center justify-center rounded-xl shadow-md ring-2 ring-white/80"
                style={areaBadgeStyle(badgeColor)}
              >
                <AreaIcon name={selectedIcon} className="size-5" />
              </span>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
                  <ImagePlus className="size-4" />
                  {selectedImage ? "Change image" : "Upload image"}
                </span>
              </span>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  selectImage(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, or WebP up to 5 MB. A monochrome contemplative image is
              used by default.
            </p>
          </FormField>

          <FormField label="Name" error={errors.name?.message}>
            <Input
              {...register("name")}
              placeholder="Health, Career, Family…"
              aria-invalid={Boolean(errors.name)}
            />
          </FormField>
          <FormField label="Description" error={errors.description?.message}>
            <Textarea
              {...register("description")}
              placeholder="What does this area help you maintain?"
            />
          </FormField>

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
                {AREA_BADGE_COLORS.map((color) => {
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
                          style={{ color: areaBadgeStyle(color.value).color }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                  style={areaBadgeStyle(badgeColor)}
                >
                  <AreaIcon name={selectedIcon} className="size-5" />
                </div>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <label
                    htmlFor="area-badge-color"
                    className="text-xs font-medium"
                  >
                    Custom hex color
                  </label>
                  <Input
                    {...register("background")}
                    id="area-badge-color"
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
                  placeholder={`Search ${AREA_ICONS.length} Lucide icons…`}
                  className="pl-9"
                />
              </div>
              <div className="grid max-h-56 grid-cols-[repeat(auto-fill,2rem)] justify-between gap-1 overflow-y-auto p-3">
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
            onClick={() => changeDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="area-form" disabled={isPending}>
            {isPending ? "Saving…" : area ? "Save changes" : "Create area"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {cropSource && (
        <ImageCropDialog
          open
          source={cropSource.url}
          file={cropSource.file}
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
