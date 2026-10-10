"use client";

import { Loader2, Minus, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { parseApiError } from "@/lib/axios/errors";
import { ambientOptions } from "../lib/focus-utils";
import { useUpdateFocusSettingsMutation } from "../queries/focus-query";
import { focusSettingsSchema } from "../schemas/focus-schema";
import type { AmbientSound, FocusSettings } from "../type";

type NumberKey = "focus_minutes" | "short_break_minutes" | "long_break_minutes" | "sessions_before_long_break";
type SettingsDraft = Omit<FocusSettings, NumberKey> & Record<NumberKey, string>;
const numberFields: { key: NumberKey; label: string; max: number; unit: string }[] = [
  { key: "focus_minutes", label: "Focus session", max: 120, unit: "min" },
  { key: "short_break_minutes", label: "Short break", max: 60, unit: "min" },
  { key: "long_break_minutes", label: "Long break", max: 60, unit: "min" },
  { key: "sessions_before_long_break", label: "Sessions before long break", max: 12, unit: "sessions" },
];
const presets: { id: string; label: string; values: Record<NumberKey, number> }[] = [
  { id: "classic", label: "Classic", values: { focus_minutes: 25, short_break_minutes: 5, long_break_minutes: 15, sessions_before_long_break: 4 } },
  { id: "short", label: "Short", values: { focus_minutes: 15, short_break_minutes: 3, long_break_minutes: 10, sessions_before_long_break: 4 } },
  { id: "deep", label: "Deep work", values: { focus_minutes: 50, short_break_minutes: 10, long_break_minutes: 30, sessions_before_long_break: 2 } },
];

export function FocusSettingsDialog({ open, onOpenChange, onClosed, settings }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
  settings: FocusSettings;
}) {
  const [opener] = useState(() => typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const [form, setForm] = useState<SettingsDraft>(() => ({
    ...settings,
    focus_minutes: String(settings.focus_minutes),
    short_break_minutes: String(settings.short_break_minutes),
    long_break_minutes: String(settings.long_break_minutes),
    sessions_before_long_break: String(settings.sessions_before_long_break),
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FocusSettings, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const update = useUpdateFocusSettingsMutation();
  const change = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    update.reset();
  };
  const activePreset = presets.find((preset) => numberFields.every((item) => form[item.key].trim() === String(preset.values[item.key])))?.id;
  const applyPreset = (id: string) => {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    for (const item of numberFields) change(item.key, String(preset.values[item.key]));
  };
  const step = (key: NumberKey, max: number, delta: number) => {
    const current = Number.parseInt(form[key], 10);
    const next = Number.isNaN(current) ? 1 : Math.min(max, Math.max(1, current + delta));
    change(key, String(next));
  };
  const focusInvalid = () => requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
  const save = () => {
    if (update.isPending) return;
    const parsed = focusSettingsSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])));
      focusInvalid();
      return;
    }
    setErrors({});
    update.mutate(parsed.data, {
      onSuccess: () => onOpenChange(false),
      onError: (error) => {
        const fields = parseApiError(error).validationErrors;
        if (fields) {
          setErrors(Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key, messages[0]])));
          focusInvalid();
        }
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !update.isPending && onOpenChange(next)}
      onOpenChangeComplete={(next) => !next && onClosed()}
    >
      <DialogContent showCloseButton={false} finalFocus={() => opener} className="max-h-[min(90dvh,44rem)] max-w-lg gap-0 overflow-hidden p-0">
        <form ref={formRef} className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); save(); }} noValidate>
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14 sm:px-6 sm:pr-14">
            <DialogTitle>Timer settings</DialogTitle>
            <DialogDescription>Build a rhythm that works for you.</DialogDescription>
          </DialogHeader>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" className="absolute top-4 right-4" />} aria-label="Close" disabled={update.isPending}>
            <X />
          </DialogClose>
          <FieldGroup className="workspace-list-scrollbar min-h-0 flex-1 gap-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {update.isError && <Alert variant="destructive"><AlertDescription>{update.error.message}</AlertDescription></Alert>}
            <FieldSet className="gap-3">
              <FieldLegend>Session lengths</FieldLegend>
              <FieldDescription>Duration changes apply to your next session.</FieldDescription>
              <ToggleGroup
                aria-label="Presets"
                value={activePreset ? [activePreset] : []}
                onValueChange={(values) => values[0] && applyPreset(values[0])}
                disabled={update.isPending}
                variant="outline"
                className="grid w-full grid-cols-3 gap-2"
              >
                {presets.map((preset) => (
                  <ToggleGroupItem
                    key={preset.id}
                    value={preset.id}
                    className="h-auto min-w-0 flex-col gap-0.5 py-2 aria-pressed:border-foreground/25 aria-pressed:bg-muted"
                  >
                    <span className="max-w-full truncate">{preset.label}</span>
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">
                      {preset.values.focus_minutes} · {preset.values.short_break_minutes} · {preset.values.long_break_minutes}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldGroup className="grid gap-4 pt-1 sm:grid-cols-2">
                {numberFields.map((item) => (
                  <Field key={item.key} data-invalid={Boolean(errors[item.key])} data-disabled={update.isPending} className="gap-2">
                    <FieldLabel htmlFor={"focus-setting-" + item.key}>{item.label}</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id={"focus-setting-" + item.key}
                        type="number"
                        min={1}
                        max={item.max}
                        step={1}
                        value={form[item.key]}
                        onChange={(event) => change(item.key, event.target.value)}
                        aria-invalid={Boolean(errors[item.key])}
                        aria-describedby={"focus-setting-" + item.key + "-help" + (errors[item.key] ? " focus-setting-" + item.key + "-error" : "")}
                        disabled={update.isPending}
                        className="[appearance:textfield] tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>{item.unit}</InputGroupText>
                        <InputGroupButton size="icon-xs" aria-label={"Decrease " + item.label.toLowerCase()} onClick={() => step(item.key, item.max, -1)} disabled={update.isPending || Number(form[item.key]) <= 1}><Minus /></InputGroupButton>
                        <InputGroupButton size="icon-xs" aria-label={"Increase " + item.label.toLowerCase()} onClick={() => step(item.key, item.max, 1)} disabled={update.isPending || Number(form[item.key]) >= item.max}><Plus /></InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldDescription id={"focus-setting-" + item.key + "-help"}>1–{item.max} {item.unit === "min" ? "minutes" : "sessions"}</FieldDescription>
                    {errors[item.key] && <FieldError id={"focus-setting-" + item.key + "-error"}>{errors[item.key]}</FieldError>}
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
            <FieldSeparator />
            <FieldSet className="gap-3">
              <FieldLegend>After a session</FieldLegend>
              <FieldGroup className="gap-4">
                <ToggleRow
                  id="focus-ask-next"
                  title="Ask before starting next session"
                  description="Choose when to continue. Turn off to start the next session automatically."
                  checked={form.ask_before_next_session}
                  onCheckedChange={(value) => change("ask_before_next_session", value)}
                  disabled={update.isPending}
                />
                <ToggleRow
                  id="focus-ask-reflection"
                  title="Reflect after focus sessions"
                  description="Save an optional mood and short note to your Journal."
                  checked={form.ask_for_reflection}
                  onCheckedChange={(value) => change("ask_for_reflection", value)}
                  disabled={update.isPending}
                />
              </FieldGroup>
            </FieldSet>
            <FieldSeparator />
            <Field data-disabled={update.isPending} className="gap-2">
              <FieldLabel htmlFor="focus-setting-sound">Ambient sound</FieldLabel>
              <Select items={ambientOptions} value={form.ambient_sound} onValueChange={(value) => value && change("ambient_sound", value as AmbientSound)} disabled={update.isPending}>
                <SelectTrigger id="focus-setting-sound" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>
                  {ambientOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select>
              <FieldDescription>Sound changes apply immediately and play only while a session is running.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="shrink-0 border-t px-5 py-4 sm:px-6">
            <DialogClose render={<Button type="button" variant="outline" />} disabled={update.isPending}>Cancel</DialogClose>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />}
              {update.isPending ? "Saving…" : "Save settings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({ id, title, description, checked, onCheckedChange, disabled }: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <Field orientation="horizontal" data-disabled={disabled} className="justify-between gap-4">
      <FieldContent>
        <FieldLabel htmlFor={id}>{title}</FieldLabel>
        <FieldDescription id={id + "-help"}>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-describedby={id + "-help"} />
    </Field>
  );
}
