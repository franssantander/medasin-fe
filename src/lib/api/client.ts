import axios, { type AxiosError } from "axios";
import { ApiError, type ApiErrorBody } from "./error";

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/v1`,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[api] ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(
        new ApiError({
          message: "Request timed out",
          status: null,
          code: "TIMEOUT",
          cause: error,
        }),
      );
    }

    if (!error.response) {
      return Promise.reject(
        new ApiError({
          message: "Network error",
          status: null,
          code: "NETWORK_ERROR",
          cause: error,
        }),
      );
    }

    const body = error.response.data;
    if (body && typeof body === "object" && "error" in body) {
      return Promise.reject(
        new ApiError({
          message: body.error.message,
          status: error.response.status,
          code: body.error.code,
          cause: error,
        }),
      );
    }

    return Promise.reject(
      new ApiError({
        message: "Unexpected error response",
        status: error.response.status,
        code: "UNKNOWN",
        cause: error,
      }),
    );
  },
);
