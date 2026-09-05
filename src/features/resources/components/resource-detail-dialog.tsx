"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Link2,
  LoaderCircle,
  Palette,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { areaService } from "@/features/areas/services/area-service";
import { projectService } from "@/features/projects/services/project-service";
import { ApiError } from "@/lib/axios";
import {
  fromResourceDocument,
  safeResourceUrl,
  toResourceDocument,
} from "../resource-document";
import {
  useAddResourceAttachments,
  useDeleteResourceAttachment,
  useResourceTagsQuery,
  useUpdateResource,
} from "../queries/resource-query";
import { resourceService } from "../services/resource-service";
import type {
  Resource,
  ResourceAttachment,
  ResourceUpdateInput,
} from "../type";
import { ResourceEditor } from "./resource-editor";
import { ResourceAssignmentSelect } from "./resource-assignment-select";
import {
  RESOURCE_BADGE_COLORS,
  RESOURCE_ICONS,
  ResourceIcon,
  resourceBadgeStyle,
} from "./resource-icons";

type SaveState = "idle" | "saving" | "saved" | "error";

function message(error: unknown) {
  if (error instanceof ApiError && error.validationErrors) {
    return Object.values(error.validationErrors).flat().join(" ");
  }
  return error instanceof Error ? error.message : "Changes could not be saved.";
}

function AttachmentCard({
  resourceUuid,
  attachment,
  editable,
  deleting,
  onDelete,
}: {
  resourceUuid: string;
  attachment: ResourceAttachment;
  editable: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const image = attachment.kind === "image";

  useEffect(() => {
    if (!image) return;
    const controller = new AbortController();
    let url: string | undefined;
    resourceService
      .attachment(resourceUuid, attachment.uuid, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(message(cause));
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.uuid, image, resourceUuid]);

  async function download() {
    setDownloading(true);
    try {
      const blob = await resourceService.attachment(
        resourceUuid,
        attachment.uuid,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.name || "attachment";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setDownloading(false);
    }
  }

  if (image) {
    return (
      <div className="group relative aspect-square overflow-hidden rounded-xl border bg-muted/30">
        {preview ? (
          <Image
            src={preview}
            alt={attachment.name || "Resource image"}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
            {error || "Loading image…"}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10 text-white">
          <p className="truncate text-xs font-medium">
            {attachment.name || "Image"}
          </p>
        </div>
        {preview && (
          <button
            type="button"
            className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            aria-label={`View ${attachment.name || "image"}`}
            onClick={() => window.open(preview, "_blank", "noopener,noreferrer")}
          />
        )}
        {editable && (
          <Button
            size="icon-xs"
            variant="secondary"
            className="absolute right-2 top-2 z-10"
            disabled={deleting}
            aria-label="Remove image"
            onClick={onDelete}
          >
            {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/10 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileText className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {attachment.name || "Attachment"}
        </p>
        {attachment.size !== null && (
          <p className="text-xs text-muted-foreground">
            {(attachment.size / 1024 / 1024).toFixed(1)} MB
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={downloading}
        aria-label="Download attachment"
        onClick={download}
      >
        <Download />
      </Button>
      {editable && (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={deleting}
          aria-label="Remove attachment"
          onClick={onDelete}
        >
          {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
        </Button>
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
  const [open, setOpen] = useState(false);
  const editable = resource.archived_at === null;
  const [current, setCurrent] = useState(resource);
  const [title, setTitle] = useState(resource.title);
  const [icon, setIcon] = useState(resource.icon || "BookOpen");
  const [background, setBackground] = useState(
    resource.background || "#000000",
  );
  const [content, setContent] = useState(
    fromResourceDocument(resource.content),
  );
  const [tagIds, setTagIds] = useState(
    resource.tags.map((item) => item.uuid),
  );
  const [newTags, setNewTags] = useState<string[]>([]);
  const [projectUuids, setProjectUuids] = useState(
    resource.projects.map((item) => item.uuid),
  );
  const [areaUuids, setAreaUuids] = useState(
    resource.areas.map((item) => item.uuid),
  );
  const [link, setLink] = useState("");
  const [tag, setTag] = useState("");
  const [iconSearch, setIconSearch] = useState("");
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const lastSaved = useRef("");
  const saveSequence = useRef(0);
  const { mutateAsync: saveResource } = useUpdateResource();
  const addAttachment = useAddResourceAttachments();
  const removeAttachment = useDeleteResourceAttachment();
  const tags = useResourceTagsQuery();
  const projects = useQuery({
    queryKey: ["projects", "list", "active"],
    queryFn: () => projectService.list("active"),
    enabled: editable,
  });
  const areas = useQuery({
    queryKey: ["areas", "list", "active"],
    queryFn: () => areaService.list("active"),
    enabled: editable,
  });
  const icons = useMemo(() => {
    const search = iconSearch.trim().toLowerCase();
    return search
      ? RESOURCE_ICONS.filter((item) =>
          item.name.toLowerCase().includes(search),
        )
      : RESOURCE_ICONS;
  }, [iconSearch]);
  const draft: ResourceUpdateInput = useMemo(
    () => ({
      resourceUuid: resource.uuid,
      title: title.trim(),
      icon,
      background,
      content: toResourceDocument(content),
      tag_uuids: tagIds,
      tag_names: newTags,
      project_uuids: projectUuids,
      area_uuids: areaUuids,
    }),
    [
      areaUuids,
      background,
      content,
      icon,
      newTags,
      projectUuids,
      resource.uuid,
      tagIds,
      title,
    ],
  );
  const signature = JSON.stringify(draft);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!lastSaved.current) {
      lastSaved.current = signature;
      return;
    }
    if (
      !editable ||
      signature === lastSaved.current ||
      !draft.title ||
      !/^#[0-9a-f]{6}$/i.test(background)
    ) {
      return;
    }
    setSaveState("idle");
    const timer = window.setTimeout(async () => {
      const sequence = ++saveSequence.current;
      setSaveState("saving");
      setError("");
      try {
        const response = await saveResource(draft);
        if (sequence !== saveSequence.current) return;
        lastSaved.current = signature;
        setCurrent(response.data);
        setTagIds(response.data.tags.map((item) => item.uuid));
        setProjectUuids(response.data.projects.map((item) => item.uuid));
        setAreaUuids(response.data.areas.map((item) => item.uuid));
        setNewTags([]);
        setSaveState("saved");
      } catch (cause) {
        if (sequence !== saveSequence.current) return;
        setError(message(cause));
        setSaveState("error");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [background, draft, editable, saveResource, signature]);

  function close() {
    const dirty = signature !== lastSaved.current;
    if (
      (dirty || saveState === "saving" || saveState === "error") &&
      !window.confirm(
        "Your latest changes may not be saved. Discard them and close?",
      )
    ) {
      return;
    }
    setOpen(false);
  }

  async function addLink() {
    const value = safeResourceUrl(link.trim());
    if (!value) {
      setError("Enter a valid HTTP or HTTPS link.");
      return;
    }
    try {
      const response = await addAttachment.mutateAsync({
        resourceUuid: resource.uuid,
        links: [value],
      });
      setCurrent(response.data);
      setLink("");
      setError("");
    } catch (cause) {
      setError(message(cause));
    }
  }

  async function addFiles(files: File[]) {
    if (!files.length) return;
    if (
      files.length > 10 ||
      files.some((file) => file.size > 20 * 1024 * 1024)
    ) {
      setError("Choose at most 10 files, each 20 MB or smaller.");
      return;
    }
    try {
      const response = await addAttachment.mutateAsync({
        resourceUuid: resource.uuid,
        files,
      });
      setCurrent(response.data);
      setError("");
    } catch (cause) {
      setError(message(cause));
    }
  }

  async function remove(item: ResourceAttachment) {
    setDeletingId(item.uuid);
    try {
      const response = await removeAttachment.mutateAsync({
        resourceUuid: resource.uuid,
        attachmentUuid: item.uuid,
      });
      setCurrent(response.data);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setDeletingId("");
    }
  }

  function addTag() {
    const value = tag.trim();
    if (!value) return;
    const existing = tags.data?.data.find(
      (item) => item.name.toLowerCase() === value.toLowerCase(),
    );
    if (existing) {
      setTagIds((items) =>
        items.includes(existing.uuid) ? items : [...items, existing.uuid],
      );
    } else {
      setNewTags((items) =>
        items.some((item) => item.toLowerCase() === value.toLowerCase())
          ? items
          : [...items, value],
      );
    }
    setTag("");
  }

  const images = current.attachments.filter((item) => item.kind === "image");
  const files = current.attachments.filter((item) => item.kind === "file");
  const links = current.attachments.filter((item) => item.kind === "link");
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && close()}
      onOpenChangeComplete={(nextOpen) => !nextOpen && onClose()}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] w-[calc(100%-1rem)] max-w-6xl overflow-x-hidden overflow-y-auto p-0 sm:w-[calc(100%-2rem)]"
      >
        <DialogHeader className="sticky top-0 z-20 border-b bg-background/95 px-6 py-5 backdrop-blur">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={resourceBadgeStyle(background)}
            >
              <ResourceIcon name={icon} className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="sr-only">
                Edit {resource.title}
              </DialogTitle>
              {editable ? (
                <Input
                  value={title}
                  maxLength={255}
                  aria-label="Resource title"
                  className="h-auto border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                  onChange={(event) => setTitle(event.target.value)}
                />
              ) : (
                <h2 className="break-words text-lg font-semibold">{title}</h2>
              )}
              <DialogDescription>
                {editable
                  ? "Changes save automatically"
                  : "Archived resource details"}
              </DialogDescription>
            </div>
            {editable && (
              <div
                className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"
                aria-live="polite"
              >
                {saveState === "saving" && (
                  <LoaderCircle className="size-3.5 animate-spin" />
                )}
                {saveState === "saved" && (
                  <Check className="size-3.5 text-emerald-600" />
                )}
                {saveState === "error"
                  ? "Save failed"
                  : saveState === "saving"
                    ? "Saving…"
                    : saveState === "saved"
                      ? "Saved"
                      : ""}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Close resource details"
              onClick={close}
            >
              <X />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid gap-6 p-6">
          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <span>{error}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setError("")}
              >
                <X />
              </Button>
            </div>
          )}

          {editable && (
            <Accordion
              multiple
              value={appearanceOpen ? ["appearance"] : []}
              onValueChange={(value) =>
                setAppearanceOpen(value.includes("appearance"))
              }
            >
              <AccordionItem
                value="appearance"
                className="overflow-hidden rounded-xl border"
              >
                <div className="flex items-center gap-3 bg-muted/20 p-3">
                  <Palette className="size-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Appearance</p>
                    <p className="text-xs text-muted-foreground">
                      Optional icon and badge color
                    </p>
                  </div>
                  <AccordionHeader>
                    <AccordionTrigger className="size-auto px-2.5 text-sm">
                      Customize
                    </AccordionTrigger>
                  </AccordionHeader>
                </div>
                <AccordionContent>
                  <div className="grid gap-4 border-t p-4">
                    <div className="grid grid-cols-[repeat(auto-fill,2rem)] gap-2">
                      {RESOURCE_BADGE_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          title={color.name}
                          aria-pressed={
                            background.toLowerCase() ===
                            color.value.toLowerCase()
                          }
                          className="flex size-8 items-center justify-center rounded-full border border-black/10 shadow-sm outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          style={{ backgroundColor: color.value }}
                          onClick={() => setBackground(color.value)}
                        >
                          {background.toLowerCase() ===
                            color.value.toLowerCase() && (
                            <Check
                              className="size-4"
                              style={{
                                color: resourceBadgeStyle(color.value).color,
                              }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={background}
                      maxLength={7}
                      aria-label="Custom badge color"
                      className="font-mono uppercase"
                      onChange={(event) => setBackground(event.target.value)}
                    />
                    <div className="overflow-hidden rounded-xl border">
                      <div className="relative border-b p-3">
                        <Search className="absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={iconSearch}
                          placeholder="Search icons…"
                          className="pl-9"
                          onChange={(event) =>
                            setIconSearch(event.target.value)
                          }
                        />
                      </div>
                      <div className="grid max-h-40 grid-cols-[repeat(auto-fill,2rem)] justify-between gap-1 overflow-y-auto p-3">
                        {icons.map(({ name, icon: Icon }) => (
                          <button
                            key={name}
                            type="button"
                            title={name}
                            aria-pressed={icon === name}
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                            onClick={() => setIcon(name)}
                          >
                            <Icon className="size-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">Notes</h3>
            <ResourceEditor
              id={resource.uuid}
              content={content}
              onChange={setContent}
              readOnly={!editable}
            />
          </section>

          {editable && (
            <section className="grid gap-3">
              <div>
                <h3 className="text-sm font-semibold">Organize</h3>
                <p className="text-xs text-muted-foreground">
                  Connect this resource to your workspace.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ResourceAssignmentSelect
                  label="Project"
                  items={projects.data?.data ?? current.projects}
                  value={projectUuids}
                  loading={projects.isLoading}
                  disabled={projects.isLoading || projects.isError}
                  onValueChange={setProjectUuids}
                />
                <ResourceAssignmentSelect
                  label="Area"
                  items={areas.data?.data ?? current.areas}
                  value={areaUuids}
                  loading={areas.isLoading}
                  disabled={areas.isLoading || areas.isError}
                  onValueChange={setAreaUuids}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={tag}
                  maxLength={100}
                  placeholder="Add a tag"
                  onChange={(event) => setTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Tag />
                  Add tag
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.data?.data.map((item) => (
                  <Button
                    key={item.uuid}
                    type="button"
                    size="sm"
                    variant={tagIds.includes(item.uuid) ? "default" : "outline"}
                    onClick={() =>
                      setTagIds((ids) =>
                        ids.includes(item.uuid)
                          ? ids.filter((id) => id !== item.uuid)
                          : [...ids, item.uuid],
                      )
                    }
                  >
                    {item.name}
                  </Button>
                ))}
                {newTags.map((name) => (
                  <Button
                    key={name}
                    type="button"
                    size="sm"
                    onClick={() =>
                      setNewTags((items) =>
                        items.filter((item) => item !== name),
                      )
                    }
                  >
                    {name}
                    <X />
                  </Button>
                ))}
              </div>
            </section>
          )}

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Images and files</h3>
                <p className="text-xs text-muted-foreground">
                  {images.length + files.length} attachments
                </p>
              </div>
              {editable && (
                <>
                  <Input
                    ref={fileInput}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      void addFiles(Array.from(event.target.files || []));
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={addAttachment.isPending}
                    onClick={() => fileInput.current?.click()}
                  >
                    <FilePlus2 />
                    Add files
                  </Button>
                </>
              )}
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.map((item) => (
                  <AttachmentCard
                    key={item.uuid}
                    resourceUuid={resource.uuid}
                    attachment={item}
                    editable={editable}
                    deleting={deletingId === item.uuid}
                    onDelete={() => void remove(item)}
                  />
                ))}
              </div>
            )}
            <div className="grid gap-2">
              {files.map((item) => (
                <AttachmentCard
                  key={item.uuid}
                  resourceUuid={resource.uuid}
                  attachment={item}
                  editable={editable}
                  deleting={deletingId === item.uuid}
                  onDelete={() => void remove(item)}
                />
              ))}
            </div>
            {!images.length && !files.length && (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No images or files yet.
              </div>
            )}
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-semibold">Links</h3>
            {editable && (
              <div className="flex gap-2">
                <Input
                  value={link}
                  placeholder="https://example.com"
                  onChange={(event) => setLink(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addLink();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={addAttachment.isPending}
                  onClick={() => void addLink()}
                >
                  <Link2 />
                  Add link
                </Button>
              </div>
            )}
            {links.map((item) => (
              <div
                key={item.uuid}
                className="flex items-center gap-2 rounded-xl border p-3"
              >
                <ExternalLink className="size-4 shrink-0" />
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  {item.name || item.url}
                </a>
                {editable && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={deletingId === item.uuid}
                    aria-label="Remove link"
                    onClick={() => void remove(item)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
