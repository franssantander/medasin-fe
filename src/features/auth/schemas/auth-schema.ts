import { z } from "zod";

function identityField(label: string) {
  return z.string().trim().min(1, `${label} is required`).refine(
    (value) => Array.from(value).length <= 255,
    `${label} must not exceed 255 characters`,
  );
}

const emailField = identityField("Email").pipe(z.email("Enter a valid email address"));

export const passwordSchema = z.string()
  .refine((value) => Array.from(value).length >= 8, "Password must be at least 8 characters")
  .refine((value) => !value.includes("\0"), "Password must not contain null characters")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Password must not exceed 72 bytes");

export const signupSchema = z.object({
  first_name: identityField("First name"),
  last_name: identityField("Last name"),
  email: emailField,
  username: identityField("Username"),
  password: passwordSchema,
  password_confirmation: z.string().min(1, "Confirm your password"),
}).refine((values) => values.password === values.password_confirmation, {
  message: "Passwords do not match",
  path: ["password_confirmation"],
});

export const emailFormSchema = z.object({ email: emailField });
export const otpFormSchema = z.object({
  otp: z.string().regex(/^[0-9]{6}$/, "Enter the six-digit verification code"),
});
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  password_confirmation: z.string().min(1, "Confirm your new password"),
}).refine((values) => values.password === values.password_confirmation, {
  message: "Passwords do not match",
  path: ["password_confirmation"],
});

export type SignupFormValues = z.infer<typeof signupSchema>;
export type EmailFormValues = z.infer<typeof emailFormSchema>;
export type OtpFormValues = z.infer<typeof otpFormSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
