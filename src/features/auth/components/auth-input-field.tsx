"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { FieldError as FormFieldError, UseFormRegisterReturn } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthInputFieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  labelAction?: ReactNode;
  registration: UseFormRegisterReturn;
  error?: FormFieldError;
  hint?: string;
  /** Extra ids describing the input, such as a shared password checklist. */
  describedBy?: string;
};

export function AuthInputField({ id, label, labelAction, registration, error, hint, describedBy, className, type, ...props }: AuthInputFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const descriptions = [hint ? `${id}-hint` : "", describedBy ?? "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  const input = (
    <Input
      required
      {...props}
      {...registration}
      id={id}
      type={isPassword && revealed ? "text" : type}
      className={cn("h-11 md:h-9", isPassword && "pr-10", className)}
      aria-invalid={!!error}
      aria-describedby={descriptions || undefined}
    />
  );

  return (
    <Field className="gap-2" data-invalid={!!error} data-disabled={props.disabled}>
      {labelAction ? (
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {labelAction}
        </div>
      ) : <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            disabled={props.disabled}
            // A toggle keeps one name; aria-pressed carries the state.
            aria-label={`Show ${label.toLowerCase()}`}
            aria-pressed={revealed}
            aria-controls={id}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {revealed ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
      ) : input}
      {hint ? <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription> : null}
      <FieldError id={`${id}-error`} errors={[error]} />
    </Field>
  );
}
