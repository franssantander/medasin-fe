"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
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

export function ResourceFormDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(EMPTY_NOTE_DOCUMENT);
  const [links, setLinks] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [project, setProject] = useState("");
  const [area, setArea] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
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
      links,
      files,
      tag_names: tagNames,
      tag_uuids: tagIds,
      project_uuid: project || undefined,
      area_uuid: area || undefined,
    });
    if (!parsed.success) {
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
      onClose();
    } catch (error) {
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
  const selectClass = "h-9 w-full rounded-lg border bg-background px-3 text-sm";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !create.isPending) onClose();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New resource</DialogTitle>
          <DialogDescription>
            Keep notes, links, images, and files together.
          </DialogDescription>
        </DialogHeader>
        <form id="resource-form" onSubmit={submit} className="grid gap-5">
          <fieldset disabled={create.isPending} className="grid min-w-0 gap-5">
            <div className="grid gap-2">
              <label htmlFor="resource-title" className="text-sm font-medium">
                Title <span className="text-muted-foreground">(required)</span>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLink}
                  aria-label="Add link"
                >
                  <Plus />
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
                id="resource-files"
                type="file"
                multiple
                onChange={(event) => {
                  const next = [
                    ...files,
                    ...Array.from(event.target.files ?? []),
                  ];
                  event.target.value = "";
                  if (
                    next.length > 10 ||
                    next.some((file) => file.size > 20 * 1024 * 1024)
                  ) {
                    setErrors([
                      "Choose at most 10 uploads, each 20 MB or smaller.",
                    ]);
                    return;
                  }
                  setFiles(next);
                  setErrors([]);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Up to 10 uploads, 20 MB each.
              </p>
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-lg border px-3 py-1 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {file.name}{" "}
                    <span className="text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setFiles(files.filter((_, i) => i !== index))
                    }
                  >
                    <X />
                  </Button>
                </div>
              ))}
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
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Add tag"
                  onClick={addTag}
                >
                  <Plus />
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
                    variant={tagIds.includes(item.uuid) ? "default" : "outline"}
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
                <select
                  id="resource-project"
                  className={selectClass}
                  value={project}
                  disabled={projects.isLoading || projects.isError}
                  onChange={(event) => setProject(event.target.value)}
                >
                  <option value="">
                    {projects.isLoading ? "Loading projects…" : "No project"}
                  </option>
                  {projects.data?.data.map((item) => (
                    <option key={item.uuid} value={item.uuid}>
                      {item.name}
                    </option>
                  ))}
                </select>
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
                <label htmlFor="resource-area" className="text-sm font-medium">
                  Area (optional)
                </label>
                <select
                  id="resource-area"
                  className={selectClass}
                  value={area}
                  disabled={areas.isLoading || areas.isError}
                  onChange={(event) => setArea(event.target.value)}
                >
                  <option value="">
                    {areas.isLoading ? "Loading areas…" : "No area"}
                  </option>
                  {areas.data?.data.map((item) => (
                    <option key={item.uuid} value={item.uuid}>
                      {item.name}
                    </option>
                  ))}
                </select>
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
  );
}
