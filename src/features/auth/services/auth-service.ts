import { axiosClient } from "@/lib/axios";
import type {
  AuthMessageResponse,
  CurrentUserResponse,
  EmailVerificationRequest,
  LoginRequest,
  PasswordResetVerificationResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  VerificationRequest,
} from "../type";

export const authService = {
  getGoogleRedirectUrl(rememberMe: boolean) {
    if (!axiosClient.defaults.baseURL?.trim()) {
      throw new Error("The API URL is not configured.");
    }

    return axiosClient.getUri({
      url: "/auth/google/redirect",
      params: { remember_me: rememberMe ? 1 : 0 },
    });
  },
  login(data: LoginRequest) {
    return axiosClient.post<CurrentUserResponse>("/auth/login", data).then((res) => res.data);
  },
  logout() {
    return axiosClient.post<AuthMessageResponse>("/auth/logout").then((res) => res.data);
  },
  register(data: RegisterRequest) {
    return axiosClient.post<RegisterResponse>("/auth/register", data).then((res) => res.data);
  },
  verifyEmail(data: EmailVerificationRequest) {
    return axiosClient.post<CurrentUserResponse>("/auth/verify-email", data).then((res) => res.data);
  },
  resendVerification(data: { email: string }) {
    return axiosClient.post<AuthMessageResponse>("/auth/resend-verification", data).then((res) => res.data);
  },
  forgotPassword(data: { email: string }) {
    return axiosClient.post<AuthMessageResponse>("/auth/forgot-password", data).then((res) => res.data);
  },
  verifyPasswordReset(data: VerificationRequest) {
    return axiosClient.post<PasswordResetVerificationResponse>("/auth/verify-password-reset", data).then((res) => res.data);
  },
  resetPassword(data: ResetPasswordRequest) {
    return axiosClient.post<AuthMessageResponse>("/auth/reset-password", data).then((res) => res.data);
  },
  getCurrentUser(signal?: AbortSignal) {
    return axiosClient
      .get<CurrentUserResponse>("/auth/me", { signal })
      .then((res) => res.data);
  },
};
