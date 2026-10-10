"use client";

import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  PROJECT_BADGE_COLORS,
  PROJECT_ICONS,
  ProjectIcon,
  projectBadgeStyle,
} from "./project-icons";

export type ProjectAppearanceTab = "icon" | "color";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const BADGE_PRESETS = [
  { name: "Black", value: "#000000" },
  ...PROJECT_BADGE_COLORS,
];

export function isHexColor(value?: string | null): value is string {
  return Boolean(value && HEX_COLOR.test(value));
}

export function formatIconName(name: string) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export function ProjectAppearanceField({
  icon,
  background,
  error,
  disabled,
  tab,
  onTabChange,
  onIconChange,
  onBackgroundChange,
}: {
  icon: string;
  background: string;
  error?: string;
  disabled?: boolean;
  tab: ProjectAppearanceTab;
  onTabChange: (tab: ProjectAppearanceTab) => void;
  onIconChange: (icon: string) => void;
  onBackgroundChange: (background: string) => void;
}) {
  const [search, setSearch] = useState("");
  const icons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? PROJECT_ICONS.filter(({ name }) => name.toLowerCase().includes(query))
      : PROJECT_ICONS;
  }, [search]);
  const previewColor = isHexColor(background) ? background : "#000000";

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as ProjectAppearanceTab)}
      className="gap-2"
    >
      <div className="flex items-center justify-between gap-3">
        <FieldTitle>Appearance</FieldTitle>
        <TabsList className="h-8">
          <TabsTrigger value="icon" className="px-3 text-xs">
            Icon
          </TabsTrigger>
          <TabsTrigger value="color" className="px-3 text-xs">
            Color
            {error && (
              <>
                <span
                  className="size-1.5 rounded-full bg-destructive"
                  aria-hidden="true"
                />
                <span className="sr-only">(needs attention)</span>
              </>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <TabsContent value="icon" className="grid gap-3 p-3">
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search icons"
              value={search}
              disabled={disabled}
              placeholder={`Search ${PROJECT_ICONS.length.toLocaleString()} icons…`}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
          <div
            role="group"
            aria-label="Project icons"
            className="workspace-list-scrollbar grid max-h-44 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1 overflow-y-auto overscroll-contain"
          >
            {icons.map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                title={formatIconName(name)}
                aria-label={`Use ${name} icon`}
                aria-pressed={icon === name}
                disabled={disabled}
                className="flex h-10 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-primary aria-pressed:text-primary-foreground motion-reduce:transition-none"
                onClick={() => onIconChange(name)}
              >
                <Icon className="size-4" aria-hidden="true" />
              </button>
            ))}
          </div>
          {icons.length === 0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">
              No icons match “{search.trim()}”.
            </p>
          )}
          <p
            aria-live="polite"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <ProjectIcon name={icon} className="size-3.5" />
            {formatIconName(icon)} selected
          </p>
        </TabsContent>

        <TabsContent value="color" className="grid gap-4 p-3">
          <div
            role="group"
            aria-label="Badge color presets"
            className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5"
          >
            {BADGE_PRESETS.map((color) => {
              const selected =
                background.toLowerCase() === color.value.toLowerCase();

              return (
                <button
                  key={color.value}
                  type="button"
                  title={color.name}
                  aria-label={`Use ${color.name} (${color.value})`}
                  aria-pressed={selected}
                  disabled={disabled}
                  className="flex h-9 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => onBackgroundChange(color.value)}
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full ring-1 ring-foreground/10 transition-transform hover:scale-110 motion-reduce:transition-none",
                      selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                    style={projectBadgeStyle(color.value)}
                  >
                    {selected && (
                      <Check
                        className="size-3.5"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-1.5">
            <FieldLabel
              htmlFor="project-badge-color"
              className="text-xs text-muted-foreground"
            >
              Custom hex color
            </FieldLabel>
            <div className="flex gap-2">
              <label
                className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs focus-within:ring-3 focus-within:ring-ring/50"
                style={{ backgroundColor: previewColor }}
              >
                <span className="sr-only">Pick a custom color</span>
                <input
                  type="color"
                  value={previewColor.toLowerCase()}
                  disabled={disabled}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  onChange={(event) =>
                    onBackgroundChange(event.target.value.toUpperCase())
                  }
                />
              </label>
              <Input
                id="project-badge-color"
                value={background}
                maxLength={7}
                placeholder="#000000"
                spellCheck={false}
                disabled={disabled}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "project-badge-color-error" : undefined}
                className="font-mono uppercase"
                onChange={(event) => onBackgroundChange(event.target.value)}
              />
            </div>
          </div>
        </TabsContent>
      </div>
      {error && (
        <FieldError id="project-badge-color-error">{error}</FieldError>
      )}
    </Tabs>
  );
}
