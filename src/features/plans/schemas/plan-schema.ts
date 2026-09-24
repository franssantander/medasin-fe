import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const planSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(120),
    notes: z.string().trim().max(10_000),
    date: z.string().regex(datePattern, "Choose a date."),
    time: z.string(),
    is_all_day: z.boolean(),
    link: z.string(),
    reminder: z.enum(["none", "at_time", "three_hours", "one_day", "custom"]),
    custom_amount: z.string(),
    custom_unit: z.enum(["minutes", "hours", "days"]),
  })
  .superRefine((value, context) => {
    if (!value.is_all_day && !timePattern.test(value.time)) {
      context.addIssue({ code: "custom", path: ["time"], message: "Choose a time." });
    }
    if (value.reminder === "custom") {
      const amount = Number(value.custom_amount);
      const multiplier = { minutes: 1, hours: 60, days: 1440 }[value.custom_unit];
      if (!Number.isInteger(amount) || amount < 1 || amount * multiplier > 43_200) {
        context.addIssue({
          code: "custom",
          path: ["custom_amount"],
          message: "Choose a whole number between 1 minute and 30 days.",
        });
      }
    }
  });

export type PlanFormValues = z.input<typeof planSchema>;
