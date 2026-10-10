import { useRef } from "react";
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
  action = "archive",
  isPending,
  onConfirm,
  onOpenChange,
}: {
  resource?: Resource;
  action?: "archive" | "delete";
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isDelete = action === "delete";
  const linkedAreaNames = resource?.areas.map((area) => area.name) ?? [];
  const linkedProjectNames =
    resource?.projects.map((project) => project.name) ?? [];
  const hasKnownLinks =
    linkedAreaNames.length > 0 || linkedProjectNames.length > 0;

  return (
    <Dialog open={Boolean(resource)} onOpenChange={(open) => { if (!isPending) onOpenChange(open); }}>
      <DialogContent initialFocus={cancelRef} showCloseButton={!isPending} className="w-full max-w-lg overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{isDelete ? "Delete resource?" : "Archive resource?"}</DialogTitle>
          <DialogDescription>
            {isDelete
              ? `“${resource?.title ?? "This resource"}” will move to Trash for 30 days. You can restore it from Settings before it is permanently deleted. Deleting frees a resource slot.`
              : resource
              ? `“${resource.title}” will be archived and removed from your active resources.`
              : "This resource will be archived."}
          </DialogDescription>
        </DialogHeader>
        {!isDelete && <div
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
          <p className="pl-6 text-xs">Archived resources still count toward your plan usage.</p>
        </div>}
        <DialogFooter>
          <Button
            ref={cancelRef}
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
            {isPending ? isDelete ? "Deleting…" : "Archiving…" : isDelete ? "Delete resource" : "Archive resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
