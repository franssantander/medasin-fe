"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  XIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  CircleXIcon,
  Loader2Icon,
  BellRingIcon,
  CalendarClockIcon,
} from "lucide-react";

export type PlanReminderToastData = {
  variant: "plan-reminder";
  schedule?: string;
};

function isPlanReminderToastData(data: unknown): data is PlanReminderToastData {
  return (
    typeof data === "object" &&
    data !== null &&
    "variant" in data &&
    data.variant === "plan-reminder" &&
    (!("schedule" in data) ||
      data.schedule === undefined ||
      typeof data.schedule === "string")
  );
}

const toast = ToastPrimitive.createToastManager();

/** Matches Base UI's provider default; the countdown bar needs the same value. */
const DEFAULT_TOAST_TIMEOUT = 5000;

// One tone per toast type, shared by the icon tile and the countdown bar.
const toastTones: Record<string, { icon: React.ComponentType<{ className?: string }>; tile: string; bar: string }> = {
  success: { icon: CircleCheckIcon, tile: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400", bar: "bg-emerald-500 dark:bg-emerald-400" },
  error: { icon: CircleXIcon, tile: "bg-destructive/10 text-destructive", bar: "bg-destructive" },
  warning: { icon: TriangleAlertIcon, tile: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400", bar: "bg-amber-500 dark:bg-amber-400" },
  info: { icon: InfoIcon, tile: "bg-muted text-foreground", bar: "bg-foreground/30" },
  reminder: { icon: BellRingIcon, tile: "bg-muted text-foreground", bar: "bg-foreground/30" },
  loading: { icon: Loader2Icon, tile: "bg-muted text-muted-foreground", bar: "" },
};

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "pointer-events-none fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-50 mx-auto w-auto max-w-sm outline-none sm:left-auto sm:mx-0 sm:w-full",
        className,
      )}
      {...props}
    />
  );
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-xl bg-popover/95 text-popover-foreground shadow-[0_12px_32px_-12px_rgb(0_0_0/0.28),0_2px_6px_-2px_rgb(0_0_0/0.08)] ring-1 ring-foreground/10 backdrop-blur-sm will-change-transform outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7)]",
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "relative flex h-full items-center gap-3 overflow-hidden rounded-xl p-3.5 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-xs" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        // Mouse users see it on hover or focus; touch screens always show it.
        "relative shrink-0 text-muted-foreground transition-opacity after:absolute after:-inset-2 after:content-[''] hover:text-foreground focus-visible:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover/toast:opacity-100 pointer-fine:group-focus-within/toast:opacity-100",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

function ToastIcon({ type }: { type: string | undefined }) {
  const tone = type ? toastTones[type] : undefined;
  if (!tone) return null;
  const Icon = tone.icon;

  return (
    <span
      data-slot="toast-icon"
      className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone.tile)}
      aria-hidden="true"
    >
      <Icon className={cn("size-4", type === "loading" && "animate-spin motion-reduce:animate-none")} />
    </span>
  );
}

/** Shrinks over the toast's lifetime and pauses with Base UI's timers while the stack is expanded. */
function ToastCountdown({ type, timeout }: { type: string | undefined; timeout: number }) {
  const bar = type ? toastTones[type]?.bar : "bg-foreground/30";
  if (!bar || timeout <= 0 || type === "loading") return null;

  return (
    <span
      data-slot="toast-countdown"
      aria-hidden="true"
      style={{ animationDuration: `${timeout}ms` }}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left animate-toast-countdown opacity-70 group-data-expanded/toast:[animation-play-state:paused] motion-reduce:hidden",
        bar,
      )}
    />
  );
}

function ToastList({ defaultTimeout }: { defaultTimeout: number }) {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => {
    const timeout = toastItem.timeout ?? defaultTimeout;

    return isPlanReminderToastData(toastItem.data) ? (
      <Toast key={toastItem.id} toast={toastItem} data-variant="plan-reminder">
        <ToastContent className="items-start">
          <ToastIcon type="reminder" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ToastTitle className="text-xs font-medium text-muted-foreground" />
            <ToastDescription className="line-clamp-2 font-medium wrap-anywhere text-foreground" />
            {toastItem.data.schedule && (
              <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <CalendarClockIcon
                  className="mt-[0.2rem] size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span data-slot="toast-schedule" className="min-w-0 wrap-anywhere">
                  {toastItem.data.schedule}
                </span>
              </p>
            )}
            <ToastAction
              render={<Button size="sm" />}
              className="mt-3 min-h-11 w-fit sm:min-h-8"
            />
          </div>
          <ToastClose className="-mt-0.5 -mr-0.5 min-h-11 min-w-11 sm:min-h-6 sm:min-w-6" />
          <ToastCountdown type="reminder" timeout={timeout} />
        </ToastContent>
      </Toast>
    ) : (
      <Toast key={toastItem.id} toast={toastItem}>
        <ToastContent className={toastItem.title ? "items-start" : undefined}>
          <ToastIcon type={toastItem.type} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ToastTitle className="leading-5" />
            {/* Most toasts are a single message, so it reads as the headline. */}
            <ToastDescription
              className={cn("leading-5 wrap-anywhere", !toastItem.title && "font-medium text-foreground")}
            />
            <ToastAction className="mt-2 w-fit" />
          </div>
          <ToastClose className={cn("-mr-0.5", toastItem.title && "-mt-0.5")} />
          <ToastCountdown type={toastItem.type} timeout={timeout} />
        </ToastContent>
      </Toast>
    );
  });
}

function Toaster({
  children,
  toastManager = toast,
  timeout = DEFAULT_TOAST_TIMEOUT,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} timeout={timeout} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList defaultTimeout={timeout} />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
};
