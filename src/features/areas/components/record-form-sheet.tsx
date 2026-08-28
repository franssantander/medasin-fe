"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/axios";
import type { Goal, GoalInput, Habit, HabitInput, Note, NoteInput } from "../type";
import { FormField } from "./form-field";

type Kind = "goal" | "habit" | "note";
type RecordValue = Goal | Habit | Note;
type RecordInput = GoalInput | HabitInput | NoteInput;

export function RecordFormSheet({
  kind,
  open,
  onOpenChange,
  value,
  isPending,
  onSubmit,
}: {
  kind: Kind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: RecordValue;
  isPending: boolean;
  onSubmit: (input: RecordInput) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string | boolean>>(() => initialForm(kind, value));
  const [error, setError] = useState<string>();

  const change = (field: string, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    try {
      let input: RecordInput;
      if (kind === "goal") input = { title: String(form.title), description: String(form.description) || null, status: form.status as GoalInput["status"], start_date: String(form.start_date) || null, due_date: String(form.due_date) || null };
      else if (kind === "habit") input = { name: String(form.name), description: String(form.description) || null, frequency: form.frequency as HabitInput["frequency"], is_active: Boolean(form.is_active) };
      else input = { title: String(form.title), content: String(form.content), is_pinned: Boolean(form.is_pinned) };
      await onSubmit(input);
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The record could not be saved.");
    }
  };

  const title = `${value ? "Edit" : "Add"} ${kind}`;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle className="capitalize">{title}</SheetTitle><SheetDescription>Keep this information connected to the current area.</SheetDescription></SheetHeader>
        <form id="record-form" onSubmit={submit} className="grid gap-4 px-4">
          {kind === "habit" ? (
            <FormField label="Name"><Input required maxLength={120} value={String(form.name ?? "")} onChange={(e) => change("name", e.target.value)} /></FormField>
          ) : (
            <FormField label="Title"><Input required maxLength={120} value={String(form.title ?? "")} onChange={(e) => change("title", e.target.value)} /></FormField>
          )}
          {kind !== "note" && <FormField label="Description"><Textarea value={String(form.description ?? "")} onChange={(e) => change("description", e.target.value)} /></FormField>}
          {kind === "note" && <FormField label="Content"><Textarea required className="min-h-32" value={String(form.content ?? "")} onChange={(e) => change("content", e.target.value)} /></FormField>}
          {kind === "goal" && <>
            <FormField label="Status"><select className="h-9 rounded-md border bg-background px-2.5 text-sm" value={String(form.status ?? "pending")} onChange={(e) => change("status", e.target.value)}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></FormField>
            <div className="grid grid-cols-2 gap-3"><FormField label="Start date"><Input type="date" value={String(form.start_date ?? "")} onChange={(e) => change("start_date", e.target.value)} /></FormField><FormField label="Due date"><Input type="date" min={String(form.start_date ?? "")} value={String(form.due_date ?? "")} onChange={(e) => change("due_date", e.target.value)} /></FormField></div>
          </>}
          {kind === "habit" && <FormField label="Frequency"><select className="h-9 rounded-md border bg-background px-2.5 text-sm" value={String(form.frequency ?? "daily")} onChange={(e) => change("frequency", e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select></FormField>}
          {kind !== "goal" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form[kind === "habit" ? "is_active" : "is_pinned"])} onChange={(e) => change(kind === "habit" ? "is_active" : "is_pinned", e.target.checked)} />{kind === "habit" ? "Active" : "Pin this note"}</label>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <SheetFooter><Button form="record-form" type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function initialForm(kind: Kind, value?: RecordValue): Record<string, string | boolean> {
  if (kind === "goal") {
    const goal = value as Goal | undefined;
    return { title: goal?.title ?? "", description: goal?.description ?? "", status: goal?.status ?? "pending", start_date: goal?.start_date?.slice(0, 10) ?? "", due_date: goal?.due_date?.slice(0, 10) ?? "" };
  }
  if (kind === "habit") {
    const habit = value as Habit | undefined;
    return { name: habit?.name ?? "", description: habit?.description ?? "", frequency: habit?.frequency ?? "daily", is_active: habit?.is_active ?? true };
  }
  const note = value as Note | undefined;
  return { title: note?.title ?? "", content: note?.content ?? "", is_pinned: note?.is_pinned ?? false };
}
