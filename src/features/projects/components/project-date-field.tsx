"use client";

import { format, isValid, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import type { Matcher } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function parseDateKey(value?: string | null) {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

export function ProjectDateField({
  id,
  label,
  value,
  placeholder,
  error,
  disabled,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value?: string;
  placeholder: string;
  error?: string;
  disabled?: boolean;
  min?: Date;
  max?: Date;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDateKey(value);
  const errorId = `${id}-error`;
  const unavailable: Matcher[] = [];
  if (min) unavailable.push({ before: min });
  if (max) unavailable.push({ after: max });

  return (
    <Field data-invalid={Boolean(error)} className="gap-2">
      <FieldLabel id={`${id}-label`} htmlFor={id}>
        {label}
      </FieldLabel>
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                id={id}
                type="button"
                variant="outline"
                disabled={disabled}
                className={cn(
                  "w-full justify-start font-normal",
                  selected ? "pr-9" : "text-muted-foreground",
                )}
                aria-labelledby={`${id}-label ${id}-value`}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
              />
            }
          >
            <CalendarDays data-icon="inline-start" aria-hidden="true" />
            <span id={`${id}-value`} className="truncate">
              {selected ? format(selected, "MMM d, yyyy") : placeholder}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <PopoverTitle className="sr-only">{`Choose ${label.toLowerCase()}`}</PopoverTitle>
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected ?? min ?? max}
              disabled={unavailable}
              onSelect={(date) => {
                onChange(date ? format(date, "yyyy-MM-dd") : "");
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        {selected && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => onChange("")}
          >
            <X />
          </Button>
        )}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
