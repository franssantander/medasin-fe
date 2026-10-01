"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useRegisterMutation, useResendVerificationMutation, useVerifyEmailMutation } from "../queries/auth-query";
import { signupSchema, type SignupFormValues } from "../schemas/auth-schema";
import type { EmailVerificationChallenge } from "../type";
import { applyAuthFormErrors } from "../utils/form-errors";
import { AuthCard } from "./auth-card";
import { AuthFormError } from "./auth-form-error";
import { AuthInputField } from "./auth-input-field";
import { OtpForm } from "./otp-form";

export function SignupForm() {
  const router = useRouter();
  const registration = useRegisterMutation();
  const verification = useVerifyEmailMutation();
  const resend = useResendVerificationMutation();
  const [challenge, setChallenge] = useState<EmailVerificationChallenge>();
  const submitting = useRef(false);
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { first_name: "", last_name: "", email: "", username: "", password: "", password_confirmation: "" },
    mode: "onBlur",
  });
  const busy = registration.isPending || form.formState.isSubmitting;
  const errors = form.formState.errors;

  async function submit(values: SignupFormValues) {
    if (submitting.current) return;
    submitting.current = true;
    form.clearErrors();
    try {
      const response = await registration.mutateAsync(values);
      setChallenge(response.data);
      form.reset();
      registration.reset();
    } catch (error) {
      applyAuthFormErrors(error, form, ["first_name", "last_name", "email", "username", "password", "password_confirmation"]);
    } finally {
      submitting.current = false;
    }
  }

  return (
    <AuthCard
      title={challenge ? "Verify your email" : "Create your account"}
      description={challenge ? "One more step to your Medasin workspace." : "A place for your thoughts, plans, and projects."}
      footer={
        <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <p>Already have an account? <Link href="/login" className="font-medium text-foreground underline underline-offset-4">Sign in</Link></p>
          <Link href="/verify-email" className="underline underline-offset-4">Finish verifying an account</Link>
        </div>
      }
    >
      {challenge ? (
        <OtpForm
          description={`Enter the verification code sent to ${challenge.email}.`}
          codeLifetimeMinutes={60}
          expiresIn={challenge.otp_expires_in}
          resendAfter={challenge.resend_after}
          isPending={verification.isPending}
          onVerify={async (otp) => {
            await verification.mutateAsync({ email: challenge.email, otp });
            verification.reset();
            router.replace("/home");
          }}
          onResend={async () => {
            const response = await resend.mutateAsync({ email: challenge.email });
            resend.reset();
            return response.message;
          }}
        />
      ) : (
        <form onSubmit={(event) => void form.handleSubmit(submit)(event)} noValidate className="flex flex-col gap-5" aria-busy={busy}>
          <AuthFormError message={errors.root?.server?.message} />
          <FieldGroup className="gap-4">
            <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
              <AuthInputField id="first-name" label="First name" autoComplete="given-name" registration={form.register("first_name")} error={errors.first_name} disabled={busy} />
              <AuthInputField id="last-name" label="Last name" autoComplete="family-name" registration={form.register("last_name")} error={errors.last_name} disabled={busy} />
            </FieldGroup>
            <AuthInputField id="signup-email" label="Email" type="email" autoComplete="email" registration={form.register("email")} error={errors.email} disabled={busy} />
            <AuthInputField id="signup-username" label="Username" autoComplete="username" autoCapitalize="none" spellCheck={false} registration={form.register("username")} error={errors.username} disabled={busy} />
            <AuthInputField id="signup-password" label="Password" type="password" autoComplete="new-password" registration={form.register("password")} error={errors.password} disabled={busy} hint="Use at least 8 characters." />
            <AuthInputField id="signup-password-confirmation" label="Confirm password" type="password" autoComplete="new-password" registration={form.register("password_confirmation")} error={errors.password_confirmation} disabled={busy} />
          </FieldGroup>
          <Button type="submit" size="default" disabled={busy} className="h-11 w-full md:h-9">
            {busy ? "Creating account..." : "Create account"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
