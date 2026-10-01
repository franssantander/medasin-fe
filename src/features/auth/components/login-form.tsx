"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useLogin } from "../hooks/use-login";
import { useResendVerificationMutation, useVerifyEmailMutation } from "../queries/auth-query";
import { AuthCard } from "./auth-card";
import { AuthFormError } from "./auth-form-error";
import { AuthInputField } from "./auth-input-field";
import { OtpForm } from "./otp-form";

export default function LoginForm() {
  const router = useRouter();
  const verification = useVerifyEmailMutation();
  const resend = useResendVerificationMutation();
  const {
    onSubmit,
    handleSubmit,
    register,
    errors,
    isPendingLogin,
    verificationChallenge,
    restartLogin,
  } = useLogin();

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
            await verification.mutateAsync({ email: verificationChallenge.email, otp });
            verification.reset();
            router.replace("/home");
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
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5" aria-busy={isPendingLogin}>
          <AuthFormError message={errors.root?.server?.message} />
          <FieldGroup className="gap-4">
            <AuthInputField
              id="login-username"
              label="Username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              registration={register("username")}
              error={errors.username}
              disabled={isPendingLogin}
              required
            />
            <AuthInputField
              id="login-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              registration={register("password")}
              error={errors.password}
              disabled={isPendingLogin}
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
          </FieldGroup>
          <Button type="submit" size="default" disabled={isPendingLogin} className="h-11 w-full md:h-9">
            {isPendingLogin ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
