"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { resourceFieldIds } from "./resource-dialog-layout";
import { RESOURCE_BADGE_COLORS, RESOURCE_ICONS, ResourceIcon, resourceBadgeStyle } from "./resource-icons";

const ICON_PAGE_SIZE = 40;

export function ResourceAppearanceField({ title, icon, background, disabled = false, error, onIconChange, onBackgroundChange }: {
  title: string;
  icon: string;
  background: string;
  disabled?: boolean;
  error?: string;
  onIconChange: (value: string) => void;
  onBackgroundChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [iconPage, setIconPage] = useState(0);
  const iconGridRef = useRef<HTMLDivElement>(null);
  const [lastValidColor, setLastValidColor] = useState(/^#[0-9a-f]{6}$/i.test(background) ? background : "#000000");
  const open = expanded || Boolean(error);
  const icons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? RESOURCE_ICONS.filter((item) => item.name.toLowerCase().includes(query)) : RESOURCE_ICONS;
  }, [search]);
  const pageStart = iconPage * ICON_PAGE_SIZE;
  const visibleIcons = icons.slice(pageStart, pageStart + ICON_PAGE_SIZE);
  const previewColor = /^#[0-9a-f]{6}$/i.test(background) ? background : lastValidColor;

  function changeBackground(value: string) {
    setExpanded(true);
    if (/^#[0-9a-f]{6}$/i.test(value)) setLastValidColor(value);
    onBackgroundChange(value);
  }

  function changeIconPage(page: number) {
    setIconPage(page);
    iconGridRef.current?.scrollTo({ top: 0 });
  }

  return (
    <Accordion multiple value={open ? ["appearance"] : []} onValueChange={(value) => setExpanded(value.includes("appearance"))}>
      <AccordionItem value="appearance" className="overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center gap-3 p-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg" aria-label={`${title.trim() || "Untitled resource"} appearance`} style={resourceBadgeStyle(previewColor)}><ResourceIcon name={icon} className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Appearance</p>
            <p className="text-xs text-muted-foreground">Icon and color</p>
          </div>
          <AccordionHeader>
            <AccordionTrigger disabled={disabled} aria-label="Customize resource appearance" className="h-11 w-auto shrink-0 px-2">Edit</AccordionTrigger>
          </AccordionHeader>
        </div>
        <AccordionContent>
          {open ? (
            <div className="grid gap-5 border-t p-3">
              <Field data-invalid={Boolean(error)}>
                <FieldLabel>Badge color</FieldLabel>
                <div role="group" aria-label="Badge color presets" className="grid grid-cols-[repeat(auto-fill,2.75rem)] gap-1.5">
                  {[{ name: "Black", value: "#000000" }, ...RESOURCE_BADGE_COLORS].map((color) => (
                    <button key={color.value} type="button" disabled={disabled} aria-label={`Use ${color.name} badge color`} aria-pressed={background.toLowerCase() === color.value.toLowerCase()} className="flex size-11 items-center justify-center rounded-lg outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none" onClick={() => changeBackground(color.value)}>
                      <span className="flex size-7 items-center justify-center rounded-full ring-1 ring-foreground/10" style={resourceBadgeStyle(color.value)}>
                        {background.toLowerCase() === color.value.toLowerCase() ? <Check className="size-4" aria-hidden="true" /> : null}
                      </span>
                    </button>
                  ))}
                </div>
                <FieldLabel htmlFor={resourceFieldIds.appearance} className="text-xs text-muted-foreground">Custom hex color</FieldLabel>
                <Input id={resourceFieldIds.appearance} value={background} maxLength={7} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? "resource-color-error" : undefined} className="h-11 font-mono uppercase" onChange={(event) => changeBackground(event.target.value)} />
                {error ? <FieldError id="resource-color-error">{error}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="resource-icon-search">Icon</FieldLabel>
                <InputGroup className="h-11">
                  <InputGroupInput id="resource-icon-search" value={search} disabled={disabled} placeholder="Search icons…" onChange={(event) => { setSearch(event.target.value); changeIconPage(0); }} />
                  <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                </InputGroup>
                <div ref={iconGridRef} role="group" aria-label="Resource icons" className="grid max-h-52 grid-cols-[repeat(auto-fill,2.75rem)] gap-1 overflow-y-auto overscroll-contain rounded-lg border p-1">
                  {visibleIcons.map(({ name, icon: Icon }) => (
                    <button key={name} type="button" disabled={disabled} title={name.replace(/([a-z])([A-Z])/g, "$1 $2")} aria-label={`Use ${name} icon`} aria-pressed={icon === name} className="flex size-11 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground disabled:pointer-events-none disabled:opacity-50" onClick={() => { setExpanded(true); onIconChange(name); }}><Icon className="size-4" aria-hidden="true" /></button>
                  ))}
                  {!icons.length ? <p className="col-span-full p-3 text-center text-xs text-muted-foreground">No matching icons. Try another search.</p> : null}
                </div>
                {icons.length > ICON_PAGE_SIZE ? (
                  <div role="group" className="flex items-center justify-between gap-2" aria-label="Icon pages">
                    <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
                      {pageStart + 1}–{Math.min(pageStart + ICON_PAGE_SIZE, icons.length)} of {icons.length.toLocaleString()}
                    </p>
                    <div className="flex gap-1">
                      <Button type="button" variant="outline" size="icon" className="size-11" disabled={disabled || iconPage === 0} aria-label="Previous icon page" onClick={() => changeIconPage(iconPage - 1)}><ChevronLeft aria-hidden="true" /></Button>
                      <Button type="button" variant="outline" size="icon" className="size-11" disabled={disabled || pageStart + ICON_PAGE_SIZE >= icons.length} aria-label="Next icon page" onClick={() => changeIconPage(iconPage + 1)}><ChevronRight aria-hidden="true" /></Button>
                    </div>
                  </div>
                ) : null}
                <FieldDescription>{icon.replace(/([a-z])([A-Z])/g, "$1 $2")} selected</FieldDescription>
              </Field>
            </div>
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
