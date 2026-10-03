"use client";

import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  LoaderCircleIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cropImage } from "@/lib/image/crop-image";
import { cn } from "@/lib/utils";

export type ProfilePhotoCropDialogProps = {
  open: boolean;
  source: string;
  file: File;
  maxBytes?: number;
  onOpenChange: (open: boolean) => void;
  onCrop: (file: File) => void | Promise<void>;
};

type ImageDimensions = { width: number; height: number };
type CropTransform = { zoom: number; x: number; y: number };
type Drag = {
  pointerId: number;
  element: HTMLDivElement;
  startX: number;
  startY: number;
  size: number;
  transform: CropTransform;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const PAN_STEP = 0.04;

function clampTransform(transform: CropTransform, dimensions: ImageDimensions) {
  const shortestSide = Math.min(dimensions.width, dimensions.height);
  const maxX = (dimensions.width / shortestSide * transform.zoom - 1) / 2;
  const maxY = (dimensions.height / shortestSide * transform.zoom - 1) / 2;

  return {
    zoom: transform.zoom,
    x: Math.min(maxX, Math.max(-maxX, transform.x)),
    y: Math.min(maxY, Math.max(-maxY, transform.y)),
  };
}

export function ProfilePhotoCropDialog(props: ProfilePhotoCropDialogProps) {
  if (!props.open) return null;

  // Each selected source gets a fresh editor without retaining the previous crop.
  return <ProfilePhotoCropSession key={props.source} {...props} />;
}

function ProfilePhotoCropSession({
  open,
  source,
  file,
  maxBytes,
  onOpenChange,
  onCrop,
}: ProfilePhotoCropDialogProps) {
  const zoomId = useId();
  const hintId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewportSizeRef = useRef(0);
  const dragRef = useRef<Drag | null>(null);
  const applyingRef = useRef(false);
  const mountedRef = useRef(true);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [transform, setTransform] = useState<CropTransform>({ zoom: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controlsDisabled = isApplying || !dimensions;

  const releaseDrag = useCallback((updateState = true) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.element.hasPointerCapture(drag.pointerId)) {
      drag.element.releasePointerCapture(drag.pointerId);
    }
    if (updateState && mountedRef.current) setIsDragging(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseDrag(false);
    };
  }, [releaseDrag]);

  const observeViewport = useCallback((viewport: HTMLDivElement | null) => {
    viewportRef.current = viewport;
    if (!viewport) return;
    viewportSizeRef.current = viewport.clientWidth;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      // Positions are relative to the frame, so resizing preserves the selected pixels.
      viewportSizeRef.current = entry.contentRect.width;
      if (dragRef.current) releaseDrag();
    });
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      releaseDrag(false);
      viewportRef.current = null;
    };
  }, [releaseDrag]);

  const movePhoto = (x: number, y: number) => {
    if (applyingRef.current || !dimensions) return;
    setError(null);
    setTransform((current) => clampTransform({
      ...current,
      x: current.x + x,
      y: current.y + y,
    }, dimensions));
  };

  const changeZoom = (value: number) => {
    if (applyingRef.current || !dimensions) return;
    releaseDrag();
    setError(null);
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
    setTransform((current) => clampTransform({
      zoom,
      x: current.x * zoom / current.zoom,
      y: current.y * zoom / current.zoom,
    }, dimensions));
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (applyingRef.current || !dimensions || !event.isPrimary || event.button !== 0) return;
    const size = viewportSizeRef.current || event.currentTarget.clientWidth;
    if (!size) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      element: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      size,
      transform,
    };
    setIsDragging(true);
    setError(null);
  };

  const dragPhoto = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || applyingRef.current || !dimensions) return;
    setTransform(clampTransform({
      ...drag.transform,
      x: drag.transform.x + (event.clientX - drag.startX) / drag.size,
      y: drag.transform.y + (event.clientY - drag.startY) / drag.size,
    }, dimensions));
  };

  const positionWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? PAN_STEP * 4 : PAN_STEP;
    const direction = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    movePhoto(direction[0], direction[1]);
  };

  const resetCrop = () => {
    if (applyingRef.current || !dimensions) return;
    releaseDrag();
    setTransform({ zoom: 1, x: 0, y: 0 });
    setError(null);
  };

  const applyCrop = async () => {
    if (applyingRef.current || !dimensions) return;
    applyingRef.current = true;
    releaseDrag();
    setIsApplying(true);
    setError(null);

    // A square frame occupies shortestSide / zoom natural pixels. Pan uses frame units.
    const side = Math.min(dimensions.width, dimensions.height) / transform.zoom;
    const crop = {
      x: Math.min(dimensions.width - side, Math.max(0, (dimensions.width - side) / 2 - transform.x * side)),
      y: Math.min(dimensions.height - side, Math.max(0, (dimensions.height - side) / 2 - transform.y * side)),
      width: side,
      height: side,
    };

    try {
      const cropped = await cropImage(source, file, crop, { maxBytes });
      if (!mountedRef.current) return;
      await onCrop(cropped.file);
      if (mountedRef.current) onOpenChange(false);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : "The cropped photo could not be saved. Try again.");
      }
    } finally {
      applyingRef.current = false;
      if (mountedRef.current) setIsApplying(false);
    }
  };

  const shortestSide = dimensions ? Math.min(dimensions.width, dimensions.height) : 1;

  return (
    <Dialog
      open={open}
      disablePointerDismissal={isApplying}
      onOpenChange={(nextOpen, details) => {
        if (applyingRef.current) {
          details.cancel();
          return;
        }
        releaseDrag();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={!isApplying}
        initialFocus={viewportRef}
        className="max-h-[calc(100dvh-2rem)] max-w-md gap-4 p-4 data-ending-style:scale-100 data-starting-style:scale-100 sm:p-6"
      >
        <DialogHeader>
          <DialogTitle>Crop profile photo</DialogTitle>
          <DialogDescription>Drag your photo to position it, then zoom for the right fit.</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="mx-auto w-full max-w-[min(18rem,40dvh)]">
            <div
              ref={observeViewport}
              role="group"
              aria-label="Profile photo crop area"
              aria-roledescription="photo crop editor"
              aria-describedby={hintId}
              aria-disabled={controlsDisabled}
              aria-busy={!dimensions && !loadError}
              tabIndex={0}
              className={cn(
                "relative aspect-square touch-none overflow-hidden rounded-xl bg-muted outline-none ring-1 ring-border focus-visible:ring-3 focus-visible:ring-ring/50",
                !controlsDisabled && (isDragging ? "cursor-grabbing" : "cursor-grab"),
              )}
              onPointerDown={startDrag}
              onPointerMove={dragPhoto}
              onPointerUp={() => releaseDrag()}
              onPointerCancel={() => releaseDrag()}
              onLostPointerCapture={() => releaseDrag()}
              onBlur={() => releaseDrag()}
              onKeyDown={positionWithKeyboard}
            >
              {/* The crop needs the decoded image's natural dimensions and a movable pixel preview. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={loadAttempt}
                src={source}
                alt="Profile photo preview"
                draggable={false}
                className={cn("pointer-events-none absolute max-w-none select-none", !dimensions && "opacity-0")}
                style={{
                  width: `${dimensions ? dimensions.width / shortestSide * transform.zoom * 100 : 100}%`,
                  height: `${dimensions ? dimensions.height / shortestSide * transform.zoom * 100 : 100}%`,
                  left: `${50 + transform.x * 100}%`,
                  top: `${50 + transform.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (!naturalWidth || !naturalHeight) {
                    setLoadError("This photo has invalid dimensions. Choose another photo.");
                    return;
                  }
                  setDimensions({ width: naturalWidth, height: naturalHeight });
                  setLoadError(null);
                }}
                onError={() => setLoadError("This photo could not be loaded. Try again or choose another photo.")}
              />
              {dimensions ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-ring/70 shadow-[0_0_0_999px_color-mix(in_oklch,var(--background)_78%,transparent)]"
                />
              ) : !loadError ? (
                <>
                  <Skeleton className="absolute inset-0 size-full" />
                  <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Loading photo…</p>
                </>
              ) : null}
            </div>
          </div>
          <p id={hintId} className="text-center text-xs text-muted-foreground">
            Your photo appears inside the circle. Use arrow keys or the buttons to move it.
          </p>

          <FieldGroup className="gap-3">
            <Field data-disabled={controlsDisabled} className="gap-2">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor={zoomId}>Zoom</FieldLabel>
                <span aria-hidden="true" className="text-xs tabular-nums text-muted-foreground">{Math.round(transform.zoom * 100)}%</span>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <Button type="button" variant="outline" size="icon-lg" className="size-11" aria-label="Zoom out" disabled={controlsDisabled || transform.zoom <= MIN_ZOOM} onClick={() => changeZoom(transform.zoom - 0.1)}>
                  <MinusIcon />
                </Button>
                <input
                  id={zoomId}
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.05}
                  value={transform.zoom}
                  aria-valuetext={`${Math.round(transform.zoom * 100)} percent`}
                  disabled={controlsDisabled}
                  className="h-11 min-w-0 flex-1 cursor-pointer accent-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50"
                  onChange={(event) => changeZoom(event.currentTarget.valueAsNumber)}
                />
                <Button type="button" variant="outline" size="icon-lg" className="size-11" aria-label="Zoom in" disabled={controlsDisabled || transform.zoom >= MAX_ZOOM} onClick={() => changeZoom(transform.zoom + 0.1)}>
                  <PlusIcon />
                </Button>
              </div>
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="Position photo" className="flex gap-1">
              <Button type="button" variant="ghost" size="icon-lg" className="size-11" aria-label="Move photo left" disabled={controlsDisabled} onClick={() => movePhoto(-PAN_STEP, 0)}><ArrowLeftIcon /></Button>
              <Button type="button" variant="ghost" size="icon-lg" className="size-11" aria-label="Move photo up" disabled={controlsDisabled} onClick={() => movePhoto(0, -PAN_STEP)}><ArrowUpIcon /></Button>
              <Button type="button" variant="ghost" size="icon-lg" className="size-11" aria-label="Move photo down" disabled={controlsDisabled} onClick={() => movePhoto(0, PAN_STEP)}><ArrowDownIcon /></Button>
              <Button type="button" variant="ghost" size="icon-lg" className="size-11" aria-label="Move photo right" disabled={controlsDisabled} onClick={() => movePhoto(PAN_STEP, 0)}><ArrowRightIcon /></Button>
            </div>
            <Button type="button" variant="ghost" size="lg" className="h-11" disabled={controlsDisabled} onClick={resetCrop}>
              <RotateCcwIcon data-icon="inline-start" />Reset crop
            </Button>
          </div>

          <FieldError>{loadError || error}</FieldError>
          {loadError ? (
            <Button type="button" variant="outline" onClick={() => {
              setLoadError(null);
              setDimensions(null);
              setLoadAttempt((attempt) => attempt + 1);
            }}>Retry loading photo</Button>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="h-11" disabled={isApplying} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" className="h-11" disabled={controlsDisabled} onClick={() => void applyCrop()}>
            {isApplying ? <LoaderCircleIcon data-icon="inline-start" className="motion-safe:animate-spin" /> : null}
            {isApplying ? "Applying…" : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
