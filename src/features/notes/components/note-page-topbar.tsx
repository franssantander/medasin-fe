"use client";

import {
  Check,
  ChevronRight,
  Ellipsis,
  FilePlus2,
  FileText,
  LoaderCircle,
  Lock,
  Pin,
  PinOff,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { noteTitle, type FlatNote } from "../note-tree-utils";
import { IconTooltipButton } from "./note-page-sidebar";

export type NoteSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type NotePageMenu = {
  pinned: boolean;
  createPending: boolean;
  onAddChild: () => void;
  onPin: () => void;
  onDelete: () => void;
};

export function NotePageTopbar({
  leading,
  rootLabel,
  ancestors,
  currentTitle,
  onOpenNote,
  archived,
  saveStatus,
  onRetrySave,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  menu,
}: {
  leading?: ReactNode;
  rootLabel: string;
  ancestors: FlatNote[];
  currentTitle: string;
  onOpenNote: (uuid: string) => void;
  archived: boolean;
  saveStatus: NoteSaveStatus;
  onRetrySave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  menu?: NotePageMenu;
}) {
  const collapsed = ancestors.length > 2;
  const visibleAncestors = collapsed
    ? [ancestors[0], ancestors[ancestors.length - 1]]
    : ancestors;
  const hiddenAncestors = collapsed ? ancestors.slice(1, -1) : [];

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
      {leading}
      <nav aria-label="Note breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-0.5 text-sm text-muted-foreground">
          <li className="hidden min-w-0 shrink-0 items-center px-1 sm:flex">
            <span className="max-w-32 truncate">{rootLabel}</span>
          </li>
          {visibleAncestors.map((note, index) => (
            <li key={note.uuid} className="flex min-w-0 items-center gap-0.5">
              <Separator className={index === 0 ? "hidden sm:block" : undefined} />
              {collapsed && index === 1 && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Show hidden parent pages"
                        />
                      }
                    >
                      <Ellipsis />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="start" className="max-w-72">
                      {hiddenAncestors.map((hidden) => (
                        <DropdownMenuItem
                          key={hidden.uuid}
                          onClick={() => onOpenNote(hidden.uuid)}
                        >
                          <FileText />
                          <span className="min-w-0 truncate">
                            {noteTitle(hidden.title)}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Separator />
                </>
              )}
              <button
                type="button"
                title={noteTitle(note.title)}
                className="max-w-28 truncate rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 sm:max-w-40"
                onClick={() => onOpenNote(note.uuid)}
              >
                {noteTitle(note.title)}
              </button>
            </li>
          ))}
          <li className="flex min-w-0 items-center gap-0.5">
            <Separator className={ancestors.length === 0 ? "hidden sm:block" : undefined} />
            <span
              aria-current="page"
              title={noteTitle(currentTitle)}
              className="min-w-0 truncate px-1.5 py-1 font-medium text-foreground"
            >
              {noteTitle(currentTitle)}
            </span>
          </li>
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        {archived ? (
          <Badge variant="secondary" className="gap-1">
            <Lock className="size-3" aria-hidden="true" />
            Read only
          </Badge>
        ) : (
          <SaveStatus status={saveStatus} onRetry={onRetrySave} />
        )}
        {!archived && (
          <div className="hidden items-center sm:flex">
            <IconTooltipButton
              label="Undo"
              shortcut={
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Z</Kbd>
                </KbdGroup>
              }
              preserveFocus
              disabled={!canUndo}
              onClick={onUndo}
            >
              <Undo2 />
            </IconTooltipButton>
            <IconTooltipButton
              label="Redo"
              shortcut={
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Shift</Kbd>
                  <Kbd>Z</Kbd>
                </KbdGroup>
              }
              preserveFocus
              disabled={!canRedo}
              onClick={onRedo}
            >
              <Redo2 />
            </IconTooltipButton>
          </div>
        )}
        {menu && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Page actions"
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end">
              <DropdownMenuItem
                disabled={menu.createPending}
                onClick={menu.onAddChild}
              >
                <FilePlus2 />
                Add sub-page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={menu.onPin}>
                {menu.pinned ? <PinOff /> : <Pin />}
                {menu.pinned ? "Unpin" : "Pin to top"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={menu.onDelete}>
                <Trash2 />
                Delete page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function Separator({ className }: { className?: string }) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={cn("size-3.5 shrink-0 text-muted-foreground/60", className)}
    />
  );
}

function SaveStatus({
  status,
  onRetry,
}: {
  status: NoteSaveStatus;
  onRetry: () => void;
}) {
  return (
    <span
      aria-live="polite"
      className="flex items-center gap-1.5 px-1 text-xs whitespace-nowrap text-muted-foreground"
    >
      {status === "saving" ? (
        <>
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          Saving…
        </>
      ) : status === "dirty" ? (
        <>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
          Unsaved
        </>
      ) : status === "saved" ? (
        <>
          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          Saved
        </>
      ) : status === "error" ? (
        <>
          <span className="text-destructive">Couldn&apos;t save</span>
          <Button
            type="button"
            variant="link"
            size="xs"
            className="h-auto px-0 text-destructive"
            onClick={onRetry}
          >
            Retry
          </Button>
        </>
      ) : null}
    </span>
  );
}
