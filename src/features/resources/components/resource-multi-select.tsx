"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";

export type ResourceSelectOption = { value: string; label: string; create?: boolean };

export function ResourceMultiSelect({ id, label, options, value, disabled, placeholder, search, error, onSearchChange, onValueChange }: {
  id: string;
  label: string;
  options: ResourceSelectOption[];
  value: string[];
  disabled?: boolean;
  placeholder: string;
  search?: string;
  error?: string;
  onSearchChange?: (value: string) => void;
  onValueChange: (value: string[]) => void;
}) {
  const [internalSearch, setInternalSearch] = useState("");
  const query = search ?? internalSearch;
  const changeSearch = onSearchChange ?? setInternalSearch;
  const labels = new Map(options.map((item) => [item.value, item]));
  const filteredItems = options.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())).map((item) => item.value);
  return (
    <div className="grid min-w-0 gap-2">
      <Combobox multiple autoHighlight items={options.map((item) => item.value)} filteredItems={filteredItems} value={value} disabled={disabled} inputValue={query} onInputValueChange={(next, details) => {
        // Closing suggestions must not discard a tag that has not been added.
        if (onSearchChange && details.reason === "input-clear") { details.cancel(); return; }
        changeSearch(next);
      }} itemToStringLabel={(item) => labels.get(item)?.label ?? item} onValueChange={(next) => { onValueChange(next); changeSearch(""); }}>
        <ComboboxInput id={id} aria-label={label} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} disabled={disabled} placeholder={placeholder} className="w-full" />
        <ComboboxContent>
          <ComboboxEmpty className="px-3 py-4">No matches found.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item} aria-label={labels.get(item)?.create ? `Create “${labels.get(item)?.label}”` : labels.get(item)?.label} className="break-words">
                {labels.get(item)?.create ? `Create “${labels.get(item)?.label}”` : labels.get(item)?.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {value.length ? (
        <div className="flex min-w-0 flex-wrap gap-1.5" aria-label={`Selected ${label.toLowerCase()}`}>
          {value.map((item) => (
            <span key={item} className="inline-flex min-h-7 max-w-full items-center gap-0.5 rounded-md border bg-background pl-2 pr-0.5 text-xs font-medium shadow-xs">
              <span className="min-w-0 break-words py-1">{labels.get(item)?.label}</span>
              <Button type="button" variant="ghost" size="icon-xs" className="shrink-0 text-muted-foreground hover:text-foreground" disabled={disabled} aria-label={`Remove ${labels.get(item)?.label}`} onClick={() => onValueChange(value.filter((selected) => selected !== item))}><X aria-hidden="true" /></Button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
