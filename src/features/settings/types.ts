import type { ApiResponse, Paginated } from "@/features/areas/type";

export type TrashItemType =
  | "area"
  | "project"
  | "board"
  | "task"
  | "goal"
  | "habit"
  | "note"
  | "board_label"
  | "resource_attachment";

export type TrashItem = {
  uuid: string;
  subject_uuid: string;
  type: TrashItemType;
  title: string;
  context: string | null;
  deleted_at: string;
  expires_at: string;
  days_remaining: number;
  group_size: number;
  can_restore: boolean;
  restore_block_reason: string | null;
};

export type TrashFilters = {
  search?: string;
  type?: TrashItemType;
  page?: number;
};

export type TrashPage = ApiResponse<Paginated<TrashItem>>;
