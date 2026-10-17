"use client";

import { Check, Laptop, LoaderCircle, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore, type CSSProperties } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { fontFamilies, resolveFontFamily } from "../font-families";
import { useFontPreference } from "../hooks/use-font-preference";
import { SettingsPanelHeader } from "./settings-panel-header";

const themes = [
  { value: "light", label: "Light", description: "Use a bright appearance.", icon: Sun },
  { value: "dark", label: "Dark", description: "Use a low-light appearance.", icon: Moon },
  { value: "system", label: "System", description: "Match your device setting.", icon: Laptop },
] as const;

// Previews use fixed colors so each tile shows its theme regardless of the active one.
const previewPalettes = {
  light: { bg: "#f4f4f5", panel: "#ffffff", line: "#e4e4e7", text: "#d4d4d8", accent: "#18181b" },
  dark: { bg: "#09090b", panel: "#18181b", line: "#27272a", text: "#3f3f46", accent: "#fafafa" },
};

const optionTileClassName =
  "group/option relative h-auto w-full min-w-0 flex-col items-stretch justify-start gap-3 whitespace-normal p-3 text-left aria-pressed:border-primary aria-pressed:bg-muted/40 aria-pressed:ring-1 aria-pressed:ring-primary";

function ThemeMock({ palette, style }: { palette: keyof typeof previewPalettes; style?: CSSProperties }) {
  const colors = previewPalettes[palette];
  return (
    <div className="absolute inset-0 flex gap-1.5 p-2" style={{ background: colors.bg, ...style }}>
      <div className="flex w-1/4 flex-col gap-1 rounded-sm p-1.5" style={{ background: colors.panel }}>
        <span className="h-1.5 w-3/4 rounded-full" style={{ background: colors.accent }} />
        <span className="h-1 w-full rounded-full" style={{ background: colors.text }} />
        <span className="h-1 w-2/3 rounded-full" style={{ background: colors.text }} />
        <span className="h-1 w-5/6 rounded-full" style={{ background: colors.text }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 rounded-sm p-2" style={{ background: colors.panel }}>
        <span className="h-1.5 w-1/2 rounded-full" style={{ background: colors.accent }} />
        <span className="h-1 w-full rounded-full" style={{ background: colors.text }} />
        <span className="h-1 w-3/4 rounded-full" style={{ background: colors.text }} />
        <span className="mt-auto flex gap-1">
          <span className="h-3 w-8 rounded-sm" style={{ background: colors.accent }} />
          <span className="h-3 w-6 rounded-sm border" style={{ borderColor: colors.line }} />
        </span>
      </div>
    </div>
  );
}

function ThemePreview({ value }: { value: (typeof themes)[number]["value"] }) {
  return (
    <span aria-hidden="true" className="relative block h-20 w-full overflow-hidden rounded-md ring-1 ring-foreground/10">
      {value === "system" ? (
        <>
          <ThemeMock palette="light" />
          <ThemeMock palette="dark" style={{ clipPath: "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)" }} />
        </>
      ) : (
        <ThemeMock palette={value} />
      )}
    </span>
  );
}

function SelectionIndicator({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
      )}
    >
      {active && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

export function PreferencesPanel() {
  const { theme, setTheme } = useTheme();
  const { fontFamily, selectFont, isPending, isSaved, error } = useFontPreference();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  return (
    <Card className="min-h-0 gap-0 py-0 md:flex-1">
      <SettingsPanelHeader
        icon={Palette}
        title="Appearance"
        description="Personalize your theme and text style."
      />
      <CardContent className="@container min-h-0 p-5 sm:p-6 md:flex-1 md:overflow-y-auto">
        <FieldGroup className="max-w-4xl">
          <FieldSet>
            <FieldLegend>Theme</FieldLegend>
            <FieldDescription>Choose how Medasin looks on this device.</FieldDescription>
            <Field>
              <ToggleGroup
                aria-label="Appearance theme"
                variant="outline"
                value={mounted && theme ? [theme] : []}
                className="grid w-full grid-cols-1 gap-3 @min-[36rem]:grid-cols-3"
                onValueChange={(values) => {
                  const nextTheme = values[0];
                  if (nextTheme) setTheme(nextTheme);
                }}
              >
                {themes.map((option) => {
                  const Icon = option.icon;
                  const active = mounted && theme === option.value;

                  return (
                    <ToggleGroupItem
                      key={option.value}
                      value={option.value}
                      className={optionTileClassName}
                    >
                      <span className="flex items-start gap-2.5 px-0.5">
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{option.label}</span>
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                        <Icon aria-hidden="true" className="mt-0.5 text-muted-foreground" />
                        <SelectionIndicator active={active} />
                      </span>
                      <ThemePreview value={option.value} />
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </Field>
          </FieldSet>
          <Separator />
          <FieldSet>
            <FieldLegend>Font</FieldLegend>
            <FieldDescription>
              Applies throughout Medasin and is saved to your account.
            </FieldDescription>
            <Field data-disabled={isPending} data-invalid={!!error}>
              <ToggleGroup
                aria-label="App font"
                aria-describedby="app-font-status"
                aria-busy={isPending}
                aria-invalid={!!error}
                variant="outline"
                value={[fontFamily]}
                disabled={isPending}
                className="grid w-full grid-cols-1 gap-3 @min-[36rem]:grid-cols-2 @min-[56rem]:grid-cols-4"
                onValueChange={(values) => {
                  if (values[0]) selectFont(resolveFontFamily(values[0]));
                }}
              >
                {fontFamilies.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                    className={optionTileClassName}
                  >
                    <span className="flex items-center gap-2 px-0.5">
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span className="font-semibold">{option.label}</span>
                        {option.value === "geist" && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </span>
                      <SelectionIndicator active={fontFamily === option.value} />
                    </span>
                    <span
                      className="flex h-20 flex-col justify-end gap-1 rounded-md bg-muted/60 p-3 ring-1 ring-foreground/5"
                      style={{ fontFamily: option.family }}
                    >
                      <span aria-hidden="true" className="text-3xl leading-none font-medium">
                        Aa
                      </span>
                      <span className="truncate text-sm font-normal text-muted-foreground">
                        Plan your day with clarity.
                      </span>
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div
                id="app-font-status"
                className="flex min-h-5 items-center gap-2 text-sm text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Saving font…
                  </>
                ) : error ? (
                  <FieldError>
                    {error.message} Your previous font was restored. Please try again.
                  </FieldError>
                ) : isSaved ? (
                  <>
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Saved to your account.
                  </>
                ) : null}
              </div>
            </Field>
          </FieldSet>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
