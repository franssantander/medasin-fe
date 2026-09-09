export type NoteApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type NotePaginated<T> = {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
};

export type Note = {
  id: number;
  uuid: string;
  area_id: number | null;
  parent_uuid: string | null;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type NoteTreeNode = Pick<
  Note,
  | "uuid"
  | "parent_uuid"
  | "title"
  | "content"
  | "is_pinned"
  | "created_at"
  | "updated_at"
> & {
  children: NoteTreeNode[];
};

export type NoteMedia = {
  uuid: string;
  url: string;
  kind: "image" | "video";
  mime_type: string;
  name: string;
  size: number;
};

export type NoteInput = {
  title: string;
  content: string;
  is_pinned: boolean;
  parent_uuid?: string | null;
};

export type NoteUpdateInput = Partial<NoteInput>;

export type NoteWorkspaceService = {
  tree: (signal?: AbortSignal) => Promise<NoteApiResponse<NoteTreeNode[]>>;
  show: (
    noteUuid: string,
    signal?: AbortSignal,
  ) => Promise<NoteApiResponse<Note>>;
  create: (input: NoteInput) => Promise<NoteApiResponse<Note>>;
  update: (
    noteUuid: string,
    input: NoteUpdateInput,
  ) => Promise<NoteApiResponse<Note>>;
  remove: (noteUuid: string) => Promise<NoteApiResponse<null>>;
  uploadMedia: (
    noteUuid: string,
    file: File,
  ) => Promise<NoteApiResponse<NoteMedia>>;
};

export type NoteWorkspaceQueryKeys = {
  tree: readonly unknown[];
  detail: (noteUuid: string) => readonly unknown[];
};
