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
  method: z.enum(["password", "code"]),
  confirmation: z.string().refine((value): boolean => value === "DELETE", { error: "Type DELETE to confirm" }),
  current_password: z.string(),
  otp: z.string(),
}).superRefine((values, context) => {
  if (values.method === "password" && values.current_password === "") {
    context.addIssue({ code: "custom", path: ["current_password"], message: "Enter your current password" });
  }
  if (values.method === "code" && !/^[0-9]{6}$/.test(values.otp)) {
    context.addIssue({ code: "custom", path: ["otp"], message: "Enter the 6-digit code from your email" });
  }
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;
