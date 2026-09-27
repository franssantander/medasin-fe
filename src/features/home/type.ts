export type DashboardStats = {
  active_projects: number;
  areas: number;
  resources_saved: number;
  habit_streak: number;
};

export type DashboardProject = {
  uuid: string;
  name: string;
  area: { uuid: string; name: string } | null;
  completed_tasks: number;
  total_tasks: number;
  progress_percentage: number | null;
  last_activity_at: string;
};

export type DashboardArea = {
  uuid: string;
  name: string;
  icon: string | null;
  goals_count: number;
  habits_count: number;
  projects_count: number;
};

export type DashboardRecentResource = {
  item_key: string;
  type: "note" | "link" | "file" | "image";
  title: string;
  resource_uuid: string;
  occurred_at: string;
};

export type DashboardArchives = {
  projects: number;
  areas: number;
  resources: number;
};

export type DashboardData = {
  stats: DashboardStats;
  projects: DashboardProject[];
  areas: DashboardArea[];
  recent_resources: DashboardRecentResource[];
  archives: DashboardArchives;
};

export type DashboardApiResponse<T = DashboardData> = {
  data: T;
  status: number;
  message: string;
};
