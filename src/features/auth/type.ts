import type { AppFontFamily } from "@/features/settings/types";

export type CurrentUser = {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  username: string;
  font_family?: AppFontFamily;
};

export type AuthResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type CurrentUserResponse = AuthResponse<CurrentUser>;
export type AuthMessageResponse = AuthResponse<null>;
export type LoginRequest = {
  username: string;
  password: string;
  remember_me: boolean;
};
export type RegisterRequest = {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
};
export type EmailVerificationChallenge = {
  email: string;
  verification_required: true;
  otp_expires_in: number;
  resend_after: number;
};
export type RegisterResponse = AuthResponse<EmailVerificationChallenge>;
export type VerificationRequest = { email: string; otp: string };
export type EmailVerificationRequest = VerificationRequest & { remember_me?: boolean };
export type PasswordResetVerificationResponse = AuthResponse<{
  reset_token: string;
  expires_in: number;
}>;
export type ResetPasswordRequest = {
  email: string;
  reset_token: string;
  password: string;
  password_confirmation: string;
};
