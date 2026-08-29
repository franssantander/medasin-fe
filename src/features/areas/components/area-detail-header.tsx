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
    <Card className="relative min-h-56 gap-0 overflow-hidden bg-black py-0 text-white sm:min-h-60">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${area.background_image_url || DEFAULT_AREA_BACKGROUND}')`,
        }}
        role="img"
        aria-label={`${area.name} background`}
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/80 via-black/45 to-black/65" />
      <CardHeader className="absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto] items-start gap-4 py-5 sm:py-6">
        <div className="min-w-0">
          <div
            className="mb-3 flex size-12 items-center justify-center rounded-xl shadow-lg ring-1 ring-white/25"
            style={areaBadgeStyle(area.background)}
          >
            <AreaIcon name={area.icon} className="size-5" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl font-bold text-white drop-shadow-sm">
              {area.name}
            </CardTitle>
            {archived && (
              <Badge className="border-white/25 bg-black/35 text-white backdrop-blur-sm">
                Archived
              </Badge>
            )}
          </div>
          <CardDescription className="mt-1 line-clamp-3 max-w-2xl text-white/85 drop-shadow-sm">
            {area.description || "No description yet."}
          </CardDescription>
        </div>
        <CardAction className="col-start-2 row-start-1 flex gap-2">
          {archived ? (
            <Button
              variant="secondary"
              className="border border-white/20 bg-black/35 text-white shadow-sm backdrop-blur-sm hover:bg-black/50 hover:text-white"
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
                    variant="secondary"
                    size="icon"
                    className="border border-white/20 bg-black/35 text-white shadow-sm backdrop-blur-sm hover:bg-black/50 hover:text-white"
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
        <CardContent className="relative z-10 mt-auto pb-5 sm:pb-6">
          <p className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white/85 backdrop-blur-sm">
            This Area is read-only. Restore it before making changes.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
