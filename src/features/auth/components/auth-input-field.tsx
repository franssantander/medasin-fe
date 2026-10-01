import type { ComponentProps, ReactNode } from "react";
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
};

export function AuthInputField({ id, label, labelAction, registration, error, hint, className, ...props }: AuthInputFieldProps) {
  const descriptions = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return (
    <Field className="gap-2" data-invalid={!!error} data-disabled={props.disabled}>
      {labelAction ? (
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {labelAction}
        </div>
      ) : <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <Input
        required
        {...props}
        {...registration}
        id={id}
        className={cn("h-11 md:h-9", className)}
        aria-invalid={!!error}
        aria-describedby={descriptions || undefined}
      />
      {hint ? <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription> : null}
      <FieldError id={`${id}-error`} errors={[error]} />
    </Field>
  );
}
