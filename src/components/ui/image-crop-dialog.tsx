"use client";

import { useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { cropImage } from "@/lib/image/crop-image";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

export type ImageCropAspectOption = {
  label: string;
  value?: number;
};

function centeredCrop(
  width: number,
  height: number,
  aspect?: number,
  coverage = 90,
): Crop {
  if (!aspect) {
    return centerCrop(
      { unit: "%", width: coverage, height: coverage },
      width,
      height,
    );
  }

  const containerAspect = width / height;
  const cropWidth =
    aspect >= containerAspect
      ? coverage
      : (coverage * aspect) / containerAspect;
  const cropHeight =
    aspect >= containerAspect
      ? (coverage * containerAspect) / aspect
      : coverage;

  return centerCrop(
    { unit: "%", width: cropWidth, height: cropHeight },
    width,
    height,
  );
}

export function ImageCropDialog({
  open,
  source,
  file,
  aspect,
  aspectOptions,
  title = "Crop image",
  description = "Drag and resize the selection until the crop looks right.",
  onOpenChange,
  onCrop,
}: {
  open: boolean;
  source: string;
  file: File;
  aspect: number;
  aspectOptions?: ImageCropAspectOption[];
  title?: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  onCrop: (file: File) => void | Promise<void>;
}) {
  const initialAspect = aspectOptions?.[0] ?? {
    label: "Crop aspect ratio",
    value: aspect,
  };
  const imageRef = useRef<HTMLImageElement>(null);
  const [selectedAspect, setSelectedAspect] = useState(initialAspect);
  const [selection, setSelection] = useState<Crop>();
  const [croppedArea, setCroppedArea] = useState<PixelCrop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const applyCrop = async () => {
    if (!croppedArea) return;

    const image = imageRef.current;
    if (!image?.width || !image.height) {
      setError("The selected image dimensions could not be measured.");
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    setIsApplying(true);
    setError(null);

    try {
      await onCrop(
        await cropImage(source, file, {
          x: croppedArea.x * scaleX,
          y: croppedArea.y * scaleY,
          width: croppedArea.width * scaleX,
          height: croppedArea.height * scaleY,
        }),
      );
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex h-[min(50vh,24rem)] min-h-64 items-center justify-center overflow-auto rounded-xl bg-black p-3">
            <ReactCrop
              crop={selection}
              aspect={selectedAspect.value}
              minWidth={24}
              minHeight={24}
              keepSelection
              ruleOfThirds
              className="max-h-full max-w-full"
              onChange={(_, percentCrop) => setSelection(percentCrop)}
              onComplete={(pixels) => setCroppedArea(pixels)}
            >
              {/* react-image-crop requires a direct image element for its measurements and handles. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={source}
                alt="Image being cropped"
                className="max-h-[calc(min(50vh,24rem)-1.5rem)] max-w-full object-contain"
                onLoad={(event) => {
                  const { width, height } = event.currentTarget;
                  const nextCrop = centeredCrop(
                    width,
                    height,
                    selectedAspect.value,
                    selectedAspect.value === aspect ? 100 : 90,
                  );
                  setSelection(nextCrop);
                  setCroppedArea(convertToPixelCrop(nextCrop, width, height));
                }}
              />
            </ReactCrop>
          </div>

          {aspectOptions && aspectOptions.length > 1 && (
            <div
              role="group"
              aria-label="Crop aspect ratio"
              className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
            >
              {aspectOptions.map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  size="sm"
                  variant={
                    selectedAspect.label === option.label
                      ? "secondary"
                      : "ghost"
                  }
                  aria-pressed={selectedAspect.label === option.label}
                  onClick={() => {
                    setSelectedAspect(option);
                    setError(null);

                    const image = imageRef.current;
                    if (!image) return;

                    if (!option.value && selection) return;

                    const nextCrop = centeredCrop(
                      image.width,
                      image.height,
                      option.value,
                      option.value === aspect ? 100 : 90,
                    );
                    setSelection(nextCrop);
                    setCroppedArea(
                      convertToPixelCrop(nextCrop, image.width, image.height),
                    );
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}

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
