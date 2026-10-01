import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  remember_me: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
