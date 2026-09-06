import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-lg font-bold">{title}</h1>
        {description && (
          <p className="text-sm font-normal text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      )}
    </header>
  );
}
