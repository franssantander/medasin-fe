"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Eye,
  FilePlus2,
  FileText,
  Link2,
  Search,
  Tag,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPTY_NOTE_DOCUMENT } from "@/components/ui/note-editor-document";
import { areaService } from "@/features/areas/services/area-service";
import { projectService } from "@/features/projects/services/project-service";
import { ApiError } from "@/lib/axios";
import {
  useCreateResource,
  useResourceTagsQuery,
} from "../queries/resource-query";
import { resourceSchema } from "../schemas/resource-schema";
import { safeResourceUrl, toResourceDocument } from "../resource-document";
import { ResourceEditor } from "./resource-editor";
import { ResourceAssignmentSelect } from "./resource-assignment-select";
import {
  RESOURCE_BADGE_COLORS,
  RESOURCE_ICONS,
  ResourceIcon,
  resourceBadgeStyle,
} from "./resource-icons";

function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function useObjectUrl(file: File | null) {
  const [preview, setPreview] = useState<{
    file: File;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    // The URL is a browser resource created by this effect and must be
    // replaced when React replays effects in development Strict Mode.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview({ file, url });

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return preview?.file === file ? preview.url : undefined;
}

function SelectedImageCard({
  file,
  onPreview,
  onRemove,
}: {
  file: File;
  onPreview: () => void;
  onRemove: () => void;
}) {
  const url = useObjectUrl(file);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border bg-muted/30">
      {url && (
        // Local object URLs should be rendered directly by the browser.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.name}
          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
      )}
      <button
        type="button"
        className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/30 focus-visible:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        onClick={onPreview}
        aria-label={`View ${file.name}`}
      >
        <span className="rounded-full bg-black/65 p-2 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Eye className="size-4" />
        </span>
      </button>
      <Button
        type="button"
        size="icon-xs"
        variant="secondary"
        className="absolute right-2 top-2 z-10 shadow-sm"
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
      >
        <X />
      </Button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8 text-white">
        <p className="truncate text-xs font-medium">{file.name}</p>
        <p className="text-[11px] text-white/75">{formatFileSize(file.size)}</p>
      </div>
    </div>
  );
}

export function ResourceFormDialog({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("BookOpen");
  const [background, setBackground] = useState("#000000");
  const [iconSearch, setIconSearch] = useState("");
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [content, setContent] = useState(EMPTY_NOTE_DOCUMENT);
  const [links, setLinks] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [projectUuids, setProjectUuids] = useState<string[]>([]);
  const [areaUuids, setAreaUuids] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useObjectUrl(previewImage);
  const tags = useResourceTagsQuery();
  const projects = useQuery({
    queryKey: ["projects", "list", "active"],
    queryFn: () => projectService.list("active"),
  });
  const areas = useQuery({
    queryKey: ["areas", "list", "active"],
    queryFn: () => areaService.list("active"),
  });
  const create = useCreateResource();
  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    return query
      ? RESOURCE_ICONS.filter(({ name }) => name.toLowerCase().includes(query))
      : RESOURCE_ICONS;
  }, [iconSearch]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function addLink() {
    const value = link.trim();
    if (!safeResourceUrl(value) || value.length > 4096) {
      setErrors(["Enter a valid HTTP or HTTPS link, up to 4096 characters."]);
      return;
    }
    if (links.length >= 100) {
      setErrors(["Add at most 100 links."]);
      return;
    }
    setLinks((current) =>
      current.includes(value) ? current : [...current, value],
    );
    setLink("");
    setErrors([]);
  }
  function addTag() {
    const value = tag.trim();
    if (!value || value.length > 100) {
      setErrors(["Tag names must contain 1–100 characters."]);
      return;
    }
    const existing = tags.data?.data.find(
      (item) => item.name.toLowerCase() === value.toLowerCase(),
    );
    if (existing)
      setTagIds((current) =>
        current.includes(existing.uuid) ? current : [...current, existing.uuid],
      );
    else
      setTagNames((current) =>
        current.some((name) => name.toLowerCase() === value.toLowerCase())
          ? current
          : [...current, value],
      );
    setTag("");
    setErrors([]);
  }
  function addFiles(nextFiles: File[]) {
    const next = [...files, ...nextFiles];
    if (
      next.length > 10 ||
      next.some((selectedFile) => selectedFile.size > 20 * 1024 * 1024)
    ) {
      setErrors(["Choose at most 10 uploads, each 20 MB or smaller."]);
      return;
    }
    setFiles(next);
    setErrors([]);
  }
  function removeFile(file: File) {
    setFiles((current) => current.filter((item) => item !== file));
    setPreviewImage((current) => (current === file ? null : current));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (create.isPending) return;
    if (link.trim() || tag.trim()) {
      setErrors([
        "Add or clear the link and tag you have entered before saving.",
      ]);
      return;
    }
    const parsed = resourceSchema.safeParse({
      title,
      icon,
      background,
      links,
      files,
      tag_names: tagNames,
      tag_uuids: tagIds,
      project_uuids: projectUuids,
      area_uuids: areaUuids,
    });
    if (!parsed.success) {
      if (
        parsed.error.issues.some(
          (issue) => issue.path[0] === "icon" || issue.path[0] === "background",
        )
      ) {
        setAppearanceOpen(true);
      }
      setErrors(
        parsed.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`,
        ),
      );
      return;
    }
    setErrors([]);
    try {
      await create.mutateAsync({
        ...parsed.data,
        content: toResourceDocument(content),
      });
      setOpen(false);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.validationErrors &&
        (error.validationErrors.icon || error.validationErrors.background)
      ) {
        setAppearanceOpen(true);
      }
      setErrors(
        error instanceof ApiError && error.validationErrors
          ? Object.entries(error.validationErrors).flatMap(
              ([field, messages]) =>
                messages.map((message) => `${field}: ${message}`),
            )
          : [
              error instanceof Error
                ? error.message
                : "Resource could not be created. Try again.",
            ],
      );
    }
  }
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  const documentFiles = files.filter((file) => !file.type.startsWith("image/"));
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !create.isPending) setOpen(false);
        }}
        onOpenChangeComplete={(nextOpen) => !nextOpen && onClose()}
      >
        <DialogContent className="w-full max-w-4xl overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>New resource</DialogTitle>
            <DialogDescription>
              Keep notes, links, images, and files together.
            </DialogDescription>
          </DialogHeader>
          <form id="resource-form" onSubmit={submit} className="grid gap-5">
            <fieldset
              disabled={create.isPending}
              className="grid min-w-0 gap-5"
            >
              <div className="grid gap-2">
                <label htmlFor="resource-title" className="text-sm font-medium">
                  Title{" "}
                  <span className="text-muted-foreground">(required)</span>
                </label>
                <Input
                  id="resource-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={255}
                  required
                  autoFocus
                  placeholder="Give your resource a title"
                />
              </div>
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
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                      style={resourceBadgeStyle(background)}
                    >
                      <ResourceIcon name={icon} className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        Customize appearance
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Optional · {icon} · {background.toUpperCase()}
                      </p>
                    </div>
                    <AccordionHeader>
                      <AccordionTrigger
                        className="size-auto gap-1.5 px-2.5"
                        aria-label="Customize resource appearance"
                      >
                        <span className="hidden text-sm sm:inline">
                          {appearanceOpen ? "Hide" : "Customize"}
                        </span>
                      </AccordionTrigger>
                    </AccordionHeader>
                  </div>
                  <AccordionContent>
                    <div className="grid gap-5 border-t p-4">
                      <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                        <div
                          className="flex size-14 shrink-0 items-center justify-center rounded-xl shadow-sm"
                          style={resourceBadgeStyle(background)}
                        >
                          <ResourceIcon name={icon} className="size-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {title.trim() || "Resource preview"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Preview of the resource badge and title.
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <div>
                          <p className="text-sm font-medium">Badge color</p>
                          <p className="text-xs text-muted-foreground">
                            Icon contrast adjusts automatically.
                          </p>
                        </div>
                        <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
                          {RESOURCE_BADGE_COLORS.map((color) => {
                            const isSelected =
                              background.toLowerCase() ===
                              color.value.toLowerCase();

                            return (
                              <button
                                key={color.value}
                                type="button"
                                title={color.name}
                                aria-label={`Use ${color.name} (${color.value})`}
                                aria-pressed={isSelected}
                                className="flex aspect-square items-center justify-center rounded-full border border-black/10 shadow-sm outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                style={{ backgroundColor: color.value }}
                                onClick={() => setBackground(color.value)}
                              >
                                {isSelected && (
                                  <Check
                                    className="size-4 drop-shadow-sm"
                                    strokeWidth={3}
                                    style={{
                                      color: resourceBadgeStyle(color.value)
                                        .color,
                                    }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                            style={resourceBadgeStyle(background)}
                          >
                            <ResourceIcon name={icon} className="size-5" />
                          </div>
                          <div className="grid min-w-0 flex-1 gap-1.5">
                            <label
                              htmlFor="resource-badge-color"
                              className="text-xs font-medium"
                            >
                              Custom hex color
                            </label>
                            <Input
                              id="resource-badge-color"
                              value={background}
                              onChange={(event) =>
                                setBackground(event.target.value)
                              }
                              maxLength={7}
                              placeholder="#000000"
                              spellCheck={false}
                              aria-invalid={!/^#[0-9a-f]{6}$/i.test(background)}
                              className="font-mono uppercase"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <p className="text-sm font-medium">Icon</p>
                        <div className="overflow-hidden rounded-xl border">
                          <div className="relative border-b p-3">
                            <Search className="absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={iconSearch}
                              onChange={(event) =>
                                setIconSearch(event.target.value)
                              }
                              placeholder={`Search ${RESOURCE_ICONS.length} Lucide icons…`}
                              className="pl-9"
                            />
                          </div>
                          <div className="grid max-h-48 grid-cols-[repeat(auto-fill,2rem)] justify-between gap-1 overflow-y-auto p-3">
                            {filteredIcons.map(({ name, icon: Icon }) => (
                              <button
                                key={name}
                                type="button"
                                title={name}
                                aria-label={`Use ${name} icon`}
                                aria-pressed={icon === name}
                                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-black aria-pressed:text-white"
                                onClick={() => setIcon(name)}
                              >
                                <Icon className="size-3.5" />
                              </button>
                            ))}
                          </div>
                          {filteredIcons.length === 0 && (
                            <p className="px-3 pb-4 text-center text-sm text-muted-foreground">
                              No icons match “{iconSearch}”.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Notes</p>
                <ResourceEditor
                  id="new-resource"
                  content={content}
                  onChange={setContent}
                  readOnly={create.isPending}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="resource-link" className="text-sm font-medium">
                  Links
                </label>
                <div className="flex gap-2">
                  <Input
                    id="resource-link"
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="https://example.com"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addLink();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addLink}>
                    <Link2 />
                    Add link
                  </Button>
                </div>
                {links.map((value, index) => (
                  <div
                    key={value}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{value}</span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${value}`}
                      onClick={() =>
                        setLinks(links.filter((_, i) => i !== index))
                      }
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                <label htmlFor="resource-files" className="text-sm font-medium">
                  Images and files
                </label>
                <Input
                  ref={fileInputRef}
                  id="resource-files"
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FilePlus2 />
                    Add images & files
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {files.length}/10 uploads · 20 MB each
                  </p>
                </div>
                {imageFiles.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {imageFiles.map((file, index) => (
                      <SelectedImageCard
                        key={`${file.name}-${file.lastModified}-${index}`}
                        file={file}
                        onPreview={() => setPreviewImage(file)}
                        onRemove={() => removeFile(file)}
                      />
                    ))}
                  </div>
                )}
                {documentFiles.length > 0 && (
                  <div className="grid gap-2">
                    {documentFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => removeFile(file)}
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="resource-tag" className="text-sm font-medium">
                  Tags
                </label>
                <div className="flex gap-2">
                  <Input
                    id="resource-tag"
                    value={tag}
                    maxLength={100}
                    onChange={(event) => setTag(event.target.value)}
                    placeholder="Create a tag"
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
                {tags.isLoading && (
                  <p className="text-sm text-muted-foreground">Loading tags…</p>
                )}
                {tags.isError && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => tags.refetch()}
                  >
                    Retry loading tags
                  </Button>
                )}
                <div className="flex flex-wrap gap-2">
                  {tags.data?.data.map((item) => (
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        tagIds.includes(item.uuid) ? "default" : "outline"
                      }
                      aria-pressed={tagIds.includes(item.uuid)}
                      key={item.uuid}
                      onClick={() =>
                        setTagIds((current) =>
                          current.includes(item.uuid)
                            ? current.filter((id) => id !== item.uuid)
                            : [...current, item.uuid],
                        )
                      }
                    >
                      {item.name}
                    </Button>
                  ))}
                  {tagNames.map((name) => (
                    <Button
                      type="button"
                      size="sm"
                      key={name}
                      aria-label={`Remove new tag ${name}`}
                      onClick={() =>
                        setTagNames(tagNames.filter((value) => value !== name))
                      }
                    >
                      {name}
                      <X />
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label
                    htmlFor="resource-project"
                    className="text-sm font-medium"
                  >
                    Project (optional)
                  </label>
                  <ResourceAssignmentSelect
                    id="resource-project"
                    label="Project"
                    items={projects.data?.data ?? []}
                    value={projectUuids}
                    loading={projects.isLoading}
                    disabled={projects.isLoading || projects.isError}
                    onValueChange={setProjectUuids}
                  />
                  {projects.isError && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => projects.refetch()}
                    >
                      Retry projects
                    </Button>
                  )}
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="resource-area"
                    className="text-sm font-medium"
                  >
                    Area (optional)
                  </label>
                  <ResourceAssignmentSelect
                    id="resource-area"
                    label="Area"
                    items={areas.data?.data ?? []}
                    value={areaUuids}
                    loading={areas.isLoading}
                    disabled={areas.isLoading || areas.isError}
                    onValueChange={setAreaUuids}
                  />
                  {areas.isError && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => areas.refetch()}
                    >
                      Retry areas
                    </Button>
                  )}
                </div>
              </div>
            </fieldset>
            {!!errors.length && (
              <ul role="alert" className="grid gap-1 text-sm text-destructive">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={create.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="resource-form"
              disabled={create.isPending}
            >
              {create.isPending ? "Creating…" : "Create resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="max-w-5xl bg-black/95 p-4 text-white">
          <DialogHeader className="pr-10">
            <DialogTitle className="truncate">
              {previewImage?.name || "Image preview"}
            </DialogTitle>
            <DialogDescription className="text-white/65">
              {previewImage ? formatFileSize(previewImage.size) : ""}
            </DialogDescription>
          </DialogHeader>
          {previewUrl && previewImage && (
            <div className="relative min-h-64 w-full overflow-hidden rounded-xl bg-black sm:min-h-[32rem]">
              {/* Blob URLs are client-local and cannot use Next's image pipeline. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={previewImage.name}
                className="absolute inset-0 size-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
