export type HomeStats = {
  active_projects: number;
  areas: number;
  resources_saved: number;
  habit_streak: number;
};

export type HomeProject = {
  uuid: string;
  name: string;
  icon: string | null;
  area: { uuid: string; name: string } | null;
  completed_tasks: number;
  total_tasks: number;
  progress_percentage: number | null;
  last_activity_at: string;
};

export type HomeArea = {
  uuid: string;
  name: string;
  icon: string | null;
  goals_count: number;
  habits_count: number;
  projects_count: number;
};

export type HomeRecentResource = {
  item_key: string;
  type: "note" | "link" | "file" | "image";
  title: string;
  resource_uuid: string;
  occurred_at: string;
};

export type HomeArchives = {
  projects: number;
  areas: number;
  resources: number;
};

export type HomeData = {
  stats: HomeStats;
  projects: HomeProject[];
  areas: HomeArea[];
  recent_resources: HomeRecentResource[];
  archives: HomeArchives;
};

export type HomeApiResponse<T = HomeData> = {
  data: T;
  status: number;
  message: string;
};
