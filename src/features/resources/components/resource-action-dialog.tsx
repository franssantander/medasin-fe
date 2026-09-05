import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Resource } from "../type";

export function ResourceActionDialog({
  resource,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  resource?: Resource;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const linkedAreaNames = resource?.areas.map((area) => area.name) ?? [];
  const linkedProjectNames =
    resource?.projects.map((project) => project.name) ?? [];
  const hasKnownLinks =
    linkedAreaNames.length > 0 || linkedProjectNames.length > 0;

  return (
    <Dialog open={Boolean(resource)} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Archive resource?</DialogTitle>
          <DialogDescription>
            {resource
              ? `“${resource.title}” will be archived and removed from your active resources.`
              : "This resource will be archived."}
          </DialogDescription>
        </DialogHeader>
        <div
          role="note"
          className="grid gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
        >
          <div className="flex items-start gap-2 font-medium">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>Archiving will permanently remove its existing links.</span>
          </div>
          {hasKnownLinks && (
            <ul className="grid list-disc gap-1 pl-9 text-xs">
              {linkedAreaNames.length > 0 && (
                <li>
                  {linkedAreaNames.length}{" "}
                  {linkedAreaNames.length === 1 ? "area" : "areas"}: {" "}
                  {linkedAreaNames.join(", ")}
                </li>
              )}
              {linkedProjectNames.length > 0 && (
                <li>
                  {linkedProjectNames.length}{" "}
                  {linkedProjectNames.length === 1 ? "project" : "projects"}: {" "}
                  {linkedProjectNames.join(", ")}
                </li>
              )}
            </ul>
          )}
          <p className="pl-6 text-xs">
            Any project task links will also be removed. Restoring the resource
            later will not reconnect these links.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Archiving…" : "Archive resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
