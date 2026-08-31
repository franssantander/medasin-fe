import { z } from "zod";

export const AREA_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const AREA_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

const nullableText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);

export const areaSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: nullableText,
  icon: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => value || null),
  background: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i, "Enter a valid 6-digit hex color.")
    .optional()
    .transform((value) => value || null),
  background_image: z
    .custom<File>(isFile, "Choose a valid image file.")
    .refine(
      (file) =>
        AREA_IMAGE_TYPES.includes(
          file.type as (typeof AREA_IMAGE_TYPES)[number],
        ),
      "Choose a JPG, PNG, or WebP image.",
    )
    .refine(
      (file) => file.size <= AREA_IMAGE_MAX_SIZE,
      "Choose an image up to 5 MB.",
    )
    .nullable()
    .optional(),
});

export const goalSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(120),
    icon: z.string().trim().min(1).max(50).default("Target"),
    description: nullableText,
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
    start_date: z
      .string()
      .optional()
      .transform((value) => value || null),
    due_date: z
      .string()
      .optional()
      .transform((value) => value || null),
  })
  .refine(
    (value) =>
      !value.start_date ||
      !value.due_date ||
      value.due_date >= value.start_date,
    {
      message: "Due date must be on or after the start date.",
      path: ["due_date"],
    },
  );

export const habitSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    icon: z.string().trim().min(1).max(50).default("Repeat2"),
    description: nullableText,
    frequency: z.enum(["daily", "weekly", "monthly", "custom"]),
    schedule_days: z.array(
      z.enum([
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ]),
    ),
    schedule_dates: z.array(z.number().int().min(1).max(31)),
    is_active: z.boolean(),
  })
  .superRefine((value, context) => {
    if (
      (value.frequency === "weekly" || value.frequency === "custom") &&
      value.schedule_days.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["schedule_days"],
        message: "Choose at least one day.",
      });
    }
    if (value.frequency === "monthly" && value.schedule_dates.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["schedule_dates"],
        message: "Choose at least one date.",
      });
    }
  });

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  content: z.string().trim().min(1, "Content is required."),
  is_pinned: z.boolean(),
});

export type AreaFormValues = z.input<typeof areaSchema>;
export type GoalFormValues = z.input<typeof goalSchema>;
export type HabitFormValues = z.input<typeof habitSchema>;
export type HabitResolvedValues = z.output<typeof habitSchema>;
export type NoteFormValues = z.input<typeof noteSchema>;
