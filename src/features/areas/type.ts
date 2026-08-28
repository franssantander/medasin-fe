export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type Paginated<T> = {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
};

export type AreaStatusFilter = "active" | "archived" | "all";
export type GoalStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";
export type GoalFilter = "all" | "active" | "completed" | "cancelled";
export type HabitFrequency = "daily" | "weekly" | "monthly" | "custom";
export type HabitWeekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";
export type HabitSchedule = {
  days?: HabitWeekday[];
  dates?: number[];
};

export type Area = {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  icon: string | null;
  background: string | null;
  background_image: string | null;
  background_image_url: string | null;
  description: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  projects?: Project[];
  resources?: Resource[];
};

export type Goal = {
  id: number;
  uuid: string;
  area_id: number;
  title: string;
  icon: string;
  description: string | null;
  status: GoalStatus;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalTrackerData = {
  items: Paginated<Goal>;
  counts: Record<GoalFilter, number>;
};

export type Habit = {
  id: number;
  uuid: string;
  area_id: number;
  name: string;
  icon: string;
  description: string | null;
  frequency: HabitFrequency;
  schedule: HabitSchedule | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitCheckIn = {
  date: string;
  completed: boolean;
};

export type HabitHistory = {
  check_ins: HabitCheckIn[];
  current_streak: number;
  best_streak: number;
  scheduled_count: number;
  completed_count: number;
  completion_rate: number;
};

export type Note = {
  id: number;
  uuid: string;
  area_id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  status: string;
  area_id: number | null;
  area?: Pick<Area, "id" | "uuid" | "name"> | null;
};

export type Resource = {
  id: number;
  uuid: string;
  title: string;
  type: string | null;
  description: string | null;
  url: string | null;
  author: string | null;
  source: string | null;
  is_favorite: boolean;
};

export type AreaInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  background?: string | null;
  background_image?: File | null;
};

export type GoalInput = {
  title: string;
  icon: string;
  description?: string | null;
  status: GoalStatus;
  start_date?: string | null;
  due_date?: string | null;
};

export type HabitInput = {
  name: string;
  icon: string;
  description?: string | null;
  frequency: HabitFrequency;
  schedule: HabitSchedule | null;
  is_active: boolean;
};

export type NoteInput = {
  title: string;
  content: string;
  is_pinned: boolean;
};
