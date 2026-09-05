import type {
  Resource as AreaResource,
  ApiResponse,
  Paginated,
} from "@/features/areas/type";

export type ResourceType = "note" | "link" | "image" | "file";
export type ResourceTag = { uuid: string; name: string };
export type ResourceDocument = {
  type: "doc";
  content?: unknown[];
  format?: "blocknote-v1";
};
export type ResourceAttachment = {
  uuid: string;
  kind: "link" | "image" | "file";
  url: string;
  name: string | null;
  mime_type: string | null;
  size: number | null;
};
export type Resource = AreaResource & {
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  content: ResourceDocument | null;
  types: ResourceType[];
  attachments: ResourceAttachment[];
  tags: ResourceTag[];
  projects: ResourceTag[];
  areas: ResourceTag[];
};
export type ResourceFilters = {
  search?: string;
  type?: ResourceType;
  tag_uuid?: string;
  status?: "active" | "archived";
};
export type ResourcePage = ApiResponse<
  Paginated<Resource> & { next_page_url: string | null }
>;
export type ResourceInput = {
  title: string;
  content?: ResourceDocument | null;
  links: string[];
  files: File[];
  tag_names: string[];
  tag_uuids: string[];
  project_uuid?: string;
  area_uuid?: string;
};
