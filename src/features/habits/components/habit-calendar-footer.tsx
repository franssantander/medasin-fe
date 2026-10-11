import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function HabitCalendarFooter({
  summary,
  loading,
  showSummary,
}: {
  summary: { scheduled: number; completed: number };
  loading: boolean;
  showSummary: boolean;
}) {
  const percent = summary.scheduled
    ? Math.round((summary.completed / summary.scheduled) * 100)
    : 0;
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <Legend label="Completed">
          <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
        </Legend>
        <Legend label="Missed">
          <span className="flex size-4 items-center justify-center rounded-full bg-destructive/10 text-destructive/80">
            <X className="size-2.5" strokeWidth={3} />
          </span>
        </Legend>
        <Legend label="Due today">
          <span className="size-4 rounded-full border-2 border-emerald-500/70" />
        </Legend>
        <Legend label="Upcoming">
          <span className="flex size-4 items-center justify-center">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          </span>
        </Legend>
        <Legend label="Rest day">
          <span className="size-4 rounded-full border border-dashed border-muted-foreground/25" />
        </Legend>
      </div>
      {loading && (
        <div className="flex items-center gap-3" aria-hidden="true">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-1.5 w-24 rounded-full" />
          <Skeleton className="h-3 w-8" />
        </div>
      )}
      {showSummary && (
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            {summary.scheduled
              ? summary.completed +
                " of " +
                summary.scheduled +
                " check-ins completed"
              : "No scheduled check-ins"}
          </span>
          {summary.scheduled > 0 && (
            <>
              <Progress
                aria-label="Check-ins completed in this range"
                value={percent}
                className="h-1.5 w-24 [&_[data-slot=progress-track]]:bg-emerald-500/15 [&_[data-slot=progress-indicator]]:bg-emerald-500 [&_[data-slot=progress-indicator]]:motion-reduce:transition-none"
              />
              <span
                className={cn(
                  "font-medium tabular-nums text-foreground",
                  percent === 100 && "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {percent}%
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Legend({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className="flex">
        {children}
      </span>
      {label}
    </span>
  );
}
