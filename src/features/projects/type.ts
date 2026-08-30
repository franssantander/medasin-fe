export type ProjectStatus = "not_started" | "in_progress" | "completed";
export type ProjectArchiveFilter = "active" | "archived" | "all";

export type ProjectAreaSummary = {
  uuid: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type ProjectGoalsSummary = {
  count: number;
  url: string | null;
};

export type ProjectListCard = {
  uuid: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  background: string | null;
  status: ProjectStatus;
  progress_percentage: number;
  start_date: string | null;
  due_date: string | null;
  is_overdue: boolean;
  days_overdue: number | null;
  archived_at: string | null;
  area: ProjectAreaSummary | null;
  goals: ProjectGoalsSummary;
};

export type ProjectInput = {
  name: string;
  description: string | null;
  icon: string | null;
  background: string | null;
  start_date: string | null;
  due_date: string | null;
  area_uuid?: string;
  area_name?: string;
};

export type ProjectApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type BoardStageKey = "backlog" | "todos" | "in_progress" | "done";
export type BoardTaskPriority = "low" | "medium" | "high";
export type BoardLabelColor =
  | "slate"
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "blue"
  | "violet"
  | "pink";

export type BoardLabel = {
  uuid: string;
  name: string;
  color: BoardLabelColor;
  hex: string;
};

export type BoardTaskLink = {
  uuid: string;
  title: string;
  type?: string | null;
};

export type BoardTask = {
  uuid: string;
  title: string;
  description: string | null;
  priority: BoardTaskPriority;
  stage: BoardStageKey;
  position: number;
  labels: BoardLabel[];
  resources: BoardTaskLink[];
  notes: BoardTaskLink[];
  created_at: string | null;
  updated_at: string | null;
};

export type BoardStage = {
  uuid: string;
  key: BoardStageKey;
  name: string;
  position: number;
  task_count: number;
  tasks: BoardTask[];
};

export type BoardSummary = {
  uuid: string;
  name: string;
  position: number;
  task_count: number;
  stage_counts: Record<BoardStageKey, number>;
};

export type Board = BoardSummary & {
  stages: BoardStage[];
  labels: BoardLabel[];
};

export type ProjectDetail = ProjectListCard & { boards: BoardSummary[] };

export type BoardTaskInput = {
  title: string;
  description: string | null;
  priority: BoardTaskPriority;
  stage: BoardStageKey;
  label_uuids: string[];
  resource_uuids: string[];
  note_uuids: string[];
};
