import { z } from "zod";

import { passwordSchema } from "@/features/auth/schemas/auth-schema";

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Enter your current password"),
  password: passwordSchema,
  password_confirmation: z.string().min(1, "Confirm your new password"),
}).refine((values) => values.password === values.password_confirmation, {
  message: "Passwords do not match",
  path: ["password_confirmation"],
});

export const deleteAccountSchema = z.object({
  confirmation: z.string().refine((value): boolean => value === "DELETE", { error: "Type DELETE to confirm" }),
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;
