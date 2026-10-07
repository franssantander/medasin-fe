"use client";

import { Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
      <DialogContent showCloseButton={false} finalFocus={() => opener} className="max-h-[92dvh] gap-0 overflow-hidden p-0">
        <form ref={formRef} className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); save(); }} noValidate>
          <DialogHeader className="shrink-0 px-5 py-4 pr-14 sm:px-6 sm:pr-14">
            <DialogTitle>Timer settings</DialogTitle>
            <DialogDescription>Build a rhythm that works for you.</DialogDescription>
          </DialogHeader>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" className="absolute top-4 right-4" />} aria-label="Close" disabled={update.isPending}>
            <X />
          </DialogClose>
          <Separator />
          <FieldGroup className="workspace-list-scrollbar min-h-0 flex-1 gap-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {update.isError && <Alert variant="destructive"><AlertDescription>{update.error.message}</AlertDescription></Alert>}
            <FieldSet className="gap-3">
              <FieldLegend>Session lengths</FieldLegend>
              <FieldDescription>Duration changes apply to your next session.</FieldDescription>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
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
                      />
                      <InputGroupAddon align="inline-end"><InputGroupText>{item.unit}</InputGroupText></InputGroupAddon>
                    </InputGroup>
                    <FieldDescription id={"focus-setting-" + item.key + "-help"}>1–{item.max} {item.unit === "min" ? "minutes" : "sessions"}</FieldDescription>
                    {errors[item.key] && <FieldError id={"focus-setting-" + item.key + "-error"}>{errors[item.key]}</FieldError>}
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
            <Separator />
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
            <Separator />
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
          <Separator />
          <DialogFooter className="shrink-0 px-5 py-4 sm:px-6">
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
        <FieldLabel htmlFor={id} className="flex-col items-start gap-1">
          <span>{title}</span>
          <span className="text-sm leading-normal font-normal text-muted-foreground">{description}</span>
        </FieldLabel>
      </FieldContent>
      <div className="flex shrink-0 items-center">
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
    </Field>
  );
}
