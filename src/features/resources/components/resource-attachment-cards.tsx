"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, ExternalLink, Eye, FileText, LoaderCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatResourceFileSize, resourceRequestErrors } from "../resource-form-utils";
import { safeResourceUrl } from "../resource-document";
import { resourceService } from "../services/resource-service";
import type { ResourceAttachment } from "../type";

export type ResourceImagePreviewValue = { url: string; name: string; size: number | null; onDownload?: () => Promise<void> };

export function useResourceObjectUrl(file: File | null) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Object URLs belong to the effect lifecycle, including Strict Mode replay.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return preview?.file === file ? preview.url : undefined;
}

function ResourceImageCard({ url, name, size, disabled, deleting, saved, error, onPreview, onRemove, onRetry }: {
  url?: string;
  name: string;
  size: number | null;
  disabled?: boolean;
  deleting?: boolean;
  saved?: boolean;
  error?: string;
  onPreview: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted/30">
      {url ? <Image src={url} alt={name} fill unoptimized className="object-cover" /> : (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted-foreground" role="status">
          {error ? <><span>{error}</span><Button type="button" variant="outline" size="sm" onClick={onRetry}>Retry preview</Button></> : <><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading preview…</>}
        </div>
      )}
      {url ? (
        <button type="button" disabled={disabled} aria-label={`View ${name}`} className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none" onClick={onPreview}>
          <span className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-lg bg-background/90 text-foreground"><Eye className="size-4" aria-hidden="true" /></span>
        </button>
      ) : null}
      {onRemove ? <Button type="button" variant="secondary" size="icon-sm" className="absolute right-2 top-2 shadow-sm" disabled={disabled || deleting} aria-label={`Remove ${name}`} onClick={onRemove}>{deleting ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : saved ? <Trash2 aria-hidden="true" /> : <X aria-hidden="true" />}</Button> : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-8 text-white">
        <p className="truncate text-xs font-medium">{name}</p>
        <p className="text-xs text-white/80">{formatResourceFileSize(size)}</p>
      </div>
    </div>
  );
}

export function SelectedResourceImage({ file, disabled, onPreview, onRemove }: { file: File; disabled?: boolean; onPreview: (preview: ResourceImagePreviewValue) => void; onRemove: () => void }) {
  const url = useResourceObjectUrl(file);
  return <ResourceImageCard url={url} name={file.name} size={file.size} disabled={disabled} onPreview={() => { if (url) onPreview({ url, name: file.name, size: file.size }); }} onRemove={onRemove} />;
}

export function ResourceFileCard({ name, size, disabled, deleting, downloading, error, onDownload, onRemove }: {
  name: string;
  size: number | null;
  disabled?: boolean;
  deleting?: boolean;
  downloading?: boolean;
  error?: string;
  onDownload?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg border bg-background p-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"><FileText className="size-4 text-muted-foreground" aria-hidden="true" /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={name}>{name}</p>
        <p className="text-xs text-muted-foreground">{formatResourceFileSize(size)}</p>
        {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
      </div>
      {onDownload ? <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground hover:text-foreground" disabled={downloading} aria-label={`Download ${name}`} onClick={onDownload}>{downloading ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download aria-hidden="true" />}</Button> : null}
      {onRemove ? <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground hover:text-foreground" disabled={disabled || deleting} aria-label={`Remove ${name}`} onClick={onRemove}>{deleting ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <X aria-hidden="true" />}</Button> : null}
    </div>
  );
}

async function downloadResourceAttachment(resourceUuid: string, attachment: ResourceAttachment) {
  const blob = await resourceService.attachment(resourceUuid, attachment.uuid);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = attachment.name || "attachment";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ResourceAttachmentCard({ resourceUuid, attachment, disabled, deleting, onPreview, onRemove }: {
  resourceUuid: string;
  attachment: ResourceAttachment;
  disabled?: boolean;
  deleting?: boolean;
  onPreview: (preview: ResourceImagePreviewValue) => void;
  onRemove?: () => void;
}) {
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const image = attachment.kind === "image";
  const name = attachment.name || (image ? "Image" : "Attachment");
  useEffect(() => {
    if (!image) return;
    const controller = new AbortController();
    let url: string | undefined;
    resourceService.attachment(resourceUuid, attachment.uuid, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setPreview(url);
      setError("");
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(Object.values(resourceRequestErrors(cause)).join(" "));
    });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [attachment.uuid, attempt, image, resourceUuid]);

  async function download() {
    setDownloading(true);
    try {
      await downloadResourceAttachment(resourceUuid, attachment);
      setError("");
    } catch (cause) {
      setError(Object.values(resourceRequestErrors(cause)).join(" "));
    } finally { setDownloading(false); }
  }

  return image ? (
    <ResourceImageCard url={preview} name={name} size={attachment.size} disabled={disabled} deleting={deleting} saved error={error} onRetry={() => { setError(""); setAttempt((value) => value + 1); }} onPreview={() => { if (preview) onPreview({ url: preview, name, size: attachment.size, onDownload: () => downloadResourceAttachment(resourceUuid, attachment) }); }} onRemove={onRemove} />
  ) : <ResourceFileCard name={name} size={attachment.size} disabled={disabled} deleting={deleting} downloading={downloading} error={error} onDownload={() => { void download(); }} onRemove={onRemove} />;
}

export function ResourceLinkCard({ url, name, disabled, deleting, onRemove }: { url: string; name?: string | null; disabled?: boolean; deleting?: boolean; onRemove?: () => void }) {
  const safeUrl = safeResourceUrl(url);
  const label = name || (safeUrl ? new URL(safeUrl).hostname.replace(/^www\./, "") : "Unavailable link");
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg border bg-background p-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"><ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" /></div>
      <div className="min-w-0 flex-1">
        {safeUrl ? <a href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name || url}`} className="block truncate text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{label}</a> : <p className="truncate text-sm">{label}</p>}
        <p className="truncate text-xs text-muted-foreground" title={url}>{url}</p>
      </div>
      {onRemove ? <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground hover:text-foreground" disabled={disabled || deleting} aria-label={`Remove ${name || url}`} onClick={onRemove}>{deleting ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <X aria-hidden="true" />}</Button> : null}
    </div>
  );
}

export function ResourceImagePreview({ image, onClose }: { image: ResourceImagePreviewValue | null; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog open={Boolean(image)} onOpenChange={(open) => { if (!open) { onClose(); setError(""); } }}>
      <DialogContent className="max-w-5xl" showCloseButton={false}>
        <Button type="button" variant="ghost" size="icon-sm" className="absolute right-4 top-4" aria-label="Close" onClick={() => { onClose(); setError(""); }}><X aria-hidden="true" /></Button>
        <DialogHeader className="pr-11">
          <DialogTitle className="break-words">{image?.name}</DialogTitle>
          <DialogDescription>{formatResourceFileSize(image?.size ?? null)}</DialogDescription>
        </DialogHeader>
        {image ? <div className="relative h-[min(60dvh,36rem)] min-h-40 rounded-lg bg-muted"><Image src={image.url} alt={image.name} fill unoptimized className="object-contain" /></div> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {image?.onDownload ? <Button type="button" variant="outline" disabled={downloading} onClick={async () => {
          setDownloading(true);
          try { await image.onDownload?.(); setError(""); }
          catch (cause) { setError(Object.values(resourceRequestErrors(cause)).join(" ")); }
          finally { setDownloading(false); }
        }}>{downloading ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download aria-hidden="true" />}Download image</Button> : null}
      </DialogContent>
    </Dialog>
  );
}
