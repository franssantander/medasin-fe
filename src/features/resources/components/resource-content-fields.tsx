"use client";

import { Link2, LoaderCircle, Plus } from "lucide-react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { resourceFieldIds } from "./resource-dialog-layout";
import { ResourceEditor } from "./resource-editor";

export function ResourceTitleField({ value, disabled, readOnly, error, variant = "field", onChange }: { value: string; disabled?: boolean; readOnly?: boolean; error?: string; variant?: "field" | "inline"; onChange: (value: string) => void }) {
  const inline = variant === "inline";
  return (
    <Field data-invalid={Boolean(error)} data-disabled={disabled}>
      <FieldLabel htmlFor={resourceFieldIds.title} className={inline ? "sr-only" : undefined}>Title <span className="font-normal text-muted-foreground">(required)</span></FieldLabel>
      <Input
        id={resourceFieldIds.title}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        required
        maxLength={255}
        autoFocus={!inline && !readOnly}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "resource-title-error" : undefined}
        placeholder={inline ? "Untitled resource" : "Give your resource a title"}
        className={inline
          ? "h-auto rounded-none border-0 bg-transparent px-0 py-1 text-2xl font-semibold leading-tight shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 aria-invalid:ring-0 md:text-2xl dark:bg-transparent"
          : "font-medium"}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <FieldError id="resource-title-error">{error}</FieldError> : null}
    </Field>
  );
}

export function ResourceNotesField({ documentId, content, readOnly, error, onChange }: { documentId: string; content: string; readOnly?: boolean; error?: string; onChange: (value: string) => void }) {
  return (
    <Field data-invalid={Boolean(error)}>
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel id="resource-notes-label">Notes</FieldLabel>
        <span className="text-xs text-muted-foreground">Type / for formatting</span>
      </div>
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
      <InputGroup>
        <InputGroupInput id={resourceFieldIds.links} type="url" value={value} maxLength={4096} disabled={disabled || pending} aria-invalid={Boolean(error)} aria-describedby={error ? "resource-link-error" : "resource-link-hint"} placeholder="Paste an https:// link" className="min-w-0" onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onAdd(); } }} />
        <InputGroupAddon><Link2 aria-hidden="true" /></InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton variant="secondary" disabled={disabled || pending || !value.trim()} aria-label="Add link" onClick={onAdd}>
            {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus aria-hidden="true" />}
            <span className="hidden sm:inline">Add link</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription id="resource-link-hint" className="text-xs">Websites, documents, or references. Paste a full http(s) URL and press Enter.</FieldDescription>
      {error ? <FieldError id="resource-link-error">{error}</FieldError> : null}
    </Field>
  );
}
