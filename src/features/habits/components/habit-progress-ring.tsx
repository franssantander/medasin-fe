import { cn } from "@/lib/utils";

export function HabitProgressRing({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = total ? value / total : 0;
  const complete = total > 0 && value >= total;
  return (
    <div
      className={cn("relative grid aspect-square shrink-0 place-items-center", className)}
      aria-hidden="true"
    >
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={cn(
            "text-emerald-500 transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none",
            !value && "opacity-0",
          )}
        />
      </svg>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums @4xl:text-lg",
          complete && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}/{total}
      </span>
    </div>
  );
}
