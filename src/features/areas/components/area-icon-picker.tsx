"use client";

import { ChevronsUpDown, Search, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AREA_ICONS, AreaIcon } from "./area-icons";

const RESULT_LIMIT = 120;

const SUGGESTED_ICON_NAMES = [
  "Heart",
  "Briefcase",
  "Wallet",
  "Dumbbell",
  "Brain",
  "Sprout",
  "BookOpen",
  "House",
  "Users",
  "Plane",
  "Palette",
  "Music",
  "Sparkles",
  "Leaf",
  "Target",
  "GraduationCap",
  "Baby",
  "PawPrint",
  "Utensils",
  "Bike",
  "Mountain",
  "Sun",
  "HandHeart",
  "Church",
];

function resolveIcons(names: readonly string[]) {
  return names.flatMap(
    (name) => AREA_ICONS.find((icon) => icon.name === name) ?? [],
  );
}

const SUGGESTED_ICONS = resolveIcons(SUGGESTED_ICON_NAMES);

export function AreaIconPicker({
  id,
  value,
  invalid,
  suggested,
  fallback = "Leaf",
  onChange,
}: {
  id?: string;
  value?: string | null;
  invalid?: boolean;
  suggested?: readonly string[];
  fallback?: string;
  onChange: (name: string) => void;
}) {
  const suggestedIcons = useMemo(
    () => (suggested ? resolveIcons(suggested) : SUGGESTED_ICONS),
    [suggested],
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const matches = useMemo(
    () =>
      term
        ? AREA_ICONS.filter(({ name }) => name.toLowerCase().includes(term))
        : AREA_ICONS,
    [term],
  );
  const results = matches.slice(0, RESULT_LIMIT);

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className="w-full justify-start font-normal"
          />
        }
      >
        <AreaIcon name={value || fallback} />
        <span className="truncate">{value || fallback}</span>
        <ChevronsUpDown className="ml-auto text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-0 p-0">
        <PopoverTitle className="sr-only">Choose an icon</PopoverTitle>
        <div className="border-b p-2">
          <InputGroup>
            <InputGroupInput
              type="search"
              aria-label="Search icons"
              placeholder={`Search ${AREA_ICONS.length.toLocaleString()} icons…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="[&::-webkit-search-cancel-button]:hidden"
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            {search && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear icon search"
                  onClick={() => setSearch("")}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        <div className="grid max-h-72 gap-3 overflow-y-auto overscroll-contain p-2">
          {!term && (
            <IconSection label="Suggested">
              {suggestedIcons.map(({ name, icon: Icon }) => (
                <IconOption
                  key={name}
                  name={name}
                  selected={value === name}
                  onSelect={select}
                >
                  <Icon />
                </IconOption>
              ))}
            </IconSection>
          )}

          {results.length > 0 ? (
            <IconSection label={term ? "Results" : "All icons"}>
              {results.map(({ name, icon: Icon }) => (
                <IconOption
                  key={name}
                  name={name}
                  selected={value === name}
                  onSelect={select}
                >
                  <Icon />
                </IconOption>
              ))}
            </IconSection>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No icons match &ldquo;{search.trim()}&rdquo;.
            </p>
          )}

          {matches.length > RESULT_LIMIT && (
            <p className="px-1 pb-1 text-center text-xs text-muted-foreground">
              Showing {RESULT_LIMIT} of {matches.length.toLocaleString()}. Keep
              typing to narrow it down.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function IconSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="px-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-8 gap-1">{children}</div>
    </div>
  );
}

function IconOption({
  name,
  selected,
  onSelect,
  children,
}: {
  name: string;
  selected: boolean;
  onSelect: (name: string) => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={name}
      aria-label={`Use ${name} icon`}
      aria-pressed={selected}
      className={cn(
        "text-muted-foreground",
        selected && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
      )}
      onClick={() => onSelect(name)}
    >
      {children}
    </Button>
  );
}
