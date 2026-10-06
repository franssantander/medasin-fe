import { formatFocused } from "../lib/focus-utils";
import type { FocusDashboard } from "../type";

export function FocusTodayStats({ stats }: { stats: FocusDashboard["today"] }) {
  return (
    <dl className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
      <div className="flex items-baseline gap-2">
        <dt className="text-muted-foreground">Sessions today</dt>
        <dd className="font-semibold tabular-nums">{stats.completed_focus_sessions}</dd>
      </div>
      <div className="flex items-baseline gap-2">
        <dt className="text-muted-foreground">Time focused</dt>
        <dd className="font-semibold tabular-nums">{formatFocused(stats.focused_seconds)}</dd>
      </div>
    </dl>
  );
}
