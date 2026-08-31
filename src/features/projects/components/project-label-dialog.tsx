"use client";

import {
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
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
import { getLabelTextColor } from "./project-kanban-utils";

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

type PendingAction = "save" | `delete:${string}`;

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
  onSave: (
    input: { name: string; color: BoardLabelColor },
    label?: BoardLabel,
  ) => Promise<void>;
  onDelete: (label: BoardLabel) => Promise<void>;
}) {
  const [editing, setEditing] = useState<BoardLabel>();
  const [name, setName] = useState("");
  const [color, setColor] = useState<BoardLabelColor>("slate");
  const [confirmDeleteUuid, setConfirmDeleteUuid] = useState<string>();
  const [pendingAction, setPendingAction] = useState<PendingAction>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const selectedColor =
    colors.find((item) => item.name === color) ?? colors[0];
  const isBusy = isPending || Boolean(pendingAction);

  const select = (label?: BoardLabel) => {
    setEditing(label);
    setName(label?.name ?? "");
    setColor(label?.color ?? "slate");
    setConfirmDeleteUuid(undefined);
    setErrorMessage(undefined);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) select();
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isBusy) return;

    setErrorMessage(undefined);
    setPendingAction("save");
    try {
      await onSave({ name: trimmedName, color }, editing);
      select();
    } catch {
      setErrorMessage(
        editing
          ? "The label could not be updated. Please try again."
          : "The label could not be created. Please try again.",
      );
    } finally {
      setPendingAction(undefined);
    }
  };

  const handleDelete = async (label: BoardLabel) => {
    if (isBusy) return;

    setErrorMessage(undefined);
    setPendingAction(`delete:${label.uuid}`);
    try {
      await onDelete(label);
      if (editing?.uuid === label.uuid) select();
      setConfirmDeleteUuid(undefined);
    } catch {
      setErrorMessage("The label could not be deleted. Please try again.");
    } finally {
      setPendingAction(undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tags className="size-5" />
            </span>
            <div className="grid gap-1">
              <DialogTitle>Board labels</DialogTitle>
              <DialogDescription>
                Create reusable labels to make tasks easier to scan and group.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 border-y sm:grid-cols-[minmax(0,1fr)_minmax(17rem,0.9fr)]">
          <section className="grid min-h-0 content-start gap-3 border-b p-5 sm:border-r sm:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Saved labels</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {labels.length}
              </span>
            </div>

            {labels.length === 0 ? (
              <div className="grid place-items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
                <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Tags className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">No labels yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Create your first label using the form.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid max-h-72 gap-1.5 overflow-y-auto pr-1">
                {labels.map((label) => {
                  const isDeleting =
                    pendingAction === `delete:${label.uuid}`;
                  const isConfirming = confirmDeleteUuid === label.uuid;

                  return (
                    <div
                      key={label.uuid}
                      className="flex min-h-11 items-center gap-2 rounded-lg border bg-background p-2 transition-colors hover:bg-muted/40"
                    >
                      <span
                        className="min-w-0 flex-1 truncate rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: label.hex,
                          color: getLabelTextColor(label.hex),
                        }}
                      >
                        {label.name}
                      </span>

                      {isConfirming ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Cancel deleting ${label.name}`}
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteUuid(undefined)}
                          >
                            <X />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label={`Confirm deleting ${label.name}`}
                            disabled={isBusy}
                            onClick={() => handleDelete(label)}
                          >
                            {isDeleting ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <Trash2 />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${label.name}`}
                            disabled={isBusy}
                            onClick={() => select(label)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Delete ${label.name}`}
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteUuid(label.uuid)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <form
            className="grid content-start gap-4 bg-muted/15 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {editing ? "Edit label" : "Create a label"}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {editing
                    ? "Update the name or color below."
                    : "Choose a short, recognizable name."}
                </p>
              </div>
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => select()}
                >
                  <Plus />
                  New
                </Button>
              )}
            </div>

            <div className="rounded-xl border bg-background p-3">
              <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Preview
              </p>
              <span
                className="inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  backgroundColor: selectedColor.hex,
                  color: getLabelTextColor(selectedColor.hex),
                }}
              >
                <span className="truncate">{name.trim() || "Label name"}</span>
              </span>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              <span className="flex items-center justify-between gap-3">
                Label name
                <span className="text-xs font-normal text-muted-foreground">
                  {name.length}/50
                </span>
              </span>
              <Input
                autoFocus
                value={name}
                disabled={isBusy}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Urgent, Design, Blocked"
                maxLength={50}
              />
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Color</legend>
              <div className="flex flex-wrap gap-2" aria-label="Label color">
                {colors.map((item) => {
                  const isSelected = color === item.name;

                  return (
                    <button
                      key={item.name}
                      type="button"
                      aria-label={`Use ${item.name}`}
                      aria-pressed={isSelected}
                      title={item.name}
                      disabled={isBusy}
                      className="flex size-8 items-center justify-center rounded-full border-2 border-background ring-offset-2 transition-[transform,box-shadow] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-ring disabled:pointer-events-none disabled:opacity-50"
                      style={{
                        backgroundColor: item.hex,
                        color: getLabelTextColor(item.hex),
                      }}
                      onClick={() => setColor(item.name)}
                    >
                      {isSelected && <Check className="size-4" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Button type="submit" disabled={!name.trim() || isBusy}>
              {pendingAction === "save" ? (
                <LoaderCircle className="animate-spin" />
              ) : editing ? (
                <Check />
              ) : (
                <Plus />
              )}
              {pendingAction === "save"
                ? editing
                  ? "Saving…"
                  : "Creating…"
                : editing
                  ? "Save changes"
                  : "Create label"}
            </Button>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {errorMessage}
              </p>
            )}
          </form>
        </div>

        <DialogFooter className="p-4">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => handleOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
