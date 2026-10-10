"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { useResourceFormOptions } from "../hooks/use-resource-form-options";
import type { ResourceFormErrors, ResourceMetadataValues } from "../resource-form-utils";
import { ResourceAssignmentSelect } from "./resource-assignment-select";
import { resourceFieldIds } from "./resource-dialog-layout";
import { ResourceMultiSelect, type ResourceSelectOption } from "./resource-multi-select";

const newTagKey = (name: string) => `new:${name.toLowerCase()}`;

export function ResourceOrganizationFields({ values, options, disabled = false, draftTag, errors, onDraftTagChange, onChange }: {
  values: ResourceMetadataValues;
  options: ReturnType<typeof useResourceFormOptions>;
  disabled?: boolean;
  draftTag: string;
  errors: ResourceFormErrors;
  onDraftTagChange: (value: string) => void;
  onChange: (patch: Partial<ResourceMetadataValues>) => void;
}) {
  const tagOptions: ResourceSelectOption[] = options.tagItems.map((item) => ({
    value: values.tagNames.some((name) => name.toLowerCase() === item.name.toLowerCase()) ? newTagKey(item.name) : item.uuid,
    label: item.name,
  }));
  for (const name of values.tagNames) {
    if (!tagOptions.some((item) => item.value === newTagKey(name))) tagOptions.push({ value: newTagKey(name), label: name });
  }
  for (const uuid of values.tagIds) {
    if (!tagOptions.some((item) => item.value === uuid)) {
      const existing = options.tagItems.find((item) => item.uuid === uuid);
      tagOptions.push({ value: uuid, label: existing?.name ?? "Selected tag" });
    }
  }
  const tagName = draftTag.trim();
  if (tagName && tagName.length <= 100 && !tagOptions.some((item) => item.label.toLowerCase() === tagName.toLowerCase())) {
    tagOptions.push({ value: newTagKey(tagName), label: tagName, create: true });
  }

  return (
    <FieldGroup className="gap-5">
      <div className="grid gap-0.5 border-t pt-5">
        <h3 className="text-sm font-semibold">Organize</h3>
        <p className="text-xs text-muted-foreground">Connect this resource to your workspace.</p>
      </div>
      <Field data-invalid={Boolean(errors.tags)} data-disabled={disabled}>
        <FieldLabel htmlFor={resourceFieldIds.tags}>Tags <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
        <ResourceMultiSelect id={resourceFieldIds.tags} label="Tags" options={tagOptions} value={[...values.tagIds, ...values.tagNames.map(newTagKey)]} disabled={disabled} placeholder="Find or create a tag…" search={draftTag} onSearchChange={onDraftTagChange} error={errors.tags} onValueChange={(selected) => onChange({
          tagIds: selected.filter((item) => !item.startsWith("new:")),
          tagNames: selected.filter((item) => item.startsWith("new:")).map((item) => tagOptions.find((option) => option.value === item)!.label),
        })} />
        <FieldDescription className="text-xs">Search existing tags or type a new name.</FieldDescription>
        {errors.tags ? <FieldError id={`${resourceFieldIds.tags}-error`}>{errors.tags}</FieldError> : null}
        {options.tags.isLoading ? <p className="text-xs text-muted-foreground" role="status">Loading tags…</p> : null}
        {options.tags.isError ? <Button type="button" variant="outline" size="sm" className="w-full" disabled={disabled} onClick={() => { void options.tags.refetch(); }}>Retry loading tags</Button> : null}
      </Field>
      <ResourceAssignmentSelect id={resourceFieldIds.projects} label="Project" items={options.projectItems} value={values.projectUuids} loading={options.projects.isLoading} disabled={disabled || options.projects.isLoading || options.projects.isError} error={errors.projects} onValueChange={(projectUuids) => onChange({ projectUuids })} />
      {options.projects.isError ? <Button type="button" variant="outline" size="sm" className="w-full" disabled={disabled} onClick={() => { void options.projects.refetch(); }}>Retry loading projects</Button> : null}
      <ResourceAssignmentSelect id={resourceFieldIds.areas} label="Area" items={options.areaItems} value={values.areaUuids} loading={options.areas.isLoading} disabled={disabled || options.areas.isLoading || options.areas.isError} error={errors.areas} onValueChange={(areaUuids) => onChange({ areaUuids })} />
      {options.areas.isError ? <Button type="button" variant="outline" size="sm" className="w-full" disabled={disabled} onClick={() => { void options.areas.refetch(); }}>Retry loading areas</Button> : null}
    </FieldGroup>
  );
}
