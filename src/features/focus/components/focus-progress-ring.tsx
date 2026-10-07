type FocusProgressRingProps = { progress: number; time: string; label: string };

export function FocusProgressRing({
  progress,
  time,
  label,
}: FocusProgressRingProps) {
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className="relative grid size-56 max-w-full place-items-center sm:size-64"
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
          strokeWidth="6"
          className="text-muted"
        />
        <circle
          cx="128"
          cy="128"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="text-primary transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
        />
      </svg>
      <div className="text-center">
        <div className="text-5xl font-semibold tabular-nums tracking-[-0.05em] sm:text-6xl">
          {time}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">remaining</p>
      </div>
    </div>
  );
}
