import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  FolderKanban,
  LibraryBig,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatAreaUpdatedAt } from "../area-list-utils";
import type { Area } from "../type";
import type { AreaConfirmationAction } from "./area-action-dialog";
import { DEFAULT_AREA_BACKGROUND } from "./area-form-dialog";
import { AreaIcon, areaBadgeStyle } from "./area-icons";

function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function AreaDetailHeader({
  area,
  archived,
  restorePending,
  onRestore,
  onEdit,
  onAction,
}: {
  area: Area;
  archived: boolean;
  restorePending: boolean;
  onRestore: () => void;
  onEdit: () => void;
  onAction: (action: AreaConfirmationAction) => void;
}) {
  const projectCount = area.projects?.length;
  const resourceCount = area.resources?.length;

  return (
    <Card className="gap-0 py-0">
      <div className="relative h-32 overflow-hidden bg-muted sm:h-40">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${area.background_image_url || DEFAULT_AREA_BACKGROUND}')`,
          }}
          role="img"
          aria-label={`${area.name} cover image`}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/30 via-black/0 to-black/10" />
      </div>

      <CardContent className="grid gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            className="relative z-1 -mt-12 flex size-16 shrink-0 items-center justify-center rounded-2xl shadow-md ring-4 ring-card sm:-mt-14"
            style={areaBadgeStyle(area.background)}
          >
            <AreaIcon name={area.icon} className="size-6" />
          </div>

          {!archived && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onEdit}>
                <Pencil />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Actions for ${area.name}`}
                    />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  <DropdownMenuItem onClick={() => onAction("archive")}>
                    <Archive />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    destructive
                    onClick={() => onAction("delete")}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight [overflow-wrap:anywhere]">
              {area.name}
            </h1>
            {archived && <Badge variant="secondary">Archived</Badge>}
          </div>
          {area.description ? (
            <p className="line-clamp-3 max-w-3xl text-sm text-muted-foreground">
              {area.description}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No description yet.
            </p>
          )}
        </div>

        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">
          {projectCount !== undefined && (
            <li className="flex items-center gap-1.5">
              <FolderKanban aria-hidden="true" />
              {plural(projectCount, "project")}
            </li>
          )}
          {resourceCount !== undefined && (
            <li className="flex items-center gap-1.5">
              <LibraryBig aria-hidden="true" />
              {plural(resourceCount, "resource")}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" />
            {formatAreaUpdatedAt(area.updated_at)}
          </li>
        </ul>

        {archived && (
          <Alert role="status">
            <Archive aria-hidden="true" />
            <AlertTitle>This area is archived</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>It&apos;s read-only. Restore it to make changes.</span>
              <Button
                variant="outline"
                onClick={onRestore}
                disabled={restorePending}
              >
                {restorePending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ArchiveRestore />
                )}
                {restorePending ? "Restoring…" : "Restore"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
