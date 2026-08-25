import type { InternalAxiosRequestConfig } from "axios";

import { axiosClient } from "./client";
import { parseApiError } from "./errors";
import { toast } from "@/components/ui/toast";

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type QueuedRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  config: RetryableRequestConfig;
};

let isRedirectingToLogin = false;
let isRefreshingToken = false;
let refreshQueue: QueuedRequest[] = [];

function redirectToLogin() {
  if (
    typeof window !== "undefined" &&
    window.location.pathname !== "/login" &&
    !isRedirectingToLogin
  ) {
    isRedirectingToLogin = true;
    toast.add({
      type: "error",
      description: "Your session has expired. Please log in again.",
    });
    window.location.assign("/login");
  }
}

axiosClient.interceptors.request.use(
  (config) => {
    return config;
  },

  (error) => {
    return Promise.reject(parseApiError(error));
  },
);

axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error) => {
    const apiError = parseApiError(error);
    const originalRequest = error?.config as RetryableRequestConfig | undefined;
    const requestUrl: string = originalRequest?.url ?? "";
    const isLoginRequest = requestUrl.includes("/auth/login");
    const isRefreshRequest = requestUrl.includes("/auth/refresh");

    const shouldAttemptRefresh =
      apiError.status === 401 &&
      !isLoginRequest &&
      !isRefreshRequest &&
      originalRequest &&
      !originalRequest._retry;

    if (shouldAttemptRefresh && originalRequest) {
      if (isRefreshingToken) {
        originalRequest._retry = true;
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshingToken = true;

      try {
        await axiosClient.post("/auth/refresh");
        isRefreshingToken = false;
        refreshQueue.forEach(({ resolve, config }) =>
          resolve(axiosClient(config)),
        );
        refreshQueue = [];
        return axiosClient(originalRequest);
      } catch {
        isRefreshingToken = false;
        refreshQueue.forEach(({ reject }) => reject(apiError));
        refreshQueue = [];
        redirectToLogin();
        return Promise.reject(apiError);
      }
    }

    switch (apiError.status) {
      case 401:
        if (isLoginRequest) {
          console.warn("Login attempt failed.");
          break;
        }

        if (isRefreshRequest) {
          break;
        }

        console.warn("Session expired or user is unauthenticated.");
        redirectToLogin();
        break;

      case 403:
        console.warn("User is not authorized.");
        break;

      case 422:
        console.warn("Validation error:", apiError.validationErrors);
        break;

      case 429:
        console.warn("Too many requests.");
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        console.error("Server error.");
        break;
    }

    return Promise.reject(apiError);
  },
);
