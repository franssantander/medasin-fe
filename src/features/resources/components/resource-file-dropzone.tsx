"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";
import { FilePlus2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ResourceFileDropzone({
  id,
  disabled = false,
  onFiles,
}: {
  id: string;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function selectFiles(files: FileList | null) {
    if (disabled || !files?.length) return;
    onFiles(Array.from(files));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    selectFiles(event.dataTransfer.files);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (disabled || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    document.getElementById(id)?.click();
  }

  return (
    <>
      <Input
        id={id}
        type="file"
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          selectFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <label
        htmlFor={id}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={cn(
          "group flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-5 text-center outline-none transition-colors",
          "hover:border-primary/50 hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          dragging && "border-primary bg-primary/5 ring-3 ring-primary/10",
          disabled && "pointer-events-none cursor-not-allowed opacity-60",
        )}
        onKeyDown={handleKeyDown}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <span className="mb-3 flex size-10 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs transition-colors group-hover:text-foreground">
          <FilePlus2 className="size-5" />
        </span>
        <span className="text-sm font-medium text-foreground">
          {dragging ? "Drop files here" : "Drag and drop images or files"}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          or click to browse · up to 10 files, 20 MB each
        </span>
      </label>
    </>
  );
}
