import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompleteGoogleLoginMutation, useLoginMutation } from "../queries/auth-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import { loginSchema, type LoginFormValues } from "../schemas/login-schema";
import { ApiError } from "@/lib/axios";
import type { EmailVerificationChallenge, GoogleAuthResult } from "../type";
import { authService } from "../services/auth-service";
import { applyAuthFormErrors } from "../utils/form-errors";
import { getGoogleAuthErrorMessage } from "../utils/google-auth";
import { getRememberedUsername, setRememberedUsername } from "../utils/remembered-username";

type LoginPreference = Pick<LoginFormValues, "username" | "remember_me">;
type LoginVerificationChallenge = EmailVerificationChallenge & LoginPreference;
type GoogleLoginStage = "idle" | "redirecting" | "verifying";

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

export function useLogin(googleResult?: GoogleAuthResult) {
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const googleCallbackHandled = useRef(false);
  const usernameInput = useRef<HTMLInputElement | null>(null);
  const rememberChoiceChanged = useRef(false);
  const [verificationChallenge, setVerificationChallenge] = useState<LoginVerificationChallenge>();
  const [googleStage, setGoogleStage] = useState<GoogleLoginStage>(
    googleResult?.status === "success" ? "verifying" : "idle",
  );
  const [googleError, setGoogleError] = useState<string | undefined>(
    googleResult?.status === "error" ? getGoogleAuthErrorMessage(googleResult.code) : undefined,
  );

  const login = useLoginMutation();
  const { mutate: completeGoogleLogin } = useCompleteGoogleLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", remember_me: false },
  });
  const { getValues, getFieldState, setValue } = form;
  const usernameRegistration = form.register("username");

  useEffect(() => {
    if (!googleResult || googleCallbackHandled.current) {
      return;
    }

    googleCallbackHandled.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("google");
    url.searchParams.delete("code");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

    if (googleResult.status !== "success") {
      return;
    }

    submissionInFlight.current = true;
    completeGoogleLogin(undefined, {
      onSuccess: () => router.replace("/home"),
      onError: (error) => {
        submissionInFlight.current = false;
        setGoogleStage("idle");
        setGoogleError(
          error instanceof ApiError && error.code
            ? getGoogleAuthErrorMessage(error.code)
            : "We couldn't confirm your Google sign-in. Please try again or sign in with your password.",
        );
      },
    });
  }, [googleResult, completeGoogleLogin, router]);

  useEffect(() => {
    function restoreLogin(event: PageTransitionEvent) {
      if (event.persisted) {
        submissionInFlight.current = false;
        setGoogleStage("idle");
      }
    }

    window.addEventListener("pageshow", restoreLogin);
    return () => window.removeEventListener("pageshow", restoreLogin);
  }, []);

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
    setGoogleError(undefined);
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

  function onGoogleSignIn() {
    if (submissionInFlight.current || form.formState.isSubmitting) {
      return;
    }

    submissionInFlight.current = true;
    form.clearErrors();
    setGoogleError(undefined);

    try {
      const redirectUrl = new URL(authService.getGoogleRedirectUrl(getValues("remember_me")), window.location.origin);
      if (!["http:", "https:"].includes(redirectUrl.protocol) || redirectUrl.username || redirectUrl.password) {
        throw new Error("The API URL is invalid.");
      }

      setGoogleStage("redirecting");
      window.location.assign(redirectUrl.href);
    } catch {
      submissionInFlight.current = false;
      setGoogleStage("idle");
      setGoogleError(getGoogleAuthErrorMessage("GOOGLE_AUTH_UNAVAILABLE"));
    }
  }

  function restartLogin() {
    setVerificationChallenge(undefined);
    form.clearErrors();
    form.resetField("password");
    login.reset();
    window.requestAnimationFrame(() => form.setFocus("username"));
  }

  return {
    onSubmit,
    onGoogleSignIn,
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
    googleError,
    isPendingLogin: login.isPending || form.formState.isSubmitting,
    isPendingSignIn: login.isPending || form.formState.isSubmitting || googleStage !== "idle",
    googleSignInLabel: googleStage === "redirecting"
      ? "Opening Google..."
      : googleStage === "verifying" ? "Checking Google sign-in..." : "Continue with Google",
    verificationChallenge,
    restartLogin,
    completeLogin,
    changeRememberMe,
  };
}
