import { ApiError } from "@/lib/axios";
import { resourceSchema } from "./schemas/resource-schema";
import type { ResourceTag, ResourceUpdateInput } from "./type";

export type ResourceFieldName =
  | "title"
  | "appearance"
  | "notes"
  | "links"
  | "files"
  | "tags"
  | "projects"
  | "areas"
  | "form";

export type ResourceFormErrors = Partial<Record<ResourceFieldName, string>>;

export type ResourceMetadataValues = {
  title: string;
  icon: string;
  background: string;
  content: string;
  tagIds: string[];
  tagNames: string[];
  projectUuids: string[];
  areaUuids: string[];
};

export const resourceFieldLabels: Record<ResourceFieldName, string> = {
  title: "Title",
  appearance: "Appearance",
  notes: "Notes",
  links: "Links",
  files: "Images and files",
  tags: "Tags",
  projects: "Projects",
  areas: "Areas",
  form: "Resource",
};

function resourceField(path: string): ResourceFieldName {
  const field = path.split(".")[0];
  const fields: Record<string, ResourceFieldName> = {
    title: "title",
    icon: "appearance",
    background: "appearance",
    content: "notes",
    links: "links",
    files: "files",
    tag_names: "tags",
    tag_uuids: "tags",
    project_uuids: "projects",
    area_uuids: "areas",
  };
  return fields[field] ?? "form";
}

export function resourceValidationErrors(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): ResourceFormErrors {
  const errors: ResourceFormErrors = {};
  for (const issue of issues) {
    const field = resourceField(issue.path.map(String).join("."));
    errors[field] ??= issue.message;
  }
  return errors;
}

export function resourceRequestErrors(
  error: unknown,
  fallback = "Changes could not be saved. Try again.",
): ResourceFormErrors {
  if (error instanceof ApiError && error.validationErrors) {
    const errors: ResourceFormErrors = {};
    for (const [path, messages] of Object.entries(error.validationErrors)) {
      errors[resourceField(path)] ??= messages.join(" ");
    }
    if (Object.keys(errors).length) return errors;
  }
  return { form: error instanceof Error ? error.message : fallback };
}

export const resourceMetadataSchema = resourceSchema.omit({ links: true, files: true });

export function validateResourceMetadata(input: ResourceUpdateInput): ResourceFormErrors {
  const result = resourceMetadataSchema.safeParse(input);
  return result.success ? {} : resourceValidationErrors(result.error.issues);
}

export function includeResourceTag(
  draft: string,
  ids: string[],
  names: string[],
  available: ResourceTag[],
) {
  const name = draft.trim();
  const existing = available.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return {
    ids: existing && !ids.includes(existing.uuid) ? [...ids, existing.uuid] : ids,
    names: !name || existing || names.some((item) => item.toLowerCase() === name.toLowerCase())
      ? names
      : [...names, name],
  };
}

export function mergeResourceOptions(...groups: ResourceTag[][]): ResourceTag[] {
  return [...new Map(groups.flat().map((item) => [item.uuid, item])).values()];
}

export function formatResourceFileSize(size: number | null) {
  if (size === null) return "File";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
