"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { parseApiError } from "@/lib/axios";
import {
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyPasswordResetMutation,
} from "../queries/auth-query";
import {
  emailFormSchema,
  resetPasswordSchema,
  type EmailFormValues,
  type ResetPasswordFormValues,
} from "../schemas/auth-schema";
import { applyAuthFormErrors } from "../utils/form-errors";

type RecoveryStep = "email" | "code" | "password" | "success";
type ResetGrant = { token: string; expiresAt: number };

const sentMessage =
  "If an account exists for this email address, a password reset code has been sent.";
const expiredMessage =
  "Your password reset session has expired. Request a new code to continue.";

export function useForgotPassword() {
  const [step, setStep] = useState<RecoveryStep>("email");
  const [email, setEmail] = useState("");
  const [grant, setGrant] = useState<ResetGrant | null>(null);
  const [notice, setNotice] = useState<string>();
  const [codeMessage, setCodeMessage] = useState(sentMessage);
  const sendInFlight = useRef(false);
  const resetInFlight = useRef(false);
  const sendMutation = useForgotPasswordMutation();
  const verifyMutation = useVerifyPasswordResetMutation();
  const resetMutation = useResetPasswordMutation();

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: "" },
  });
  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", password_confirmation: "" },
  });
  const { reset: resetPasswordForm, setFocus: focusPassword } = passwordForm;
  const { setFocus: focusEmail } = emailForm;
  const { reset: resetPasswordMutation } = resetMutation;

  const expireGrant = useCallback(() => {
    setGrant(null);
    resetPasswordMutation();
    resetPasswordForm();
    setNotice(expiredMessage);
    setStep("email");
  }, [resetPasswordForm, resetPasswordMutation]);

  useEffect(() => {
    if (step !== "password" || !grant || resetMutation.isPending) return;

    const timeout = window.setTimeout(
      expireGrant,
      Math.max(0, grant.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [step, grant, resetMutation.isPending, expireGrant]);

  useEffect(() => {
    if (step === "password") focusPassword("password");
    if (step === "email") focusEmail("email");
  }, [step, focusPassword, focusEmail]);

  async function sendCode(values: EmailFormValues) {
    if (sendInFlight.current) return;
    sendInFlight.current = true;
    emailForm.clearErrors();
    setNotice(undefined);

    try {
      const result = await sendMutation.mutateAsync(values);
      setEmail(values.email);
      setCodeMessage(result.message || sentMessage);
      setStep("code");
    } catch (error) {
      applyAuthFormErrors(error, emailForm, ["email"]);
    } finally {
      sendInFlight.current = false;
    }
  }

  async function resendCode() {
    const result = await sendMutation.mutateAsync({ email });
    return result.message || sentMessage;
  }

  async function verifyCode(otp: string) {
    const result = await verifyMutation.mutateAsync({ email, otp });
    setGrant({
      token: result.data.reset_token,
      expiresAt: Date.now() + result.data.expires_in * 1000,
    });
    verifyMutation.reset();
    resetPasswordForm();
    setStep("password");
  }

  async function resetPassword(values: ResetPasswordFormValues) {
    if (resetInFlight.current) return;
    passwordForm.clearErrors();

    if (!grant || Date.now() >= grant.expiresAt) {
      expireGrant();
      return;
    }

    resetInFlight.current = true;
    try {
      await resetMutation.mutateAsync({
        email,
        reset_token: grant.token,
        ...values,
      });
      setGrant(null);
      resetPasswordForm();
      resetMutation.reset();
      setStep("success");
    } catch (error) {
      const apiError = parseApiError(error);
      if (apiError.validationErrors?.reset_token) {
        expireGrant();
      } else {
        applyAuthFormErrors(apiError, passwordForm, [
          "password",
          "password_confirmation",
        ]);
      }
    } finally {
      resetInFlight.current = false;
    }
  }

  function changeEmail() {
    setGrant(null);
    setNotice(undefined);
    emailForm.clearErrors();
    resetPasswordForm();
    setStep("email");
  }

  return {
    step,
    email,
    notice,
    codeMessage,
    emailForm,
    passwordForm,
    sendCode,
    resendCode,
    verifyCode,
    resetPassword,
    changeEmail,
    isSending: sendMutation.isPending || emailForm.formState.isSubmitting,
    isVerifying: verifyMutation.isPending || sendMutation.isPending,
    isResetting: resetMutation.isPending || passwordForm.formState.isSubmitting,
  };
}
