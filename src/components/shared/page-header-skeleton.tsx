import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Same box model as PageHeader: line boxes match the h1/description line
// heights so the real header replaces this without shifting the page.
export function PageHeaderSkeleton({
  titleWidth = "w-28",
  descriptionWidth = "w-80",
  badge = false,
  actions = [],
}: {
  titleWidth?: string;
  descriptionWidth?: string | null;
  badge?: boolean;
  actions?: string[];
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <div className="flex h-7 items-center gap-2">
          <Skeleton className={cn("h-5", titleWidth)} />
          {badge && <Skeleton className="h-5 w-7 rounded-full" />}
        </div>
        {descriptionWidth && (
          <div className="flex h-5 items-center">
            <Skeleton className={cn("h-3.5 max-w-full", descriptionWidth)} />
          </div>
        )}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((width, index) => (
            <Skeleton key={index} className={cn("h-9 rounded-lg", width)} />
          ))}
        </div>
      )}
    </div>
  );
}
