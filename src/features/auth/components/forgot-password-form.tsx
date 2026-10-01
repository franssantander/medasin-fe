"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useForgotPassword } from "../hooks/use-forgot-password";
import { AuthCard } from "./auth-card";
import { AuthFormError } from "./auth-form-error";
import { AuthInputField } from "./auth-input-field";
import { OtpForm } from "./otp-form";

export default function ForgotPasswordForm() {
  const recovery = useForgotPassword();
  const { emailForm, passwordForm } = recovery;
  const titles = {
    email: "Forgot your password?",
    code: "Check your email",
    password: "Choose a new password",
    success: "Password updated",
  };
  const descriptions = {
    email: "Enter your email address to receive a password reset code.",
    code: `Enter the six-digit code for ${recovery.email}.`,
    password: "Use a new password with at least eight characters.",
    success: "You can now sign in with your new password.",
  };

  return (
    <AuthCard
      title={titles[recovery.step]}
      description={descriptions[recovery.step]}
      footer={
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-ring"
        >
          Back to login
        </Link>
      }
    >
      {recovery.step === "email" && (
        <form
          noValidate
          onSubmit={emailForm.handleSubmit(recovery.sendCode)}
          className="flex flex-col gap-4"
        >
          <AuthFormError message={recovery.notice} />
          <FieldGroup className="gap-4">
            <AuthInputField
              id="recovery-email"
              label="Email"
              type="email"
              autoComplete="email"
              maxLength={255}
              registration={emailForm.register("email")}
              error={emailForm.formState.errors.email}
              disabled={recovery.isSending}
            />
          </FieldGroup>
          <AuthFormError
            message={emailForm.formState.errors.root?.server?.message}
          />
          <Button
            type="submit"
            disabled={recovery.isSending}
            size="default"
            className="h-11 w-full md:h-9"
          >
            {recovery.isSending ? "Sending code..." : "Send reset code"}
          </Button>
        </form>
      )}

      {recovery.step === "code" && (
        <OtpForm
          onVerify={recovery.verifyCode}
          onResend={recovery.resendCode}
          isPending={recovery.isVerifying}
          submitLabel="Verify code"
          description={recovery.codeMessage}
          onBack={recovery.changeEmail}
        />
      )}

      {recovery.step === "password" && (
        <form
          noValidate
          onSubmit={passwordForm.handleSubmit(recovery.resetPassword)}
          className="flex flex-col gap-4"
        >
          <FieldGroup className="gap-4">
            <AuthInputField
              id="new-password"
              label="New password"
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters. Passwords can contain spaces."
              registration={passwordForm.register("password")}
              error={passwordForm.formState.errors.password}
              disabled={recovery.isResetting}
            />
            <AuthInputField
              id="confirm-password"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              registration={passwordForm.register("password_confirmation")}
              error={passwordForm.formState.errors.password_confirmation}
              disabled={recovery.isResetting}
            />
          </FieldGroup>
          <AuthFormError
            message={passwordForm.formState.errors.root?.server?.message}
          />
          <Button
            type="submit"
            disabled={recovery.isResetting}
            size="default"
            className="h-11 w-full md:h-9"
          >
            {recovery.isResetting ? "Resetting password..." : "Reset password"}
          </Button>
        </form>
      )}

      {recovery.step === "success" && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Your password has been reset successfully.
        </p>
      )}
    </AuthCard>
  );
}
