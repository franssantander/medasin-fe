import axios from "axios";

export type ApiValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  code?: string;
  validationErrors?: ApiValidationErrors;
  data?: unknown;

  constructor(
    message: string,
    status: number,
    options?: {
      code?: string;
      validationErrors?: ApiValidationErrors;
      data?: unknown;
    },
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.validationErrors = options?.validationErrors;
    this.data = options?.data;
  }
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const response = error.response;

    const status = response?.status ?? 0;

    const responseData = response?.data;

    return new ApiError(
      responseData?.message ?? getDefaultErrorMessage(status),
      status,
      {
        code: responseData?.code,
        validationErrors: responseData?.errors,
        data: responseData,
      },
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 0);
  }

  return new ApiError("An unexpected error occurred.", 0);
}

function getDefaultErrorMessage(status: number) {
  switch (status) {
    case 400:
      return "The request was invalid.";

    case 401:
      return "You are not authenticated.";

    case 403:
      return "You do not have permission to perform this action.";

    case 404:
      return "The requested resource was not found.";

    case 422:
      return "The submitted data is invalid.";

    case 429:
      return "Too many requests. Please try again later.";

    case 500:
      return "Something went wrong on the server.";

    case 502:
    case 503:
    case 504:
      return "The server is currently unavailable.";

    default:
      return "An unexpected error occurred.";
  }
}
