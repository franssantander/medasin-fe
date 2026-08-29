"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function Accordion({
  className,
  ...props
}: AccordionPrimitive.Root.Props<string>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

function AccordionItem({
  className,
  ...props
}: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

function AccordionHeader({
  className,
  ...props
}: AccordionPrimitive.Header.Props) {
  return (
    <AccordionPrimitive.Header
      data-slot="accordion-header"
      className={cn("m-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Trigger
      data-slot="accordion-trigger"
      className={cn(
        "group/accordion-trigger inline-flex size-8 items-center justify-center rounded-md text-muted-foreground ring-1 ring-transparent transition-[background-color,color,box-shadow] duration-150 outline-none hover:bg-muted/60 hover:text-foreground hover:ring-border/80 focus-visible:ring-3 focus-visible:ring-ring/40 data-open:bg-muted/60 data-open:text-foreground data-open:ring-border/70 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 transition-transform duration-200 group-data-open/accordion-trigger:rotate-180" />
    </AccordionPrimitive.Trigger>
  );
}

function AccordionContent({
  className,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(
        "h-[var(--accordion-panel-height)] overflow-hidden opacity-100 transition-[height,opacity] duration-200 ease-out data-closed:h-0 data-closed:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
};
