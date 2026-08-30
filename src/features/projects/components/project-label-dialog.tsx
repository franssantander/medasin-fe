"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import type { BoardLabel, BoardLabelColor } from "../type";

const colors: { name: BoardLabelColor; hex: string }[] = [
  { name: "slate", hex: "#64748B" },
  { name: "red", hex: "#EF4444" },
  { name: "orange", hex: "#F97316" },
  { name: "amber", hex: "#F59E0B" },
  { name: "green", hex: "#22C55E" },
  { name: "blue", hex: "#3B82F6" },
  { name: "violet", hex: "#8B5CF6" },
  { name: "pink", hex: "#EC4899" },
];

export function ProjectLabelDialog({
  open,
  onOpenChange,
  labels,
  isPending,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: BoardLabel[];
  isPending: boolean;
  onSave: (input: { name: string; color: BoardLabelColor }, label?: BoardLabel) => Promise<void>;
  onDelete: (label: BoardLabel) => Promise<void>;
}) {
  const [editing, setEditing] = useState<BoardLabel>();
  const [name, setName] = useState("");
  const [color, setColor] = useState<BoardLabelColor>("slate");

  const select = (label?: BoardLabel) => {
    setEditing(label);
    setName(label?.name ?? "");
    setColor(label?.color ?? "slate");
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) select();
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Board labels</DialogTitle>
          <DialogDescription>Create reusable labels for this board.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {labels.length > 0 && <div className="grid max-h-48 gap-2 overflow-y-auto">
            {labels.map((label) => <div key={label.uuid} className="flex items-center gap-2 rounded-lg border p-2">
              <span className="size-3 rounded-full" style={{ backgroundColor: label.hex }} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{label.name}</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${label.name}`} onClick={() => select(label)}><Pencil /></Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${label.name}`} disabled={isPending} onClick={() => onDelete(label)}><Trash2 /></Button>
            </div>)}
          </div>}
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">{editing ? "Edit label" : "New label"}</p>{editing && <Button type="button" variant="ghost" size="sm" onClick={() => select()}><Plus />New</Button>}</div>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Label name" maxLength={50} />
            <div className="flex flex-wrap gap-2" aria-label="Label color">
              {colors.map((item) => <button key={item.name} type="button" aria-label={item.name} aria-pressed={color === item.name} className="size-7 rounded-full border-2 border-background ring-offset-2 transition-shadow aria-pressed:ring-2 aria-pressed:ring-ring" style={{ backgroundColor: item.hex }} onClick={() => setColor(item.name)} />)}
            </div>
            <Button type="button" disabled={!name.trim() || isPending} onClick={async () => { await onSave({ name: name.trim(), color }, editing); select(); }}>{editing ? "Save label" : "Add label"}</Button>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
