import type { FocusDashboard } from "@/features/focus/type";

export function idleFocusDashboard(): FocusDashboard {
  return {
    settings: {
      focus_minutes: 25,
      short_break_minutes: 5,
      long_break_minutes: 15,
      sessions_before_long_break: 4,
      ask_before_next_session: true,
      ask_for_reflection: true,
      ambient_sound: "off",
    },
    tasks: [],
    active_session: null,
    today: { completed_focus_sessions: 0, focused_seconds: 0 },
    suggested_next_type: "focus",
  };
}
