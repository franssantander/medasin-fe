"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { otpFormSchema, type OtpFormValues } from "../schemas/auth-schema";
import { applyAuthFormErrors } from "../utils/form-errors";
import { AuthFormError } from "./auth-form-error";

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
        <Controller
          control={form.control}
          name="otp"
          render={({ field, fieldState }) => {
            const invalid = !!fieldState.error;
            return (
              <Field className="gap-2" data-invalid={invalid} data-disabled={busy}>
                <FieldLabel htmlFor="verification-code">Verification code</FieldLabel>
                <InputOTP
                  id="verification-code"
                  ref={field.ref}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={busy}
                  required
                  aria-invalid={invalid}
                  aria-describedby={["verification-code-hint", invalid ? "verification-code-error" : ""].filter(Boolean).join(" ")}
                  containerClassName="w-full gap-2 sm:gap-3"
                >
                  {[[0, 1, 2], [3, 4, 5]].map((slots, group) => (
                    <Fragment key={group}>
                      {group ? <InputOTPSeparator className="text-muted-foreground" /> : null}
                      <InputOTPGroup className="flex-1">
                        {slots.map((index) => (
                          <InputOTPSlot key={index} index={index} aria-invalid={invalid} className="h-12 flex-1 text-lg font-medium tabular-nums" />
                        ))}
                      </InputOTPGroup>
                    </Fragment>
                  ))}
                </InputOTP>
                <FieldDescription id="verification-code-hint">Six digits. Expires after {codeLifetimeMinutes} minutes.</FieldDescription>
                <FieldError id="verification-code-error" errors={[fieldState.error]} />
              </Field>
            );
          }}
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
