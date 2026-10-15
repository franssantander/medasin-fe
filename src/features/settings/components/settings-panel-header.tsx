import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SettingsPanelHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
};

export function SettingsPanelHeader({
  icon: Icon,
  title,
  description,
  action,
}: SettingsPanelHeaderProps) {
  return (
    <CardHeader className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b p-5 sm:p-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        >
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>
            <h2>{title}</h2>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </CardHeader>
  );
}
