"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useRegisterMutation, useResendVerificationMutation, useVerifyEmailMutation } from "../queries/auth-query";
import { signupSchema, type SignupFormValues } from "../schemas/auth-schema";
import type { EmailVerificationChallenge } from "../type";
import { applyAuthFormErrors } from "../utils/form-errors";
import { getGoogleAuthErrorMessage } from "../utils/google-auth";
import { getGoogleRedirectHref } from "../utils/google-redirect";
import { AuthCard } from "./auth-card";
import { AuthFormError } from "./auth-form-error";
import { AuthInputField } from "./auth-input-field";
import { OtpForm } from "./otp-form";
import { VerificationSuccess } from "./verification-success";

const passwordChecksId = "signup-password-checks";

function PasswordChecks({ control }: { control: Control<SignupFormValues> }) {
  const [password, confirmation] = useWatch({ control, name: ["password", "password_confirmation"] });
  const checks = [
    // Code points, matching passwordSchema.
    { label: "At least 8 characters", met: Array.from(password).length >= 8 },
    ...(confirmation ? [{ label: "Passwords match", met: password === confirmation }] : []),
  ];

  return (
    <ul id={passwordChecksId} className="-mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {checks.map(({ label, met }) => (
        <li key={label} className={cn("flex items-center gap-1.5", met ? "text-foreground" : "text-muted-foreground")}>
          {met ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
          {label}
          <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
        </li>
      ))}
    </ul>
  );
}

export function SignupForm() {
  const registration = useRegisterMutation();
  const verification = useVerifyEmailMutation();
  const resend = useResendVerificationMutation();
  const [challenge, setChallenge] = useState<EmailVerificationChallenge>();
  const [verified, setVerified] = useState(false);
  const submitting = useRef(false);
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { first_name: "", last_name: "", email: "", username: "", password: "", password_confirmation: "" },
    mode: "onBlur",
  });
  const [redirectingToGoogle, setRedirectingToGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string>();
  const busy = registration.isPending || form.formState.isSubmitting || redirectingToGoogle;
  const errors = form.formState.errors;

  useEffect(() => {
    // Returning with the back button restores this page from the bfcache mid-redirect.
    function restore(event: PageTransitionEvent) {
      if (event.persisted) setRedirectingToGoogle(false);
    }
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  function continueWithGoogle() {
    if (busy) return;
    form.clearErrors();
    setGoogleError(undefined);
    try {
      const redirectHref = getGoogleRedirectHref(false);
      setRedirectingToGoogle(true);
      window.location.assign(redirectHref);
    } catch {
      setGoogleError(getGoogleAuthErrorMessage("GOOGLE_AUTH_UNAVAILABLE"));
    }
  }

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
      eyebrow={verified ? "Step 2 of 2 · Done" : challenge ? "Step 2 of 2 · Verify your email" : "Step 1 of 2 · Your details"}
      title={verified ? "Email verified" : challenge ? "Verify your email" : "Create your account"}
      description={verified ? "Your Medasin account is ready." : challenge ? "One more step to your Medasin workspace." : "A place for your thoughts, plans, and projects."}
      footer={verified ? undefined : 
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Already have an account? <Link href="/login" className="font-medium text-foreground underline underline-offset-4">Sign in</Link></span>
          {challenge ? null : (
            <>
              <span aria-hidden="true">·</span>
              <Link href="/verify-email" className="underline underline-offset-4">Finish verifying</Link>
            </>
          )}
        </p>
      }
    >
      {verified ? (
        <VerificationSuccess />
      ) : challenge ? (
        <OtpForm
          description={`Enter the verification code sent to ${challenge.email}.`}
          codeLifetimeMinutes={60}
          expiresIn={challenge.otp_expires_in}
          resendAfter={challenge.resend_after}
          isPending={verification.isPending}
          onVerify={async (otp) => {
            await verification.mutateAsync({ email: challenge.email, otp, sign_in: false });
            verification.reset();
            setVerified(true);
          }}
          onResend={async () => {
            const response = await resend.mutateAsync({ email: challenge.email });
            resend.reset();
            return response.message;
          }}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <AuthFormError message={errors.root?.server?.message ?? googleError} />
          <Button type="button" variant="outline" onClick={continueWithGoogle} disabled={busy} className="h-11 w-full md:h-9" aria-live="polite">
            <Image src="/images/google-g.png" alt="" width={200} height={204} className="h-auto w-5" sizes="20px" data-icon="inline-start" />
            {redirectingToGoogle ? "Opening Google..." : "Continue with Google"}
          </Button>
          <FieldSeparator>or use your email</FieldSeparator>
          <form onSubmit={(event) => void form.handleSubmit(submit)(event)} noValidate className="flex flex-col gap-5" aria-busy={busy}>
            <FieldGroup className="gap-4">
              <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
                <AuthInputField id="first-name" label="First name" autoComplete="given-name" registration={form.register("first_name")} error={errors.first_name} disabled={busy} />
                <AuthInputField id="last-name" label="Last name" autoComplete="family-name" registration={form.register("last_name")} error={errors.last_name} disabled={busy} />
              </FieldGroup>
              <AuthInputField id="signup-email" label="Email" type="email" autoComplete="email" registration={form.register("email")} error={errors.email} disabled={busy} />
              <AuthInputField id="signup-username" label="Username" autoComplete="username" autoCapitalize="none" spellCheck={false} registration={form.register("username")} error={errors.username} disabled={busy} />
              <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
                <AuthInputField id="signup-password" label="Password" type="password" autoComplete="new-password" registration={form.register("password")} error={errors.password} disabled={busy} describedBy={passwordChecksId} />
                <AuthInputField id="signup-password-confirmation" label="Confirm password" type="password" autoComplete="new-password" registration={form.register("password_confirmation")} error={errors.password_confirmation} disabled={busy} describedBy={passwordChecksId} />
              </FieldGroup>
              {/* Once validation runs, the field errors take over from the checklist. */}
              {!errors.password && !errors.password_confirmation ? <PasswordChecks control={form.control} /> : null}
            </FieldGroup>
            <Button type="submit" size="default" disabled={busy} className="h-11 w-full md:h-9">
              {registration.isPending || form.formState.isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </div>
      )}
    </AuthCard>
  );
}
