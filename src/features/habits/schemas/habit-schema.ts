import { z } from "zod";

export const habitSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    icon: z.string().trim().min(1).max(50),
    description: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || null),
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
    area_uuid: z.string().uuid().nullable(),
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

export type HabitFormValues = z.input<typeof habitSchema>;
export type HabitResolvedValues = z.output<typeof habitSchema>;
