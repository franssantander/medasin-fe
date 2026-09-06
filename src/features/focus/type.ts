export type AmbientSound = "off" | "brown" | "pink" | "white";
export type FocusSessionType = "focus" | "short_break" | "long_break";
export type FocusSessionStatus = "running" | "paused" | "completed" | "cancelled";
export type FocusMood = "calm" | "frustrated" | "neutral" | "tired";

export type FocusSettings = {
  focus_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  sessions_before_long_break: number;
  ask_before_next_session: boolean;
  ask_for_reflection: boolean;
  ambient_sound: AmbientSound;
};

export type FocusTask = {
  uuid: string;
  title: string;
  linked: boolean;
  source: { task_uuid: string; project: string | null; board: string | null; stage: string | null } | null;
  completed_at: string | null;
  session_count: number;
  position: number;
};

export type LinkableFocusTask = {
  uuid: string;
  title: string;
  project: string | null;
  board: string | null;
  stage: string | null;
};

export type FocusSession = {
  uuid: string;
  type: FocusSessionType;
  status: FocusSessionStatus;
  duration_seconds: number;
  remaining_seconds: number;
  task: { uuid: string; title: string } | null;
  started_at: string;
  ends_at: string | null;
  server_now: string;
  completed_at: string | null;
  mood: FocusMood | null;
  reflection_note: string | null;
};

export type FocusDashboard = {
  settings: FocusSettings;
  tasks: FocusTask[];
  active_session: FocusSession | null;
  today: { completed_focus_sessions: number; focused_seconds: number };
  suggested_next_type: FocusSessionType;
};

export type FocusApiResponse<T> = { data: T; status: number; message: string };
