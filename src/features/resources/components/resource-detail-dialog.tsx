"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Circle, LoaderCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useResourceAutosave } from "../hooks/use-resource-autosave";
import { useResourceFormOptions } from "../hooks/use-resource-form-options";
import { useAddResourceAttachments, useDeleteResource, useDeleteResourceAttachment, useRefreshResourceQueries } from "../queries/resource-query";
import { resourceRequestErrors, type ResourceFormErrors, type ResourceMetadataValues } from "../resource-form-utils";
import { fromResourceDocument, safeResourceUrl, toResourceDocument } from "../resource-document";
import type { Resource, ResourceAttachment, ResourceUpdateInput } from "../type";
import { ResourceAppearanceField } from "./resource-appearance-field";
import { ResourceActionDialog } from "./resource-action-dialog";
import { ResourceAttachmentCard, ResourceImagePreview, ResourceLinkCard, type ResourceImagePreviewValue } from "./resource-attachment-cards";
import { ResourceLinkInput, ResourceNotesField, ResourceTitleField } from "./resource-content-fields";
import { ResourceContentView, ResourceOrganizationView } from "./resource-content-view";
import { resourceFieldIds, ResourceDialogBody, ResourceDialogFooter, ResourceDialogLayout, ResourceDiscardDialog } from "./resource-dialog-layout";
import { ResourceFileDropzone } from "./resource-file-dropzone";
import { ResourceOrganizationFields } from "./resource-organization-fields";

export function ResourceDetailDialog({ resource, onClose, onDeleted }: { resource: Resource; onClose: () => void; onDeleted?: (resourceUuid: string) => void }) {
  // Active resources open straight into an editable page that autosaves;
  // archived resources stay read-only.
  const editable = resource.archived_at === null;
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ResourceMetadataValues>(() => ({
    title: resource.title, icon: resource.icon || "BookOpen", background: resource.background || "#000000", content: fromResourceDocument(resource.content),
    tagIds: resource.tags.map((item) => item.uuid), tagNames: [], projectUuids: resource.projects.map((item) => item.uuid), areaUuids: resource.areas.map((item) => item.uuid),
  }));
  const [attachments, setAttachments] = useState(resource.attachments);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [link, setLink] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [preview, setPreview] = useState<ResourceImagePreviewValue | null>(null);
  const [attachmentErrors, setAttachmentErrors] = useState<ResourceFormErrors>({});
  const [attachmentToDelete, setAttachmentToDelete] = useState<ResourceAttachment | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [closing, setClosing] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [hasAttachmentChanges, setHasAttachmentChanges] = useState(false);
  const finishedClosing = useRef(false);
  const closingRef = useRef(false);
  const attachmentBusyRef = useRef(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const options = useResourceFormOptions(editable, resource);
  const addAttachment = useAddResourceAttachments();
  const removeAttachment = useDeleteResourceAttachment();
  const deleteResource = useDeleteResource(onDeleted);
  const refreshQueries = useRefreshResourceQueries();
  const draft = useMemo<ResourceUpdateInput>(() => ({
    resourceUuid: resource.uuid, title: values.title.trim(), icon: values.icon, background: values.background, content: toResourceDocument(values.content),
    tag_uuids: values.tagIds, tag_names: values.tagNames, project_uuids: values.projectUuids, area_uuids: values.areaUuids,
  }), [resource.uuid, values]);
  const autosave = useResourceAutosave(draft, editable && open && !removing);
  const errors = { ...autosave.errors, ...attachmentErrors };
  const attachmentBusy = addAttachment.isPending || removeAttachment.isPending;
  const busy = closing || attachmentBusy || deleteResource.isPending;
  const hasUnfinishedDraft = Boolean(link.trim() || draftTag.trim() || failedFiles.length);
  const images = attachments.filter((item) => item.kind === "image");
  const files = attachments.filter((item) => item.kind === "file");
  const links = attachments.filter((item) => item.kind === "link");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function update(patch: Partial<ResourceMetadataValues>) { setValues((current) => ({ ...current, ...patch })); }

  function clearAttachmentError(field: keyof ResourceFormErrors) {
    setAttachmentErrors((current) => { const next = { ...current }; delete next[field]; return next; });
  }

  function finishClose() {
    if (finishedClosing.current) return;
    finishedClosing.current = true;
    if (!removing && (autosave.hasSavedChanges || hasAttachmentChanges)) {
      void refreshQueries();
    }
    onClose();
  }

  async function close() {
    if (closingRef.current || attachmentBusyRef.current) return;
    if (!editable || removing) { setOpen(false); return; }
    closingRef.current = true;
    setClosing(true);
    const saved = await autosave.save();
    closingRef.current = false;
    setClosing(false);
    if (!saved || hasUnfinishedDraft) setDiscardOpen(true);
    else setOpen(false);
  }

  async function done() {
    if (!editable || closingRef.current || attachmentBusyRef.current) return;
    if (hasUnfinishedDraft) {
      const unfinished: ResourceFormErrors = {};
      if (link.trim()) unfinished.links = "Add or clear this link before closing.";
      if (draftTag.trim()) unfinished.tags = "Add or clear this tag before closing.";
      if (failedFiles.length) unfinished.files = "Retry or clear these files before closing.";
      setAttachmentErrors((current) => ({ ...current, ...unfinished }));
      const field = link.trim() ? "links" : draftTag.trim() ? "tags" : "files";
      window.requestAnimationFrame(() => document.getElementById(resourceFieldIds[field])?.focus());
      return;
    }
    closingRef.current = true;
    setClosing(true);
    const saved = await autosave.save();
    closingRef.current = false;
    setClosing(false);
    if (!saved) {
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-slot="resource-dialog-body"] [aria-invalid="true"]')?.focus());
      return;
    }
    setOpen(false);
  }

  async function addLink() {
    if (!editable || attachmentBusyRef.current || closingRef.current) return;
    const value = safeResourceUrl(link.trim());
    if (!value || value.length > 4096) { setAttachmentErrors((current) => ({ ...current, links: "Enter a valid HTTP or HTTPS link." })); return; }
    attachmentBusyRef.current = true;
    try {
      const response = await addAttachment.mutateAsync({ resourceUuid: resource.uuid, links: [value] });
      setAttachments(response.data.attachments);
      setHasAttachmentChanges(true);
      setLink("");
      clearAttachmentError("links");
    } catch (cause) { setAttachmentErrors((current) => ({ ...current, links: Object.values(resourceRequestErrors(cause)).join(" ") })); }
    finally { attachmentBusyRef.current = false; }
  }

  async function addFiles(selected: File[]) {
    if (!editable || !selected.length || attachmentBusyRef.current || closingRef.current) return;
    if (selected.length > 10 || selected.some((file) => file.size > 20 * 1024 * 1024)) {
      setAttachmentErrors((current) => ({ ...current, files: "Choose at most 10 files per upload, each 20 MB or smaller." }));
      return;
    }
    attachmentBusyRef.current = true;
    try {
      const response = await addAttachment.mutateAsync({ resourceUuid: resource.uuid, files: selected });
      setAttachments(response.data.attachments);
      setHasAttachmentChanges(true);
      setFailedFiles([]);
      clearAttachmentError("files");
    } catch (cause) {
      setFailedFiles(selected);
      setAttachmentErrors((current) => ({ ...current, files: Object.values(resourceRequestErrors(cause)).join(" ") }));
    }
    finally { attachmentBusyRef.current = false; }
  }

  async function remove(item: ResourceAttachment) {
    if (!editable || attachmentBusyRef.current || closingRef.current) return;
    attachmentBusyRef.current = true;
    setDeletingId(item.uuid);
    try {
      const response = await removeAttachment.mutateAsync({ resourceUuid: resource.uuid, attachmentUuid: item.uuid });
      setAttachments(response.data.attachments);
      setHasAttachmentChanges(true);
      setAttachmentToDelete(null);
      clearAttachmentError("form");
    } catch (cause) { setAttachmentErrors((current) => ({ ...current, form: Object.values(resourceRequestErrors(cause)).join(" ") })); }
    finally { attachmentBusyRef.current = false; setDeletingId(""); }
  }

  const idleStatus = autosave.status === "Saved" && hasUnfinishedDraft ? "Unsaved changes" : autosave.status;
  const status = attachmentBusy
    ? addAttachment.isPending ? "Uploading…" : "Removing attachment…"
    : closing ? "Saving…" : idleStatus;

  return (
    <ResourceDialogLayout open={open} title="Resource details" description={editable ? "Changes save automatically." : "Archived resource · read only"} icon={values.icon} background={values.background} busy={busy} fitContent={!editable} onRequestClose={() => { void close(); }} onClose={finishClose}>
      <ResourceDialogBody
        summary={editable && errors.form ? <Alert variant="destructive"><AlertCircle aria-hidden="true" /><AlertTitle>Changes could not be saved</AlertTitle><AlertDescription>{errors.form}</AlertDescription></Alert> : null}
        main={editable ? (
          <FieldGroup className="gap-6">
            <ResourceTitleField variant="inline" value={values.title} disabled={closing} error={errors.title} onChange={(title) => update({ title })} />
            <ResourceNotesField documentId={resource.uuid} content={values.content} readOnly={!editable || closing} error={errors.notes} onChange={(content) => update({ content })} />
            <FieldGroup className="gap-3">
              {editable ? <ResourceLinkInput value={link} disabled={busy} pending={addAttachment.isPending} error={errors.links} onChange={(value) => { setLink(value); clearAttachmentError("links"); }} onAdd={() => { void addLink(); }} /> : <FieldLabel>Links</FieldLabel>}
              {links.length ? <div className="grid gap-2">{links.map((item) => <ResourceLinkCard key={item.uuid} url={item.url} name={item.name} disabled={busy} deleting={deletingId === item.uuid} onRemove={editable ? () => setAttachmentToDelete(item) : undefined} />)}</div> : !editable ? <p className="text-xs text-muted-foreground">No links</p> : null}
            </FieldGroup>
            <Field id={resourceFieldIds.files} tabIndex={-1} data-invalid={Boolean(errors.files)}>
              <div className="flex items-center justify-between gap-2"><FieldLabel>Images and files</FieldLabel><span className="text-xs tabular-nums text-muted-foreground">{images.length + files.length} attachments</span></div>
              {editable ? <ResourceFileDropzone id="resource-files" disabled={busy || Boolean(failedFiles.length)} pending={addAttachment.isPending} onFiles={(selected) => { void addFiles(selected); }} /> : null}
              {errors.files ? <FieldError>{errors.files}</FieldError> : null}
              {failedFiles.length ? <div className="grid gap-2 rounded-xl border p-3">
                <p className="text-sm font-medium">Upload didn’t finish</p>
                <p className="break-words text-xs text-muted-foreground">{failedFiles.map((file) => file.name).join(", ")}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { void addFiles(failedFiles); }}>Retry upload</Button>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setFailedFiles([]); clearAttachmentError("files"); }}>Clear files</Button>
                </div>
              </div> : null}
              {images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((item) => <ResourceAttachmentCard key={item.uuid} resourceUuid={resource.uuid} attachment={item} disabled={busy} deleting={deletingId === item.uuid} onPreview={setPreview} onRemove={editable ? () => setAttachmentToDelete(item) : undefined} />)}</div> : null}
              {files.length ? <div className="grid gap-2">{files.map((item) => <ResourceAttachmentCard key={item.uuid} resourceUuid={resource.uuid} attachment={item} disabled={busy} deleting={deletingId === item.uuid} onPreview={setPreview} onRemove={editable ? () => setAttachmentToDelete(item) : undefined} />)}</div> : null}
              {!editable && !images.length && !files.length ? <p className="text-xs text-muted-foreground">No images or files</p> : null}
            </Field>
          </FieldGroup>
        ) : <ResourceContentView resourceUuid={resource.uuid} values={values} attachments={attachments} onPreview={setPreview} />}
        sidebar={editable ? <FieldGroup className="gap-6"><ResourceAppearanceField title={values.title} icon={values.icon} background={values.background} disabled={closing} error={errors.appearance} onIconChange={(icon) => update({ icon })} onBackgroundChange={(background) => update({ background })} /><ResourceOrganizationFields values={values} options={options} disabled={closing} draftTag={draftTag} errors={errors} onDraftTagChange={(value) => { setDraftTag(value); clearAttachmentError("tags"); }} onChange={update} /></FieldGroup> : <ResourceOrganizationView values={values} options={options} />}
      />
      <ResourceDialogFooter status={editable ? <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5">{status === "Saved" ? <Check className="size-3.5" aria-hidden="true" /> : busy || autosave.saving ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : autosave.failed ? <AlertCircle className="size-3.5 text-destructive" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}{status}</span> : "Archived resources are read-only."}>
        {editable && autosave.failed ? <Button type="button" variant="outline" disabled={busy} onClick={() => { void autosave.save(); }}>Retry save</Button> : null}
        <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={() => setDeleteOpen(true)}><Trash2 data-icon="inline-start" aria-hidden="true" />Delete resource</Button>
        {editable ? (
          <Button type="button" disabled={busy} onClick={() => { void done(); }}>Done</Button>
        ) : (
          <Button type="button" variant="outline" disabled={busy} onClick={() => { void close(); }}>Close</Button>
        )}
      </ResourceDialogFooter>
      <ResourceActionDialog
        action="delete"
        resource={deleteOpen ? { ...resource, title: values.title } : undefined}
        isPending={deleteResource.isPending}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          if (busy) return;
          // Stop autosave first so no PATCH races the delete.
          setRemoving(true);
          deleteResource.mutate(resource.uuid, {
            onSuccess: () => { setDeleteOpen(false); setOpen(false); },
            onError: () => setRemoving(false),
          });
        }}
      />
      <ResourceImagePreview image={preview} onClose={() => setPreview(null)} />
      <ResourceDiscardDialog open={discardOpen} editing onOpenChange={setDiscardOpen} onDiscard={() => { setDiscardOpen(false); setOpen(false); }} />
      <AlertDialog open={Boolean(attachmentToDelete)} onOpenChange={(next) => { if (!next && !deletingId) setAttachmentToDelete(null); }}>
        <AlertDialogContent initialFocus={cancelDeleteRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>“{attachmentToDelete?.name || attachmentToDelete?.url || "This attachment"}” will move to Trash for 30 days and can be restored from Settings.</AlertDialogDescription>
          </AlertDialogHeader>
          {attachmentErrors.form ? <p role="alert" className="text-sm text-destructive">{attachmentErrors.form}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancelDeleteRef} disabled={Boolean(deletingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={Boolean(deletingId) || !attachmentToDelete} onClick={() => { if (attachmentToDelete) void remove(attachmentToDelete); }}>{deletingId ? "Deleting…" : "Delete attachment"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResourceDialogLayout>
  );
}
