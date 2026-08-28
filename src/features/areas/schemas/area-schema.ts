import { z } from "zod";

const nullableText = z.string().trim().optional().transform((value) => value || null);

export const areaSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: nullableText,
  icon: z.string().trim().max(50).optional().transform((value) => value || null),
  background: z.string().trim().regex(/^#[0-9a-f]{6}$/i, "Enter a valid 6-digit hex color.").optional().transform((value) => value || null),
  background_image: z.custom<File>((value) => value instanceof File, "Choose a valid image file.").nullable().optional(),
});

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  description: nullableText,
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  start_date: z.string().optional().transform((value) => value || null),
  due_date: z.string().optional().transform((value) => value || null),
}).refine((value) => !value.start_date || !value.due_date || value.due_date >= value.start_date, {
  message: "Due date must be on or after the start date.",
  path: ["due_date"],
});

export const habitSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: nullableText,
  frequency: z.enum(["daily", "weekly", "monthly", "custom"]),
  is_active: z.boolean(),
});

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  content: z.string().trim().min(1, "Content is required."),
  is_pinned: z.boolean(),
});

export type AreaFormValues = z.input<typeof areaSchema>;
export type GoalFormValues = z.input<typeof goalSchema>;
export type HabitFormValues = z.input<typeof habitSchema>;
export type NoteFormValues = z.input<typeof noteSchema>;
