"use client";

import Link from "next/link";
import Image from "next/image";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { useLogin } from "../hooks/use-login";
import { useResendVerificationMutation, useVerifyEmailMutation } from "../queries/auth-query";
import type { GoogleAuthResult } from "../type";
import { AuthCard } from "./auth-card";
import { AuthFormError } from "./auth-form-error";
import { AuthInputField } from "./auth-input-field";
import { OtpForm } from "./otp-form";

export default function LoginForm({ googleResult }: { googleResult?: GoogleAuthResult }) {
  const verification = useVerifyEmailMutation();
  const resend = useResendVerificationMutation();
  const {
    onSubmit,
    onGoogleSignIn,
    handleSubmit,
    register,
    usernameRegistration,
    control,
    errors,
    googleError,
    isPendingLogin,
    isPendingSignIn,
    googleSignInLabel,
    verificationChallenge,
    restartLogin,
    completeLogin,
    changeRememberMe,
  } = useLogin(googleResult);

  return (
    <AuthCard
      title={verificationChallenge ? "Verify your email" : "Welcome back"}
      description={verificationChallenge ? `Enter the code for ${verificationChallenge.email}.` : "Sign in to your Medasin workspace."}
      footer={verificationChallenge ? undefined : (
        <>
          New to Medasin?{" "}
          <Link href="/register" className="font-medium text-primary underline underline-offset-4">
            Create an account
          </Link>
        </>
      )}
    >
      {verificationChallenge ? (
        <OtpForm
          isPending={verification.isPending}
          codeLifetimeMinutes={60}
          expiresIn={verificationChallenge.otp_expires_in}
          resendAfter={verificationChallenge.resend_after}
          onVerify={async (otp) => {
            await verification.mutateAsync({
              email: verificationChallenge.email,
              otp,
              remember_me: verificationChallenge.remember_me,
            });
            verification.reset();
            completeLogin(verificationChallenge);
          }}
          onResend={async () => {
            const response = await resend.mutateAsync({ email: verificationChallenge.email });
            resend.reset();
            return response.message;
          }}
          onBack={() => {
            verification.reset();
            resend.reset();
            restartLogin();
          }}
          backLabel="Back to sign in"
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5" aria-busy={isPendingSignIn}>
          <AuthFormError message={errors.root?.server?.message ?? googleError} />
          <FieldGroup className="gap-4">
            <AuthInputField
              id="login-username"
              label="Username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              registration={usernameRegistration}
              error={errors.username}
              disabled={isPendingSignIn}
              required
            />
            <AuthInputField
              id="login-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              registration={register("password")}
              error={errors.password}
              disabled={isPendingSignIn}
              required
              labelAction={
                <Link
                  href="/forgot-password"
                  className="flex min-h-11 shrink-0 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring md:min-h-5"
                >
                  Forgot password?
                </Link>
              }
            />
            <Controller
              control={control}
              name="remember_me"
              render={({ field, fieldState }) => (
                <Field orientation="horizontal" className="gap-2" data-disabled={isPendingSignIn} data-invalid={fieldState.invalid}>
                  <Checkbox
                    id="login-remember-me"
                    name={field.name}
                    ref={field.ref}
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      changeRememberMe(checked);
                    }}
                    onBlur={field.onBlur}
                    disabled={isPendingSignIn}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.error ? "login-remember-me-error" : undefined}
                    className="self-center"
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="login-remember-me" className="min-h-11 cursor-pointer md:min-h-5">Remember me</FieldLabel>
                    {fieldState.error ? <FieldError id="login-remember-me-error" errors={[fieldState.error]} /> : null}
                  </FieldContent>
                </Field>
              )}
            />
          </FieldGroup>
          <Button type="submit" size="default" disabled={isPendingSignIn} className="h-11 w-full md:h-9">
            {isPendingLogin ? "Signing in..." : "Sign in"}
          </Button>
          <FieldSeparator>or</FieldSeparator>
          <Button type="button" variant="outline" onClick={onGoogleSignIn} disabled={isPendingSignIn} className="h-11 w-full md:h-9" aria-live="polite">
            <Image src="/images/google-g.png" alt="" width={200} height={204} className="h-auto w-5" sizes="20px" data-icon="inline-start" />
            {googleSignInLabel}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
