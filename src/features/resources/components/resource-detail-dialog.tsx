"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fromResourceDocument, safeResourceUrl } from "../resource-document";
import { resourceService } from "../services/resource-service";
import type { Resource, ResourceAttachment } from "../type";
import { ResourceEditor } from "./resource-editor";
import { ResourceIcon, resourceBadgeStyle } from "./resource-icons";

function PrivateAttachment({
  resourceUuid,
  attachment,
}: {
  resourceUuid: string;
  attachment: ResourceAttachment;
}) {
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const isImage = attachment.kind === "image";
  useEffect(() => {
    if (!isImage) return;
    const controller = new AbortController();
    let url: string | undefined;
    resourceService
      .attachment(resourceUuid, attachment.uuid, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Image could not be loaded.",
          );
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [resourceUuid, attachment.uuid, isImage, attempt]);
  async function download() {
    setBusy(true);
    setError("");
    try {
      const blob = await resourceService.attachment(
        resourceUuid,
        attachment.uuid,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.name || "attachment";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Download failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-2 rounded-lg border p-3">
      {isImage &&
        (preview ? (
          <Image
            src={preview}
            alt={attachment.name || "Resource image"}
            width={800}
            height={500}
            unoptimized
            className="max-h-80 w-full rounded-md object-contain"
          />
        ) : (
          !error && (
            <p className="text-sm text-muted-foreground">Loading image…</p>
          )
        ))}
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 break-words text-sm">
          {attachment.name || "Attachment"}
          {attachment.size !== null && (
            <span className="ml-2 text-muted-foreground">
              {(attachment.size / 1024 / 1024).toFixed(1)} MB
            </span>
          )}
        </span>
        <Button variant="outline" size="sm" disabled={busy} onClick={download}>
          <Download />
          {busy ? "Downloading…" : "Download"}
        </Button>
      </div>
      {error && (
        <div role="alert" className="text-sm text-destructive">
          {error}
          {isImage && !preview && (
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => {
                setError("");
                setAttempt((value) => value + 1);
              }}
            >
              Retry image
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ResourceDetailDialog({
  resource,
  onClose,
}: {
  resource: Resource;
  onClose: () => void;
}) {
  const legacyUrl = safeResourceUrl(resource.url);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={resourceBadgeStyle(resource.background)}
            >
              <ResourceIcon name={resource.icon} className="size-5" />
            </div>
            <DialogTitle className="break-words">{resource.title}</DialogTitle>
          </div>
          <DialogDescription>
            Resource details and attachments
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {resource.types.map((type) => (
            <Badge key={type} variant="secondary">
              {type}
            </Badge>
          ))}
          {resource.tags.map((tag) => (
            <Badge key={tag.uuid} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
        {resource.content && (
          <ResourceEditor
            id={resource.uuid}
            content={fromResourceDocument(resource.content)}
            readOnly
            onChange={() => undefined}
          />
        )}
        {resource.description && (
          <p className="whitespace-pre-wrap text-sm">{resource.description}</p>
        )}
        {legacyUrl &&
          !resource.attachments.some((item) => item.url === legacyUrl) && (
            <a
              className="break-all text-sm underline"
              href={legacyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {legacyUrl}
            </a>
          )}
        {resource.attachments.map((attachment) =>
          attachment.kind === "link" ? (
            safeResourceUrl(attachment.url) && (
              <a
                key={attachment.uuid}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted"
              >
                <ExternalLink className="size-4 shrink-0" />
                <span className="break-all">
                  {attachment.name || attachment.url}
                </span>
              </a>
            )
          ) : (
            <PrivateAttachment
              key={attachment.uuid}
              resourceUuid={resource.uuid}
              attachment={attachment}
            />
          ),
        )}
        {(resource.projects.length > 0 || resource.areas.length > 0) && (
          <div className="flex flex-wrap gap-3 text-sm">
            {resource.projects.map((project) => (
              <Link
                key={project.uuid}
                href={`/projects/${project.uuid}`}
                className="underline"
              >
                Project: {project.name}
              </Link>
            ))}
            {resource.areas.map((area) => (
              <Link
                key={area.uuid}
                href={`/areas/${area.uuid}`}
                className="underline"
              >
                Area: {area.name}
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
