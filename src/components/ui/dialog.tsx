"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogPortal(props: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={cn("fixed inset-0 z-50 bg-black/35 backdrop-blur-xs transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0", className)} {...props} />;
}

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup data-slot="dialog-content" className={cn("fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,48rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-2xl border bg-popover p-6 text-popover-foreground shadow-xl transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0", className)} {...props}>
        {children}
        <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" className="absolute right-4 top-4" />}>
          <XIcon /><span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5 pr-8", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle };
