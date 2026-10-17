import { Gem, Leaf, Sparkle, Target, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const planIcons: Record<string, LucideIcon> = {
  free: Leaf,
  focus: Target,
  clarity: Sparkle,
};

/** A plan's icon in a small tile. Decorative: the plan name sits next to it. */
export function PlanIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = planIcons[slug] ?? Gem;

  return (
    <span
      aria-hidden="true"
      data-slot="plan-icon"
      data-plan={slug}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-xs ring-1 ring-foreground/10 [&_svg]:size-4",
        className,
      )}
    >
      <Icon />
    </span>
  );
}
