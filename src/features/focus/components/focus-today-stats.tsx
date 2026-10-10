import { Clock3, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFocused } from "../lib/focus-utils";
import type { FocusDashboard } from "../type";

export function FocusTodayStats({ stats, className }: { stats: FocusDashboard["today"]; className?: string }) {
  const items = [
    { label: "Sessions today", value: String(stats.completed_focus_sessions), icon: Flame },
    { label: "Time focused", value: formatFocused(stats.focused_seconds), icon: Clock3 },
  ];
  return (
    <dl className={cn("grid grid-cols-2 gap-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 items-center gap-3 rounded-lg bg-muted/60 px-3 py-2">
          <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-col">
            <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
            <dd className="text-sm font-semibold tabular-nums">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
