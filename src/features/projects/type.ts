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
