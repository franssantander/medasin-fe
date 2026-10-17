import type { ReactNode } from "react";

/** Same look as `components/shared/page-header.tsx`, without adding an h1 to the landing page. */
export function PreviewPageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <p className="text-lg font-bold">{title}</p>
        <p className="text-sm font-normal text-muted-foreground">{description}</p>
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
