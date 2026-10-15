import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ProfileSectionProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  tone?: "default" | "destructive";
  children: ReactNode;
};

export function ProfileSection({ id, icon: Icon, title, description, tone = "default", children }: ProfileSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="grid gap-4 border-t pt-6 sm:pt-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      <div className="flex gap-3 lg:flex-col lg:gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            tone === "destructive" && "bg-destructive/10 text-destructive dark:bg-destructive/20",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className={cn("text-base font-medium", tone === "destructive" && "text-destructive")}>{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
