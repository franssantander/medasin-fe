import { ApiError } from "@/lib/axios/errors";
import { planLimitMetaSchema, type PlanLimitMeta } from "./types";

export function isPlanLimitError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "PLAN_LIMIT_EXCEEDED";
}

export function getPlanLimitMeta(error: unknown): PlanLimitMeta | null {
  if (!isPlanLimitError(error) || typeof error.data !== "object" || error.data === null) {
    return null;
  }

  const parsed = planLimitMetaSchema.safeParse(
    "meta" in error.data ? error.data.meta : undefined,
  );
  return parsed.success ? parsed.data : null;
}
