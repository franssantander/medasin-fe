import type { Area } from "@/features/areas/type";

export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

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

export type HabitArea = Pick<Area, "uuid" | "name" | "icon" | "archived_at">;

export type Habit = {
  id: number;
  uuid: string;
  user_id?: number;
  area_id: number | null;
  name: string;
  icon: string | null;
  description: string | null;
  frequency: HabitFrequency;
  schedule: HabitSchedule | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  area: HabitArea | null;
};

export type HabitCheckIn = {
  date: string;
  completed: boolean;
};

export type HabitCalendarData = {
  habits: Habit[];
  check_ins: Record<string, HabitCheckIn[]>;
  start_date: string;
  end_date: string;
};

export type HabitInput = {
  name: string;
  icon: string;
  description: string | null;
  frequency: HabitFrequency;
  schedule: HabitSchedule | null;
  is_active: boolean;
  area_uuid: string | null;
};

export type HabitCalendarView = "week" | "month" | "year" | "all";

export type HabitCalendarRange = {
  view: HabitCalendarView;
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
};

export type HabitCalendarColumn = {
  key: string;
  date: Date;
  label: string;
  shortLabel: string;
  aggregate: boolean;
};
