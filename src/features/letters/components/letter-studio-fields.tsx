"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InspectorSection({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-b">
      <AccordionHeader>
        <AccordionTrigger className="h-12 w-full justify-between rounded-none px-5 text-sm font-medium text-foreground ring-0 hover:bg-muted/40 hover:ring-0 data-open:bg-transparent data-open:ring-0">
          {title}
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent>
        <div className="flex flex-col gap-5 px-5 pt-1 pb-6">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function InspectorSlider({
  id,
  label,
  icon,
  percent,
  valueLabel,
  min,
  max,
  step,
  valueText,
  onChange,
  className,
}: {
  id: string;
  label: string;
  icon?: ReactNode;
  percent: number;
  valueLabel?: string;
  min: number;
  max: number;
  step: number;
  valueText?: string;
  onChange: (percent: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </label>
        <output
          htmlFor={id}
          className="text-xs tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {valueLabel ?? `${percent}%`}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={percent}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-8 w-full cursor-pointer accent-foreground"
        aria-label={label}
        aria-valuetext={valueText ?? `${percent}%`}
      />
    </div>
  );
}

export function ResetButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="self-start text-muted-foreground"
      disabled={disabled}
      onClick={onClick}
    >
      <RotateCcw data-icon="inline-start" />
      {children}
    </Button>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}
