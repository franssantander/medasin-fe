import type { GoogleAuthResult } from "../type";

const googleAuthErrorMessages: Record<string, string> = {
  GOOGLE_OAUTH_CANCELLED: "Google sign-in was cancelled. Try again or sign in with your password.",
  GOOGLE_OAUTH_INVALID_STATE: "Your Google sign-in request has expired or is invalid. Please try again.",
  GOOGLE_OAUTH_INVALID_CALLBACK: "Google sign-in could not be completed. Please start again.",
  GOOGLE_AUTH_UNAVAILABLE: "Google sign-in is temporarily unavailable. Please try again or sign in with your password.",
  GOOGLE_OAUTH_BUSY: "Another Google sign-in request is still processing. Please try again.",
  GOOGLE_PROFILE_INVALID: "Google must provide a verified email address. Try another Google account or sign in with your password.",
  GOOGLE_ACCOUNT_LINK_REQUIRED: "An account with this email already exists. Sign in with your password before linking Google.",
  EMAIL_VERIFICATION_REQUIRED: "Please sign in with your password and verify your email before using Google sign-in.",
};

export function getGoogleAuthErrorMessage(code?: string): string {
  return code && Object.hasOwn(googleAuthErrorMessages, code)
    ? googleAuthErrorMessages[code]
    : "Google sign-in could not be completed. Please try again or sign in with your password.";
}

export function getGoogleAuthResult(
  google: string | string[] | undefined,
  code: string | string[] | undefined,
): GoogleAuthResult | undefined {
  if (google === undefined) {
    return;
  }

  if (google === "success") {
    return { status: "success" };
  }

  return { status: "error", code: google === "error" && typeof code === "string" ? code : undefined };
}
