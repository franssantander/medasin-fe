export type PlanLink = { uuid: string; name: string };

export type ReminderStatus = "none" | "scheduled" | "fired" | "skipped";

export type CalendarPlan = {
  uuid: string;
  title: string;
  notes: string | null;
  date: string;
  time: string | null;
  timezone: string;
  starts_at: string;
  is_all_day: boolean;
  project: PlanLink | null;
  area: PlanLink | null;
  reminder_offset_minutes: number | null;
  remind_at: string | null;
  notified_at: string | null;
  email_sent_at: string | null;
  reminder_status: ReminderStatus;
};

export type PlanInput = {
  title: string;
  notes: string | null;
  date: string;
  time?: string;
  timezone: string;
  is_all_day: boolean;
  project_uuid?: string;
  area_uuid?: string;
  reminder_offset_minutes: number | null;
};

export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type CalendarRange = {
  startDate: string;
  endDate: string;
};
