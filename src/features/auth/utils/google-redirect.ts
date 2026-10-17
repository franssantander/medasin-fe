import { authService } from "../services/auth-service";

/** Absolute URL that starts the Google OAuth flow; throws when the API URL is unusable. */
export function getGoogleRedirectHref(rememberMe: boolean): string {
  const redirectUrl = new URL(authService.getGoogleRedirectUrl(rememberMe), window.location.origin);
  if (!["http:", "https:"].includes(redirectUrl.protocol) || redirectUrl.username || redirectUrl.password) {
    throw new Error("The API URL is invalid.");
  }
  return redirectUrl.href;
}
