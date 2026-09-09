"use client";

import { Link2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Habit } from "../type";

export function HabitLinkDialog({
  open,
  areaUuid,
  habits,
  loading,
  pending,
  onOpenChange,
  onLink,
}: {
  open: boolean;
  areaUuid: string;
  habits: Habit[];
  loading: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (habit: Habit) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Habit>();
  const options = useMemo(() => {
    const query = search.trim().toLowerCase();
    return habits.filter((habit) => {
      if (habit.area?.uuid === areaUuid) return false;
      return !query || [habit.name, habit.description, habit.area?.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [areaUuid, habits, search]);

  const close = (next: boolean) => {
    if (pending) return;
    if (!next) {
      setSearch("");
      setSelected(undefined);
    }
    onOpenChange(next);
  };
  const submit = async () => {
    if (!selected) return;
    await onLink(selected);
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link a habit</DialogTitle>
          <DialogDescription>
            Choose a habit to link to this Area. Habits already linked here are hidden.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search habits…" />
        </div>
        <div className="grid max-h-72 gap-2 overflow-y-auto">
          {loading ? <Skeleton className="h-20" /> : options.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No habits available to link.</p> : options.map((habit) => (
            <button key={habit.uuid} type="button" aria-pressed={selected?.uuid === habit.uuid} onClick={() => setSelected(habit)} className="flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/5">
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{habit.name}</span><span className="block truncate text-xs text-muted-foreground">{habit.area ? `Move from ${habit.area.name}` : "Standalone habit"}</span></span>
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => close(false)}>Cancel</Button>
          <Button disabled={!selected || pending} onClick={submit}>{pending ? "Linking…" : "Link habit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
