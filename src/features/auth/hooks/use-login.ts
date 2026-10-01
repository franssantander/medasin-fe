import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoginMutation } from "../queries/auth-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import { loginSchema, type LoginFormValues } from "../schemas/login-schema";
import { ApiError } from "@/lib/axios";
import type { EmailVerificationChallenge } from "../type";
import { applyAuthFormErrors } from "../utils/form-errors";
import { getRememberedUsername, setRememberedUsername } from "../utils/remembered-username";

type LoginPreference = Pick<LoginFormValues, "username" | "remember_me">;
type LoginVerificationChallenge = EmailVerificationChallenge & LoginPreference;

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
  const usernameInput = useRef<HTMLInputElement | null>(null);
  const rememberChoiceChanged = useRef(false);
  const [verificationChallenge, setVerificationChallenge] = useState<LoginVerificationChallenge>();

  const login = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", remember_me: false },
  });
  const { getValues, getFieldState, setValue } = form;
  const usernameRegistration = form.register("username");

  useEffect(() => {
    const username = getRememberedUsername();
    if (!username) {
      return;
    }

    const usernameState = getFieldState("username");
    const rememberState = getFieldState("remember_me");

    if (
      !usernameState.isDirty && !usernameState.isTouched &&
      !getValues("username") && !usernameInput.current?.value
    ) {
      setValue("username", username);
    }

    if (!rememberChoiceChanged.current && !rememberState.isDirty && !rememberState.isTouched) {
      setValue("remember_me", true);
    }
  }, [getFieldState, getValues, setValue]);

  function completeLogin({ username, remember_me }: LoginPreference) {
    setRememberedUsername(remember_me ? username : null);
    router.replace("/home");
  }

  function changeRememberMe(checked: boolean) {
    rememberChoiceChanged.current = true;
    if (!checked) {
      setRememberedUsername(null);
    }
  }

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
      completeLogin(data);
    } catch (error) {
      const challenge = getVerificationChallenge(error);
      if (challenge) {
        form.resetField("password");
        login.reset();
        setVerificationChallenge({ ...challenge, username: data.username, remember_me: data.remember_me });
      } else {
        applyAuthFormErrors(error, form, ["username", "password", "remember_me"]);
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
    usernameRegistration: {
      ...usernameRegistration,
      ref: (element: HTMLInputElement | null) => {
        // Registration can replace a value filled by the browser before hydration.
        const existingUsername = element?.value;
        usernameInput.current = element;
        usernameRegistration.ref(element);
        if (existingUsername && element?.value !== existingUsername) {
          setValue("username", existingUsername);
        }
      },
    },
    control: form.control,
    errors: form.formState.errors,
    isPendingLogin: login.isPending || form.formState.isSubmitting,
    verificationChallenge,
    restartLogin,
    completeLogin,
    changeRememberMe,
  };
}
