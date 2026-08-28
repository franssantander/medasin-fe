"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/axios";
import { areaSchema, type AreaFormValues } from "../schemas/area-schema";
import type { Area, AreaInput } from "../type";
import { AREA_ICONS, AreaIcon, areaBadgeStyle } from "./area-icons";
import { FormField } from "./form-field";

export const DEFAULT_AREA_BACKGROUND = "https://images.unsplash.com/photo-1763936783251-4a3eb135f07f?auto=format&fit=crop&w=1200&q=80&sat=-100";

export function AreaFormDialog({ open, onOpenChange, area, isPending, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: Area;
  isPending: boolean;
  onSubmit: (input: AreaInput) => Promise<void>;
}) {
  const [iconSearch, setIconSearch] = useState("");
  const { control, register, handleSubmit, reset, setError, setValue, formState: { errors } } = useForm<AreaFormValues, unknown, AreaInput>({
    resolver: zodResolver(areaSchema),
    defaultValues: { name: "", description: "", icon: "Leaf", background: "#000000", background_image: null },
  });
  const selectedIcon = useWatch({ control, name: "icon" });
  const badgeColor = useWatch({ control, name: "background" });
  const selectedImage = useWatch({ control, name: "background_image" });
  const uploadPreview = useMemo(() => selectedImage instanceof File ? URL.createObjectURL(selectedImage) : null, [selectedImage]);
  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    return query ? AREA_ICONS.filter(({ name }) => name.toLowerCase().includes(query)) : AREA_ICONS;
  }, [iconSearch]);

  useEffect(() => () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
  }, [uploadPreview]);

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

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.validationErrors) {
        Object.entries(error.validationErrors).forEach(([field, messages]) => {
          setError(field as keyof AreaFormValues, { message: messages[0] });
        });
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{area ? "Edit area" : "Create area"}</DialogTitle>
          <DialogDescription>Define an enduring part of life you want to tend with intention.</DialogDescription>
        </DialogHeader>

        <form id="area-form" onSubmit={submit} className="grid gap-5">
          <FormField label="Background image" error={errors.background_image?.message}>
            <label className="group relative block h-36 cursor-pointer overflow-hidden rounded-xl border bg-muted">
              <span className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]" style={{ backgroundImage: `url('${uploadPreview || area?.background_image_url || DEFAULT_AREA_BACKGROUND}')` }} />
              <span className="absolute inset-0 bg-black/25" />
              <span className="absolute bottom-3 left-3 flex size-11 items-center justify-center rounded-xl shadow-md ring-2 ring-white/80" style={areaBadgeStyle(badgeColor)}>
                <AreaIcon name={selectedIcon} className="size-5" />
              </span>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
                  <ImagePlus className="size-4" />{selectedImage ? "Change image" : "Upload image"}
                </span>
              </span>
              <Input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setValue("background_image", event.target.files?.[0] ?? null, { shouldValidate: true })} />
            </label>
            <p className="text-xs text-muted-foreground">JPG, PNG, or WebP up to 5 MB. A monochrome contemplative image is used by default.</p>
          </FormField>

          <FormField label="Name" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Health, Career, Family…" aria-invalid={Boolean(errors.name)} />
          </FormField>
          <FormField label="Description" error={errors.description?.message}>
            <Textarea {...register("description")} placeholder="What does this area help you maintain?" />
          </FormField>

          <FormField label="Icon badge color" error={errors.background?.message}>
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <Input {...register("background")} type="color" className="size-10 shrink-0 cursor-pointer p-1" aria-label="Icon badge color" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Badge background</p>
                <p className="text-xs text-muted-foreground">Black is used by default. Icon contrast adjusts automatically.</p>
              </div>
              <code className="ml-auto text-xs text-muted-foreground">{badgeColor || "#000000"}</code>
            </div>
          </FormField>

          <FormField label="Icon" error={errors.icon?.message}>
            <div className="overflow-hidden rounded-xl border">
              <div className="relative border-b p-3">
                <Search className="absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={iconSearch} onChange={(event) => setIconSearch(event.target.value)} placeholder={`Search ${AREA_ICONS.length} Lucide icons…`} className="pl-9" />
              </div>
              <div className="grid max-h-56 grid-cols-7 gap-1 overflow-y-auto p-3 sm:grid-cols-9">
                {filteredIcons.map(({ name, icon: Icon }) => (
                  <button key={name} type="button" title={name} aria-label={`Use ${name} icon`} aria-pressed={selectedIcon === name} className="flex aspect-square items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-black aria-pressed:text-white" onClick={() => setValue("icon", name, { shouldDirty: true, shouldValidate: true })}>
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
              {filteredIcons.length === 0 && <p className="px-3 pb-4 text-center text-sm text-muted-foreground">No icons match “{iconSearch}”.</p>}
            </div>
          </FormField>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="area-form" disabled={isPending}>{isPending ? "Saving…" : area ? "Save changes" : "Create area"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
