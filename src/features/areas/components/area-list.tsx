"use client";

import Link from "next/link";
import { Archive, Layers3, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreaMutation, useAreasQuery } from "../queries/area-query";
import type { Area } from "../type";
import { AreaFormDialog, DEFAULT_AREA_BACKGROUND } from "./area-form-dialog";
import { AreaIcon, areaBadgeStyle } from "./area-icons";

export function AreaList() {
  const { data, isLoading, isError, refetch } = useAreasQuery("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area>();
  const createArea = useAreaMutation("create");
  const updateArea = useAreaMutation("update", editingArea?.uuid);

  const openCreate = () => {
    setEditingArea(undefined);
    setFormOpen(true);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Areas"
        action={<Button onClick={openCreate}><Plus />New area</Button>}
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-48 rounded-xl" />)}
        </div>
      )}

      {isError && (
        <Card className="items-center py-12 text-center">
          <CardTitle>Areas could not be loaded</CardTitle>
          <CardDescription>Check your connection and try again.</CardDescription>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </Card>
      )}

      {data?.data.length === 0 && (
        <Card className="items-center py-14 text-center">
          <div className="rounded-full bg-muted p-3"><Layers3 className="size-6" /></div>
          <CardTitle>Create your first area</CardTitle>
          <CardDescription className="max-w-sm">Group the goals, habits, projects, notes, and resources that support an ongoing part of your life.</CardDescription>
          <Button onClick={openCreate}><Plus />New area</Button>
        </Card>
      )}

      {data && data.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.data.map((area) => (
            <AreaCard key={area.uuid} area={area} onEdit={() => { setEditingArea(area); setFormOpen(true); }} />
          ))}
        </div>
      )}

      <AreaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        area={editingArea}
        isPending={createArea.isPending || updateArea.isPending}
        onSubmit={async (input) => {
          if (editingArea) {
            await updateArea.mutateAsync(input);
            return;
          }
          await createArea.mutateAsync(input);
        }}
      />
    </div>
  );
}

function AreaCard({ area, onEdit }: { area: Area; onEdit: () => void }) {
  const [confirmationAction, setConfirmationAction] = useState<"archive" | "delete">();
  const archive = useAreaMutation("archive", area.uuid);
  const remove = useAreaMutation("remove", area.uuid);
  const isPending = archive.isPending || remove.isPending;
  const isDeleting = confirmationAction === "delete";

  const confirmAction = async () => {
    if (confirmationAction === "archive") {
      await archive.mutateAsync();
    } else if (confirmationAction === "delete") {
      await remove.mutateAsync();
    }

    setConfirmationAction(undefined);
  };

  return (
    <>
      <Card className="group relative gap-0 overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <Link
          href={`/areas/${area.uuid}`}
          aria-label={`Open ${area.name}`}
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />

        <div
          className="relative h-32 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
          style={{
            backgroundImage: `url('${area.background_image_url || DEFAULT_AREA_BACKGROUND}')`,
          }}
        >
          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
        </div>

        <div className="absolute right-3 top-3 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="secondary" size="icon-sm" className="bg-background/90 shadow-sm backdrop-blur-sm" aria-label={`Actions for ${area.name}`} />}><MoreHorizontal /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Pencil />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmationAction("archive")}><Archive />Archive</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setConfirmationAction("delete")}><Trash2 />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardContent className="relative gap-2 px-5 pb-5 pt-0">
          <div className="-mt-6 mb-1 flex size-12 items-center justify-center rounded-xl text-xl shadow-md ring-4 ring-card" style={areaBadgeStyle(area.background)}>
            <AreaIcon name={area.icon} className="size-5" />
          </div>
          <CardTitle>
            {area.name}
          </CardTitle>
          <CardDescription className="line-clamp-2 min-h-10">
            {area.description || "No description yet."}
          </CardDescription>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(confirmationAction)}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirmationAction(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDeleting ? "Delete area?" : "Archive area?"}</DialogTitle>
            <DialogDescription>
              {isDeleting
                ? `“${area.name}” will be permanently deleted. This action cannot be undone.`
                : `“${area.name}” will be moved to your archived areas. You can restore it later.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={isPending} onClick={() => setConfirmationAction(undefined)}>Cancel</Button>
            <Button variant={isDeleting ? "destructive" : "default"} disabled={isPending} onClick={confirmAction}>
              {isPending ? (isDeleting ? "Deleting…" : "Archiving…") : (isDeleting ? "Delete area" : "Archive area")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
