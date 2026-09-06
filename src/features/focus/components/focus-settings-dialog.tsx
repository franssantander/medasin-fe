"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useUpdateFocusSettingsMutation } from "../queries/focus-query";
import { focusSettingsSchema } from "../schemas/focus-schema";
import type { AmbientSound, FocusSettings } from "../type";

export function FocusSettingsDialog({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: FocusSettings;
}) {
  const [form, setForm] = useState(settings);
  const update = useUpdateFocusSettingsMutation();
  const setNumber = (key: keyof FocusSettings, value: string) =>
    setForm((current) => ({ ...current, [key]: Number(value) }));
  const save = () => {
    const parsed = focusSettingsSchema.safeParse(form);
    if (!parsed.success) return;
    update.mutate(parsed.data, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Timer settings</DialogTitle>
          <DialogDescription>
            Changes apply to the next session, never one already in progress.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Focus session"
              value={form.focus_minutes}
              suffix="min"
              onChange={(value) => setNumber("focus_minutes", value)}
            />
            <NumberField
              label="Short break"
              value={form.short_break_minutes}
              suffix="min"
              onChange={(value) => setNumber("short_break_minutes", value)}
            />
            <NumberField
              label="Long break"
              value={form.long_break_minutes}
              suffix="min"
              onChange={(value) => setNumber("long_break_minutes", value)}
            />
            <NumberField
              label="Sessions before long break"
              value={form.sessions_before_long_break}
              onChange={(value) =>
                setNumber("sessions_before_long_break", value)
              }
            />
          </div>
          <div className="grid gap-4 border-t pt-4">
            <ToggleRow
              checked={form.ask_before_next_session}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  ask_before_next_session: checked,
                }))
              }
              title="Ask before starting next session"
              description="Recommended — pause for a calm transition instead of starting automatically."
            />
            <ToggleRow
              checked={form.ask_for_reflection}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  ask_for_reflection: checked,
                }))
              }
              title="Ask for a reflection after each session"
              description="Optionally record a mood and short private note."
            />
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Ambient sound
            <Select
              value={form.ambient_sound}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  ambient_sound: value as AmbientSound,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="brown">Brown noise</SelectItem>
                <SelectItem value="pink">Pink noise</SelectItem>
                <SelectItem value="white">White noise</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <div className="relative">
        <Input
          type="number"
          min={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={suffix ? "pr-12" : undefined}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function ToggleRow({
  checked,
  onCheckedChange,
  title,
  description,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </div>
  );
}
