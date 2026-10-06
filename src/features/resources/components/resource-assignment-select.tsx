"use client";

import { useId } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { ResourceMultiSelect } from "./resource-multi-select";

export function ResourceAssignmentSelect({ id, label, items, value, loading, disabled, error, onValueChange }: {
  id?: string;
  label: "Project" | "Area";
  items: { uuid: string; name: string }[];
  value: string[];
  loading: boolean;
  disabled: boolean;
  error?: string;
  onValueChange: (value: string[]) => void;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const plural = `${label.toLowerCase()}s`;
  const known = new Set(items.map((item) => item.uuid));
  const options = [
    ...items.map((item) => ({ value: item.uuid, label: item.name })),
    ...value.filter((uuid) => !known.has(uuid)).map((uuid, index) => ({ value: uuid, label: `${label} ${index + 1}` })),
  ];
  return (
    <Field data-invalid={Boolean(error)} data-disabled={disabled}>
      <FieldLabel htmlFor={controlId}>{label}s <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
      <ResourceMultiSelect id={controlId} label={`${label}s`} options={options} value={value} disabled={disabled} placeholder={loading ? `Loading ${plural}…` : `Search ${plural}…`} error={error} onValueChange={onValueChange} />
      {error ? <FieldError id={`${controlId}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
