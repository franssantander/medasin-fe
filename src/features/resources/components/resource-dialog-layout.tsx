"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resourceFieldLabels, type ResourceFieldName, type ResourceFormErrors } from "../resource-form-utils";
import { ResourceIcon, resourceBadgeStyle } from "./resource-icons";

export const resourceFieldIds: Record<ResourceFieldName, string> = {
  title: "resource-title",
  appearance: "resource-badge-color",
  notes: "resource-notes",
  links: "resource-link",
  files: "resource-files-section",
  tags: "resource-tags",
  projects: "resource-projects",
  areas: "resource-areas",
  form: "resource-errors",
};

export function ResourceDialogLayout({
  open, title, description, icon, background, busy = false, onRequestClose, onClose, children,
}: {
  open: boolean;
  title: string;
  description: string;
  icon: string;
  background: string;
  busy?: boolean;
  onRequestClose: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const openerRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen && !busy) onRequestClose(); }}
      onOpenChangeComplete={(nextOpen) => { if (!nextOpen) onClose(); }}
    >
      <DialogContent
        showCloseButton={false}
        finalFocus={openerRef}
        className="h-[min(92dvh,56rem)] max-h-[92dvh] w-[calc(100%-1rem)] max-w-6xl gap-0 overflow-hidden p-0 motion-reduce:transition-none sm:w-[calc(100%-2rem)]"
      >
        <DialogHeader className="flex shrink-0 flex-row items-center gap-3 border-b px-5 py-4 pr-5 sm:px-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={resourceBadgeStyle(/^#[0-9a-f]{6}$/i.test(background) ? background : "#000000")}>
            <ResourceIcon name={icon} className="size-5" />
          </div>
          <div className="grid min-w-0 flex-1 gap-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">{description}</DialogDescription>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" disabled={busy} aria-label="Close resource dialog" onClick={onRequestClose}>
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function ResourceDialogBody({ main, sidebar, summary }: { main: ReactNode; sidebar: ReactNode; summary?: ReactNode }) {
  return (
    <div data-slot="resource-dialog-body" className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain scroll-py-6">
      {summary ? <div className="px-5 pt-5 sm:px-6">{summary}</div> : null}
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 p-5 sm:p-6">{main}</div>
        <aside aria-label="Resource organization" className="min-w-0 border-t bg-muted/20 p-5 sm:p-6 lg:border-l lg:border-t-0">{sidebar}</aside>
      </div>
    </div>
  );
}

export function ResourceDialogFooter({ status, children }: { status: ReactNode; children: ReactNode }) {
  return (
    <div data-slot="resource-dialog-footer" className="flex shrink-0 flex-col gap-3 border-t bg-popover px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0 text-xs text-muted-foreground">{status}</div>
      <div className="flex gap-2 [&>button]:h-11 [&>button]:flex-1 sm:[&>button]:flex-none">{children}</div>
    </div>
  );
}

export function focusResourceErrors() {
  window.requestAnimationFrame(() => document.getElementById(resourceFieldIds.form)?.focus());
}

export function ResourceErrorSummary({ errors }: { errors: ResourceFormErrors }) {
  const entries = Object.entries(errors) as [ResourceFieldName, string][];
  if (!entries.length) return null;
  return (
    <Alert variant="destructive" id={resourceFieldIds.form} tabIndex={-1} className="outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Please check your resource</AlertTitle>
      <AlertDescription>
        <ul className="grid gap-1">
          {entries.map(([field, error]) => (
            <li key={field}>
              {field === "form" ? error : (
                <button type="button" className="min-h-11 text-left underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => document.getElementById(resourceFieldIds[field])?.focus()}>
                  {resourceFieldLabels[field]}: {error}
                </button>
              )}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export function ResourceDiscardDialog({ open, editing = false, onOpenChange, onDiscard }: {
  open: boolean;
  editing?: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent initialFocus={cancelRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>{editing ? "Discard unsaved changes?" : "Discard this resource?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {editing ? "Your latest changes haven’t been saved. Changes that already saved will remain." : "Your resource hasn’t been created yet. Discarding will remove this draft and its selected files."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} className="h-11">Keep editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" className="h-11" onClick={onDiscard}>{editing ? "Discard unsaved changes" : "Discard draft"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
