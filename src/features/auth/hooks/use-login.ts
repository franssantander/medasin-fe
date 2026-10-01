import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoginMutation } from "../queries/auth-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import { loginSchema, type LoginFormValues } from "../schemas/login-schema";
import { ApiError } from "@/lib/axios";
import type { EmailVerificationChallenge } from "../type";
import { applyAuthFormErrors } from "../utils/form-errors";

function getVerificationChallenge(error: unknown): EmailVerificationChallenge | undefined {
  if (
    !(error instanceof ApiError) ||
    error.status !== 422 ||
    error.code !== "EMAIL_VERIFICATION_REQUIRED" ||
    !error.data ||
    typeof error.data !== "object" ||
    !("data" in error.data)
  ) {
    return;
  }

  const challenge = error.data.data;
  if (
    !challenge ||
    typeof challenge !== "object" ||
    !("email" in challenge) ||
    typeof challenge.email !== "string" ||
    !challenge.email.trim() ||
    !("verification_required" in challenge) ||
    challenge.verification_required !== true ||
    !("otp_expires_in" in challenge) ||
    typeof challenge.otp_expires_in !== "number" ||
    !Number.isFinite(challenge.otp_expires_in) ||
    challenge.otp_expires_in < 0 ||
    !("resend_after" in challenge) ||
    typeof challenge.resend_after !== "number" ||
    !Number.isFinite(challenge.resend_after) ||
    challenge.resend_after < 0
  ) {
    return;
  }

  return {
    email: challenge.email,
    verification_required: true,
    otp_expires_in: challenge.otp_expires_in,
    resend_after: challenge.resend_after,
  };
}

export function useLogin() {
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const [verificationChallenge, setVerificationChallenge] = useState<EmailVerificationChallenge>();

  const login = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    if (submissionInFlight.current) {
      return;
    }

    submissionInFlight.current = true;
    form.clearErrors();
    setVerificationChallenge(undefined);

    try {
      await login.mutateAsync(data);
      login.reset();
      router.replace("/home");
    } catch (error) {
      const challenge = getVerificationChallenge(error);
      if (challenge) {
        form.resetField("password");
        login.reset();
        setVerificationChallenge(challenge);
      } else {
        applyAuthFormErrors(error, form, ["username", "password"]);
      }
    } finally {
      submissionInFlight.current = false;
    }
  };

  function restartLogin() {
    setVerificationChallenge(undefined);
    form.clearErrors();
    form.resetField("password");
    login.reset();
    window.requestAnimationFrame(() => form.setFocus("username"));
  }

  return {
    onSubmit,
    handleSubmit: form.handleSubmit,
    register: form.register,
    errors: form.formState.errors,
    isPendingLogin: login.isPending || form.formState.isSubmitting,
    verificationChallenge,
    restartLogin,
  };
}
