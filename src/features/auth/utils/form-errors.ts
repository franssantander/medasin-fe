import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { parseApiError } from "@/lib/axios";

export function applyAuthFormErrors<T extends FieldValues>(
  error: unknown,
  form: UseFormReturn<T>,
  fields: readonly Path<T>[],
) {
  const apiError = parseApiError(error);
  const unmatched: string[] = [];
  let firstField: Path<T> | undefined;

  for (const [field, messages] of Object.entries(apiError.validationErrors ?? {})) {
    const knownField = fields.find((name) => name === field);
    const message = messages[0];
    if (!message) continue;
    if (knownField) {
      form.setError(knownField, { type: "server", message });
      firstField ??= knownField;
    } else {
      unmatched.push(message);
    }
  }

  if (unmatched.length || !firstField) {
    form.setError("root.server", {
      type: "server",
      message: unmatched.length ? unmatched.join(" ") : apiError.message,
    });
  } else {
    // Wait for the failed request's pending state to re-enable the input.
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => form.setFocus(firstField));
    }
  }
  return apiError;
}
