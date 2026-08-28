import { Archive, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Area } from "../type";
import type { AreaConfirmationAction } from "./area-action-dialog";
import { DEFAULT_AREA_BACKGROUND } from "./area-form-dialog";
import { AreaIcon, areaBadgeStyle } from "./area-icons";

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
  return (
    <Card className="gap-0 py-0">
      <div
        className="h-40 bg-cover bg-center sm:h-48"
        style={{
          backgroundImage: `url('${area.background_image_url || DEFAULT_AREA_BACKGROUND}')`,
        }}
        role="img"
        aria-label={`${area.name} background`}
      />
      <CardHeader className="py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div
          className="flex size-12 items-center justify-center rounded-xl"
          style={areaBadgeStyle(area.background)}
        >
          <AreaIcon name={area.icon} className="size-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{area.name}</CardTitle>
            {archived && <Badge variant="secondary">Archived</Badge>}
          </div>
          <CardDescription className="mt-1">
            {area.description || "No description yet."}
          </CardDescription>
        </div>
        <CardAction className="flex gap-2">
          {archived ? (
            <Button
              variant="outline"
              onClick={onRestore}
              disabled={restorePending}
            >
              Restore
            </Button>
          ) : (
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction("archive")}>
                  <Archive />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  destructive
                  onClick={() => onAction("delete")}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardAction>
      </CardHeader>
      {archived && (
        <CardContent className="pb-6">
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            This Area is read-only. Restore it before making changes.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
