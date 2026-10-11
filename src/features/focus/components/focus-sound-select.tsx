"use client";

import { Volume2 } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ambientOptions } from "../lib/focus-utils";
import type { AmbientSound } from "../type";

export function FocusSoundSelect({ value, disabled, onChange, className }: {
  value: AmbientSound;
  disabled: boolean;
  onChange: (sound: AmbientSound) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Volume2 className="size-4 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="focus-ambient" className="text-sm text-muted-foreground">Sound</label>
      <Select
        items={ambientOptions}
        value={value}
        onValueChange={(next) => next && onChange(next as AmbientSound)}
        disabled={disabled}
      >
        <SelectTrigger id="focus-ambient" size="sm" className="min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {ambientOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
