"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cropImage } from "../lib/crop-image";

const AREA_BACKGROUND_ASPECT = 16 / 9;

export function ImageCropDialog({
  open,
  source,
  file,
  onOpenChange,
  onCrop,
}: {
  open: boolean;
  source: string;
  file: File;
  onOpenChange: (open: boolean) => void;
  onCrop: (file: File) => void;
}) {
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const applyCrop = async () => {
    if (!croppedArea) return;

    setIsApplying(true);
    setError(null);

    try {
      onCrop(await cropImage(source, file, croppedArea));
      onOpenChange(false);
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "The cropped image could not be created.",
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden data-ending-style:scale-100 data-starting-style:scale-100">
        <DialogHeader>
          <DialogTitle>Crop background image</DialogTitle>
          <DialogDescription>
            Drag to reposition the image, then zoom until the area looks right.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="relative h-[min(50vh,24rem)] min-h-64 overflow-hidden rounded-xl bg-black">
            <Cropper
              image={source}
              crop={position}
              zoom={zoom}
              aspect={AREA_BACKGROUND_ASPECT}
              onCropChange={setPosition}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedArea(pixels)}
              mediaProps={{ alt: "Background image being cropped" }}
            />
          </div>

          <div className="flex items-center gap-3">
            <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              aria-label="Image zoom"
              className="h-2 w-full cursor-pointer accent-foreground"
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isApplying}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!croppedArea || isApplying}
            onClick={applyCrop}
          >
            {isApplying ? "Applying…" : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
