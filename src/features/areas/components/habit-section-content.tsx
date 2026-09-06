"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Habit, Paginated } from "../type";
import { HabitTracker } from "./habit-tracker";

export function HabitSectionContent({
  habits,
  pagination,
  archived,
  areaUuid,
  page,
  setPage,
  onAdd,
  onEdit,
  onDelete,
}: {
  habits: Habit[];
  pagination?: Paginated<Habit>;
  archived: boolean;
  areaUuid: string;
  page: number;
  setPage: (page: number) => void;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
  onDelete: (uuid: string) => Promise<void>;
}) {
  const [habitToDelete, setHabitToDelete] = useState<Habit>();
  const [deletePending, setDeletePending] = useState(false);

  const confirmDelete = async () => {
    if (!habitToDelete) return;
    setDeletePending(true);
    try {
      await onDelete(habitToDelete.uuid);
      setHabitToDelete(undefined);
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <>
      <HabitTracker
        habits={habits}
        pagination={pagination}
        archived={archived}
        areaUuid={areaUuid}
        page={page}
        setPage={setPage}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={(uuid) =>
          setHabitToDelete(habits.find((habit) => habit.uuid === uuid))
        }
      />
      <Dialog
        open={Boolean(habitToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletePending) setHabitToDelete(undefined);
        }}
      >
        <DialogContent className="w-full max-w-md overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Delete habit?</DialogTitle>
            <DialogDescription>
              “{habitToDelete?.name}” and its check-in history will move to
              Trash for 30 days and can be restored from Settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletePending}
              onClick={() => setHabitToDelete(undefined)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              onClick={confirmDelete}
            >
              {deletePending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {deletePending ? "Deleting…" : "Delete habit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
