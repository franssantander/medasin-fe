"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { EMPTY_NOTE_DOCUMENT } from "@/components/ui/note-editor-document";
import { PlanLimitAlert } from "@/features/subscription/components/plan-limit-alert";
import { isPlanLimitError } from "@/features/subscription/plan-limit-error";
import type { ApiError } from "@/lib/axios";
import { useCreateResource } from "../queries/resource-query";
import { useResourceFormOptions } from "../hooks/use-resource-form-options";
import { includeResourceTag, resourceRequestErrors, resourceValidationErrors, type ResourceFormErrors, type ResourceMetadataValues } from "../resource-form-utils";
import { resourceSchema } from "../schemas/resource-schema";
import { safeResourceUrl, toResourceDocument } from "../resource-document";
import { ResourceAppearanceField } from "./resource-appearance-field";
import { ResourceFileCard, ResourceImagePreview, ResourceLinkCard, SelectedResourceImage, type ResourceImagePreviewValue } from "./resource-attachment-cards";
import { ResourceLinkInput, ResourceNotesField, ResourceTitleField } from "./resource-content-fields";
import { focusResourceErrors, resourceFieldIds, ResourceDialogBody, ResourceDialogFooter, ResourceDialogLayout, ResourceDiscardDialog, ResourceErrorSummary } from "./resource-dialog-layout";
import { ResourceFileDropzone } from "./resource-file-dropzone";
import { ResourceOrganizationFields } from "./resource-organization-fields";

function draftSignature(values: ResourceMetadataValues) {
  return JSON.stringify({ ...values, content: toResourceDocument(values.content) });
}

export function ResourceFormDialog({ onClose, initialProjectUuids = [] }: { onClose: () => void; initialProjectUuids?: string[] }) {
  const [initial] = useState<ResourceMetadataValues>(() => ({
    title: "", icon: "BookOpen", background: "#000000", content: EMPTY_NOTE_DOCUMENT,
    tagNames: [], tagIds: [], projectUuids: [...initialProjectUuids], areaUuids: [],
  }));
  const [values, setValues] = useState(initial);
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ResourceImagePreviewValue | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [errors, setErrors] = useState<ResourceFormErrors>({});
  const [quotaError, setQuotaError] = useState<ApiError | null>(null);
  const quotaAlertRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const options = useResourceFormOptions();
  const create = useCreateResource();
  const dirty = draftSignature(values) !== draftSignature(initial) || Boolean(links.length || files.length || link.trim() || draftTag.trim());
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  const documentFiles = files.filter((file) => !file.type.startsWith("image/"));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function clearError(field: keyof ResourceFormErrors) {
    setErrors((current) => { const next = { ...current }; delete next[field]; return next; });
  }

  function update(patch: Partial<ResourceMetadataValues>) {
    setValues((current) => ({ ...current, ...patch }));
    const field = "title" in patch ? "title" : "icon" in patch || "background" in patch ? "appearance" : "content" in patch ? "notes" : "tagIds" in patch || "tagNames" in patch ? "tags" : "projectUuids" in patch ? "projects" : "areas";
    clearError(field);
  }

  function close() {
    if (submitting.current) return;
    if (dirty) setDiscardOpen(true);
    else setOpen(false);
  }

  function addLink() {
    const value = link.trim();
    if (!safeResourceUrl(value) || value.length > 4096) { setErrors((current) => ({ ...current, links: "Enter a valid HTTP or HTTPS link." })); return; }
    const next = [...new Set([...links, value])];
    if (next.length > 100) { setErrors((current) => ({ ...current, links: "Add at most 100 links." })); return; }
    setLinks(next);
    setLink("");
    clearError("links");
  }

  function addFiles(selected: File[]) {
    const next = [...files, ...selected];
    if (next.length > 10 || next.some((file) => file.size > 20 * 1024 * 1024)) {
      setErrors((current) => ({ ...current, files: "Choose at most 10 files, each 20 MB or smaller." }));
      return;
    }
    setFiles(next);
    clearError("files");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setQuotaError(null);
    const tags = includeResourceTag(draftTag, values.tagIds, values.tagNames, options.tagItems);
    const parsed = resourceSchema.safeParse({
      title: values.title, icon: values.icon, background: values.background,
      links: [...new Set([...links, ...(link.trim() ? [link.trim()] : [])])], files,
      tag_names: tags.names, tag_uuids: tags.ids, project_uuids: values.projectUuids, area_uuids: values.areaUuids,
    });
    if (!parsed.success) { setErrors(resourceValidationErrors(parsed.error.issues)); focusResourceErrors(); return; }
    submitting.current = true;
    setErrors({});
    try {
      await create.mutateAsync({ ...parsed.data, content: toResourceDocument(values.content) });
      setOpen(false);
    } catch (error) {
      if (isPlanLimitError(error)) {
        setQuotaError(error);
        window.requestAnimationFrame(() => quotaAlertRef.current?.focus());
      } else {
        setErrors(resourceRequestErrors(error, "Resource could not be created. Try again."));
        focusResourceErrors();
      }
    } finally { submitting.current = false; }
  }

  return (
    <ResourceDialogLayout open={open} title="New resource" description="Keep notes, links, and files together." icon={values.icon} background={values.background} busy={create.isPending} onRequestClose={close} onClose={onClose}>
      <form id="resource-create-form" noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <ResourceDialogBody
          summary={quotaError ? (
            <div ref={quotaAlertRef} tabIndex={-1}>
              <PlanLimitAlert error={quotaError} />
            </div>
          ) : Object.keys(errors).length ? <ResourceErrorSummary errors={errors} /> : null}
          main={
            <FieldGroup className="gap-6">
              <ResourceTitleField value={values.title} disabled={create.isPending} error={errors.title} onChange={(title) => update({ title })} />
              <ResourceNotesField documentId="new-resource" content={values.content} readOnly={create.isPending} error={errors.notes} onChange={(content) => update({ content })} />
              <FieldGroup className="gap-3">
                <ResourceLinkInput value={link} disabled={create.isPending} error={errors.links} onChange={(value) => { setLink(value); clearError("links"); }} onAdd={addLink} />
                {links.length ? <div className="grid gap-2">{links.map((value) => <ResourceLinkCard key={value} url={value} disabled={create.isPending} onRemove={() => { setLinks((current) => current.filter((item) => item !== value)); clearError("links"); }} />)}</div> : null}
              </FieldGroup>
              <Field id={resourceFieldIds.files} tabIndex={-1} data-invalid={Boolean(errors.files)}>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Images and files</FieldLabel>
                  <span className="text-xs tabular-nums text-muted-foreground">{files.length}/10 selected</span>
                </div>
                <ResourceFileDropzone id="resource-files" disabled={create.isPending} onFiles={addFiles} />
                {errors.files ? <FieldError>{errors.files}</FieldError> : null}
                {imageFiles.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{imageFiles.map((file, index) => <SelectedResourceImage key={`${file.name}-${file.lastModified}-${index}`} file={file} disabled={create.isPending} onPreview={setPreview} onRemove={() => { setFiles((current) => current.filter((item) => item !== file)); clearError("files"); }} />)}</div> : null}
                {documentFiles.length ? <div className="grid gap-2">{documentFiles.map((file, index) => <ResourceFileCard key={`${file.name}-${file.lastModified}-${index}`} name={file.name} size={file.size} disabled={create.isPending} onRemove={() => { setFiles((current) => current.filter((item) => item !== file)); clearError("files"); }} />)}</div> : null}
              </Field>
            </FieldGroup>
          }
          sidebar={
            <FieldGroup className="gap-6">
              <ResourceAppearanceField title={values.title} icon={values.icon} background={values.background} disabled={create.isPending} error={errors.appearance} onIconChange={(icon) => update({ icon })} onBackgroundChange={(background) => update({ background })} />
              <ResourceOrganizationFields values={values} options={options} disabled={create.isPending} draftTag={draftTag} errors={errors} onDraftTagChange={(value) => { setDraftTag(value); clearError("tags"); }} onChange={update} />
            </FieldGroup>
          }
        />
        <ResourceDialogFooter status={"Only a title is required."}>
          <Button type="button" variant="outline" disabled={create.isPending} onClick={close}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" data-icon="inline-start" aria-hidden="true" /> : null}{create.isPending ? "Creating…" : "Create resource"}</Button>
        </ResourceDialogFooter>
      </form>
      <ResourceImagePreview image={preview} onClose={() => setPreview(null)} />
      <ResourceDiscardDialog open={discardOpen} onOpenChange={setDiscardOpen} onDiscard={() => { setDiscardOpen(false); setOpen(false); }} />
    </ResourceDialogLayout>
  );
}
