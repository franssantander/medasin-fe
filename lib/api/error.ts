export type ApiErrorBody = {
  error: { code: string; message: string };
};

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly cause?: unknown;

  constructor(params: {
    message: string;
    status: number | null;
    code: string;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.cause = params.cause;
  }
}
