"use client";

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
import { journalEntryTitle } from "../journal-utils";

export type JournalDeleteTarget = { uuid: string; title: string };

export function JournalDeleteDialog({
  target,
  onClose,
  onConfirm,
}: {
  target?: JournalDeleteTarget;
  onClose: () => void;
  onConfirm: (uuid: string) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!target) return;

    setError("");
    setPending(true);
    try {
      await onConfirm(target.uuid);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The journal entry could not be deleted.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!pending && !open) {
          setError("");
          onClose();
        }
      }}
    >
      {target && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete journal entry?</DialogTitle>
            <DialogDescription>
              “{journalEntryTitle(target.title)}” will move to Trash for 30
              days. You can restore it from Settings before it expires.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setError("");
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => void confirm()}
            >
              {pending ? "Deleting…" : "Delete entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
