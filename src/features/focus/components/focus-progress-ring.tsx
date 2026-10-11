import { cn } from "@/lib/utils";

type FocusProgressRingProps = {
  progress: number;
  time: string;
  label: string;
  caption: string;
  toneClassName: string;
  paused?: boolean;
  size?: "default" | "quiet";
};

export function FocusProgressRing({
  progress,
  time,
  label,
  caption,
  toneClassName,
  paused = false,
  size = "default",
}: FocusProgressRingProps) {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className={cn(
        "@container relative grid aspect-square w-full place-items-center",
        size === "quiet" ? "max-w-[min(22rem,42dvh)]" : "max-w-[min(15rem,42dvh)] sm:max-w-[min(18rem,42dvh)]",
      )}
      role="timer"
      aria-live="off"
      aria-label={`${label}, ${time} remaining`}
    >
      <svg
        className="absolute inset-0 size-full -rotate-90"
        viewBox="0 0 256 256"
        aria-hidden="true"
      >
        <circle
          cx="128"
          cy="128"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx="128"
          cy="128"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={cn(
            "transition-[stroke-dashoffset,opacity] duration-300 motion-reduce:transition-none",
            toneClassName,
            progress === 0 && "opacity-0",
            paused && "opacity-50",
          )}
        />
      </svg>
      <div className="flex flex-col items-center gap-1 text-center">
        <span aria-hidden="true" className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{label}</span>
        <span className={cn(
          "leading-none font-semibold tracking-tight tabular-nums",
          size === "quiet" ? "text-[clamp(2.75rem,24cqi,5.5rem)]" : "text-6xl sm:text-7xl",
          paused && "text-muted-foreground",
        )}>
          {time}
        </span>
        <span className="text-sm text-muted-foreground">{caption}</span>
      </div>
    </div>
  );
}
