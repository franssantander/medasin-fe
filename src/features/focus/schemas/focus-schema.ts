import { z } from "zod";

export const focusTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required.").max(120),
});

export const focusSettingsSchema = z.object({
  focus_minutes: z.coerce.number().int().min(1).max(120),
  short_break_minutes: z.coerce.number().int().min(1).max(60),
  long_break_minutes: z.coerce.number().int().min(1).max(60),
  sessions_before_long_break: z.coerce.number().int().min(1).max(12),
  ask_before_next_session: z.boolean(),
  ask_for_reflection: z.boolean(),
  ambient_sound: z.enum(["off", "brown", "pink", "white"]),
});
