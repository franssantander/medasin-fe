"use client";

import { Badge } from "@/components/ui/badge";
import { getNoteDocumentPreview } from "@/components/ui/note-editor-document";
import type { useResourceFormOptions } from "../hooks/use-resource-form-options";
import type { ResourceMetadataValues } from "../resource-form-utils";
import type { ResourceAttachment, ResourceTag } from "../type";
import {
  ResourceAttachmentCard,
  ResourceLinkCard,
  type ResourceImagePreviewValue,
} from "./resource-attachment-cards";
import { ResourceEditor } from "./resource-editor";

const noop = () => undefined;

export function ResourceContentView({
  resourceUuid,
  values,
  attachments,
  onPreview,
}: {
  resourceUuid: string;
  values: ResourceMetadataValues;
  attachments: ResourceAttachment[];
  onPreview: (value: ResourceImagePreviewValue) => void;
}) {
  const links = attachments.filter((item) => item.kind === "link");
  const images = attachments.filter((item) => item.kind === "image");
  const files = attachments.filter((item) => item.kind === "file");

  return (
    <div className="grid gap-6" data-slot="resource-content-view">
      <h2 className="break-words text-xl font-semibold leading-snug sm:text-2xl">
        {values.title.trim() || "Untitled resource"}
      </h2>
      <section aria-label="Notes" className="grid gap-3">
        <h3 className="text-sm font-semibold">Notes</h3>
        {getNoteDocumentPreview(values.content) ? (
          <ResourceEditor id={resourceUuid} content={values.content} readOnly presentation="view" onChange={noop} />
        ) : <p className="text-sm text-muted-foreground">No notes yet.</p>}
      </section>
      <section aria-label="Links" className="grid gap-3">
        <h3 className="text-sm font-semibold">Links</h3>
        {links.length ? links.map((item) => (
          <ResourceLinkCard key={item.uuid} url={item.url} name={item.name} />
        )) : <p className="text-sm text-muted-foreground">No links added.</p>}
      </section>
      <section aria-label="Images and files" className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Images and files</h3>
          <span className="text-xs tabular-nums text-muted-foreground">{images.length + files.length} attachments</span>
        </div>
        {images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((item) => (
          <ResourceAttachmentCard key={item.uuid} resourceUuid={resourceUuid} attachment={item} onPreview={onPreview} />
        ))}</div> : null}
        {files.length ? files.map((item) => (
          <ResourceAttachmentCard key={item.uuid} resourceUuid={resourceUuid} attachment={item} onPreview={onPreview} />
        )) : null}
        {!images.length && !files.length ? <p className="text-sm text-muted-foreground">No images or files added.</p> : null}
      </section>
    </div>
  );
}

function selectedNames(ids: string[], options: ResourceTag[], fallback: string) {
  const names = new Map(options.map((item) => [item.uuid, item.name]));
  return ids.map((uuid) => names.get(uuid) ?? fallback);
}

export function ResourceOrganizationView({ values, options }: {
  values: ResourceMetadataValues;
  options: ReturnType<typeof useResourceFormOptions>;
}) {
  const tags = [...new Set([...selectedNames(values.tagIds, options.tagItems, "Selected tag"), ...values.tagNames])];
  const groups = [
    { label: "Tags", names: tags },
    { label: "Projects", names: selectedNames(values.projectUuids, options.projectItems, "Selected project") },
    { label: "Areas", names: selectedNames(values.areaUuids, options.areaItems, "Selected area") },
  ];

  return (
    <div className="grid gap-5">
      <h3 className="text-sm font-semibold">Organization</h3>
      {groups.map(({ label, names }) => (
        <section key={label} aria-label={label} className="grid gap-2">
          <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {names.length ? names.map((name, index) => (
              <Badge key={`${name}-${index}`} variant="outline" className="h-auto max-w-full break-words whitespace-normal">{name}</Badge>
            )) : <p className="text-sm text-muted-foreground">No {label.toLowerCase()}</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
