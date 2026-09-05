import { RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TrashItem } from "../types";
import { trashTypeConfig } from "./trash-item-config";

type TrashListItemProps = {
  item: TrashItem;
  busy: boolean;
  onRestore: () => void;
  onDelete: () => void;
};

export function TrashListItem({
  item,
  busy,
  onRestore,
  onDelete,
}: TrashListItemProps) {
  const { icon: Icon, singularLabel } = trashTypeConfig[item.type];
  const urgent = item.days_remaining <= 5;

  return (
    <article
      className={!item.can_restore ? "bg-amber-500/5 p-4 sm:p-5" : "p-4 sm:p-5"}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{item.title}</h3>
              <Badge variant="secondary">{singularLabel}</Badge>
              {item.group_size > 1 && (
                <Badge variant="outline">{item.group_size} items</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {item.context && <>{item.context} · </>}
              Deleted {formatDate(item.deleted_at)} ·{" "}
              <span
                className={
                  urgent
                    ? "font-semibold text-destructive"
                    : "font-semibold text-amber-700 dark:text-amber-300"
                }
              >
                {item.days_remaining}{" "}
                {item.days_remaining === 1 ? "day" : "days"} remaining
              </span>
            </p>
            {!item.can_restore && item.restore_block_reason && (
              <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-800 dark:text-amber-300">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {item.restore_block_reason}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pl-12 lg:pl-0">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !item.can_restore}
            onClick={onRestore}
          >
            <RefreshCw /> Restore
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 /> Delete forever
          </Button>
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
