"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { otpFormSchema, type OtpFormValues } from "../schemas/auth-schema";
import { applyAuthFormErrors } from "../utils/form-errors";
import { AuthFormError } from "./auth-form-error";
import { AuthInputField } from "./auth-input-field";

type OtpFormProps = {
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<string>;
  isPending: boolean;
  error?: string;
  initialCooldown?: boolean;
  resendAfter?: number;
  expiresIn?: number;
  codeLifetimeMinutes?: number;
  description?: string;
  onBack?: () => void;
  backLabel?: string;
  submitLabel?: string;
};

export function OtpForm({
  onVerify, onResend, isPending, error, initialCooldown = true,
  resendAfter, expiresIn, codeLifetimeMinutes = 10,
  description, onBack, backLabel = "Change email", submitLabel = "Verify email",
}: OtpFormProps) {
  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: "" },
    mode: "onBlur",
  });
  const initialResendDelay = resendAfter ?? (initialCooldown ? 60 : 0);
  const initialExpiry = expiresIn ?? codeLifetimeMinutes * 60;
  const [resendDeadline, setResendDeadline] = useState(() => Date.now() + initialResendDelay * 1000);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.ceil(initialResendDelay));
  const [expiryDeadline, setExpiryDeadline] = useState(() => Date.now() + initialExpiry * 1000);
  const [expired, setExpired] = useState(initialExpiry <= 0);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const operationInProgress = useRef(false);
  const busy = isPending || isResending || form.formState.isSubmitting;
  const { setFocus } = form;

  useEffect(() => {
    setFocus("otp");
  }, [setFocus]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const seconds = Math.max(0, Math.ceil((resendDeadline - now) / 1000));
      setSecondsRemaining(seconds);
      const codeExpired = now >= expiryDeadline;
      setExpired(codeExpired);
      if (!seconds && codeExpired) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendDeadline, expiryDeadline]);

  async function verify(values: OtpFormValues) {
    if (operationInProgress.current || isPending) return;
    if (Date.now() >= expiryDeadline) {
      setExpired(true);
      return;
    }
    operationInProgress.current = true;
    form.clearErrors();
    setResendMessage("");
    try {
      await onVerify(values.otp);
    } catch (error) {
      applyAuthFormErrors(error, form, ["otp"]);
    } finally {
      operationInProgress.current = false;
    }
  }

  async function resend() {
    if (operationInProgress.current || busy || secondsRemaining > 0) return;
    operationInProgress.current = true;
    setIsResending(true);
    form.clearErrors();
    setResendMessage("");
    let resent = false;
    try {
      const message = await onResend();
      form.reset({ otp: "" });
      setResendMessage(message);
      setResendDeadline(Date.now() + 60_000);
      setSecondsRemaining(60);
      setExpiryDeadline(Date.now() + codeLifetimeMinutes * 60_000);
      setExpired(false);
      resent = true;
    } catch (error) {
      applyAuthFormErrors(error, form, ["otp"]);
    } finally {
      operationInProgress.current = false;
      setIsResending(false);
      if (resent) window.requestAnimationFrame(() => form.setFocus("otp"));
    }
  }

  return (
    <form onSubmit={(event) => void form.handleSubmit(verify)(event)} noValidate className="flex flex-col gap-5" aria-busy={busy}>
      {description ? <p role="status" className="break-words text-sm text-muted-foreground">{description}</p> : null}
      <AuthFormError message={expired ? "Your verification code has expired. Resend a code to continue." : form.formState.errors.root?.server?.message || error} />
      <FieldGroup className="gap-4">
        <AuthInputField
          id="verification-code"
          label="Verification code"
          registration={form.register("otp")}
          error={form.formState.errors.otp}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="text-center tracking-[0.3em] tabular-nums"
          maxLength={6}
          disabled={busy}
          hint={`Six digits. Expires after ${codeLifetimeMinutes} minutes.`}
        />
      </FieldGroup>
      <FieldGroup className="gap-3">
        <Button type="submit" size="default" disabled={busy || expired} className="h-11 w-full md:h-9">
          {busy && !isResending ? "Verifying..." : submitLabel}
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0">
          <p className="text-sm text-muted-foreground">Didn’t receive a code?</p>
          <Button type="button" variant="link" size="sm" onClick={resend} disabled={busy || secondsRemaining > 0} className="h-11 px-0 md:h-8">
            {isResending ? "Sending code..." : secondsRemaining > 0 ? `Resend code in ${secondsRemaining}s` : "Resend code"}
          </Button>
        </div>
        {resendMessage ? <p role="status" className="text-center text-sm text-muted-foreground">{resendMessage}</p> : null}
        {onBack ? <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={busy} className="h-11 w-fit self-center md:h-8">{backLabel}</Button> : null}
      </FieldGroup>
    </form>
  );
}
