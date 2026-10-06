"use client";

import { Link2, LoaderCircle, Plus } from "lucide-react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { resourceFieldIds } from "./resource-dialog-layout";
import { ResourceEditor } from "./resource-editor";

export function ResourceTitleField({ value, disabled, readOnly, error, onChange }: { value: string; disabled?: boolean; readOnly?: boolean; error?: string; onChange: (value: string) => void }) {
  return (
    <Field data-invalid={Boolean(error)} data-disabled={disabled}>
      <FieldLabel htmlFor={resourceFieldIds.title}>Title <span className="font-normal text-muted-foreground">(required)</span></FieldLabel>
      <Input id={resourceFieldIds.title} value={value} disabled={disabled} readOnly={readOnly} required maxLength={255} autoFocus={!readOnly} aria-invalid={Boolean(error)} aria-describedby={error ? "resource-title-error" : undefined} placeholder="Give your resource a title" className="h-11 font-medium" onChange={(event) => onChange(event.target.value)} />
      {error ? <FieldError id="resource-title-error">{error}</FieldError> : null}
    </Field>
  );
}

export function ResourceNotesField({ documentId, content, readOnly, error, onChange }: { documentId: string; content: string; readOnly?: boolean; error?: string; onChange: (value: string) => void }) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel id="resource-notes-label">Notes</FieldLabel>
      <FieldDescription>Capture ideas, context, or a quick summary.</FieldDescription>
      <div id={resourceFieldIds.notes} role="group" aria-labelledby="resource-notes-label" tabIndex={-1}>
        <ResourceEditor id={documentId} content={content} onChange={onChange} readOnly={readOnly} />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

export function ResourceLinkInput({ value, disabled, pending, error, onChange, onAdd }: { value: string; disabled?: boolean; pending?: boolean; error?: string; onChange: (value: string) => void; onAdd: () => void }) {
  return (
    <Field data-invalid={Boolean(error)} data-disabled={disabled || pending}>
      <FieldLabel htmlFor={resourceFieldIds.links}>Links</FieldLabel>
      <FieldDescription>Add useful websites, documents, or references.</FieldDescription>
      <InputGroup className="h-11">
        <InputGroupInput id={resourceFieldIds.links} type="url" value={value} maxLength={4096} disabled={disabled || pending} aria-invalid={Boolean(error)} aria-describedby={error ? "resource-link-error" : "resource-link-hint"} placeholder="Paste an https:// link" className="h-11 min-w-0" onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onAdd(); } }} />
        <InputGroupAddon><Link2 aria-hidden="true" /></InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton className="h-11 px-3" disabled={disabled || pending || !value.trim()} aria-label="Add link" onClick={onAdd}>
            {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus aria-hidden="true" />}
            <span className="hidden sm:inline">Add link</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription id="resource-link-hint">Use a complete HTTP or HTTPS URL. Press Enter to add.</FieldDescription>
      {error ? <FieldError id="resource-link-error">{error}</FieldError> : null}
    </Field>
  );
}
