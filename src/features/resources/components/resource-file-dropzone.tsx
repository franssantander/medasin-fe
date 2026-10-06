"use client";

import { useRef, useState, type DragEvent } from "react";
import { FilePlus2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ResourceFileDropzone({ id, disabled = false, pending = false, onFiles }: {
  id: string;
  disabled?: boolean;
  pending?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFiles(files: FileList | null) {
    if (!disabled && files?.length) onFiles(Array.from(files));
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    selectFiles(event.dataTransfer.files);
  }

  return (
    <>
      <Input ref={inputRef} id={id} type="file" multiple disabled={disabled} tabIndex={-1} aria-label="Choose images or files" className="sr-only" onChange={(event) => { selectFiles(event.target.files); event.target.value = ""; }} />
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-label={pending ? "Uploading files" : "Choose images or files"}
        className={cn("group h-auto min-h-32 w-full flex-col gap-2 whitespace-normal border-dashed bg-muted/20 px-4 py-5 text-center", dragging && "border-primary bg-primary/5 ring-3 ring-primary/10")}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? "none" : "copy"; }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={handleDrop}
      >
        <span className="flex size-10 items-center justify-center rounded-lg border bg-background text-muted-foreground">
          {pending ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <FilePlus2 className="size-5" aria-hidden="true" />}
        </span>
        <span className="text-sm font-medium">{pending ? "Uploading files…" : dragging ? "Drop files here" : "Drop images or files here"}</span>
        <span className="text-xs font-normal text-muted-foreground">{pending ? "Your files will appear here when the upload finishes." : "or click to browse · up to 10 files, 20 MB each"}</span>
      </Button>
    </>
  );
}
