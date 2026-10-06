import { z } from "zod";

export const focusTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required.").max(120, "Use 120 characters or fewer."),
});

export const focusSettingsSchema = z.object({
  focus_minutes: z.coerce.number().int("Enter a whole number.").min(1, "Choose at least 1 minute.").max(120, "Choose 120 minutes or fewer."),
  short_break_minutes: z.coerce.number().int("Enter a whole number.").min(1, "Choose at least 1 minute.").max(60, "Choose 60 minutes or fewer."),
  long_break_minutes: z.coerce.number().int("Enter a whole number.").min(1, "Choose at least 1 minute.").max(60, "Choose 60 minutes or fewer."),
  sessions_before_long_break: z.coerce.number().int("Enter a whole number.").min(1, "Choose at least 1 session.").max(12, "Choose 12 sessions or fewer."),
  ask_before_next_session: z.boolean(),
  ask_for_reflection: z.boolean(),
  ambient_sound: z.enum(["off", "brown", "pink", "white"]),
});
