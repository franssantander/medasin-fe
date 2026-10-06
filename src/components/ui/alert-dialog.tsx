"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AlertDialog = AlertDialogPrimitive.Root;

function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/35 backdrop-blur-xs transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn("fixed left-1/2 top-1/2 z-50 grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-2xl border bg-popover p-6 text-popover-foreground shadow-xl outline-none transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none", className)}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader(props: React.ComponentProps<"div">) {
  return <div {...props} className={cn("grid gap-2", props.className)} />;
}

function AlertDialogFooter(props: React.ComponentProps<"div">) {
  return <div {...props} className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", props.className)} />;
}

function AlertDialogTitle(props: AlertDialogPrimitive.Title.Props) {
  return <AlertDialogPrimitive.Title {...props} className={cn("text-lg font-semibold", props.className)} />;
}

function AlertDialogDescription(props: AlertDialogPrimitive.Description.Props) {
  return <AlertDialogPrimitive.Description {...props} className={cn("text-sm leading-relaxed text-muted-foreground", props.className)} />;
}

function AlertDialogCancel(props: AlertDialogPrimitive.Close.Props) {
  return <AlertDialogPrimitive.Close render={<Button variant="outline" />} {...props} />;
}

function AlertDialogAction(props: React.ComponentProps<typeof Button>) {
  return <Button {...props} />;
}

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
};
