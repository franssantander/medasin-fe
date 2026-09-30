"use client";

import { Check, Laptop, LoaderCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { fontFamilies, resolveFontFamily } from "../font-families";
import { useFontPreference } from "../hooks/use-font-preference";

const themes = [
  { value: "light", label: "Light", description: "Use a bright appearance.", icon: Sun },
  { value: "dark", label: "Dark", description: "Use a low-light appearance.", icon: Moon },
  { value: "system", label: "System", description: "Match your device setting.", icon: Laptop },
] as const;

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
      <CardHeader className="shrink-0 border-b p-5 sm:p-6">
        <CardTitle>
          <h2>Appearance</h2>
        </CardTitle>
        <CardDescription>
          Personalize your theme and text style.
        </CardDescription>
      </CardHeader>
      <CardContent className="@container min-h-0 p-5 sm:p-6 md:flex-1 md:overflow-y-auto">
        <FieldGroup>
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
                      className="relative h-auto min-h-36 w-full flex-col items-start justify-start gap-3 whitespace-normal p-4 text-left"
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <Icon aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-semibold">{option.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                      {active && (
                        <Check className="absolute right-4 top-4" aria-hidden="true" />
                      )}
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
                className="grid w-full grid-cols-1 gap-3 @min-[36rem]:grid-cols-3"
                onValueChange={(values) => {
                  if (values[0]) selectFont(resolveFontFamily(values[0]));
                }}
              >
                {fontFamilies.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                    className="relative h-auto min-h-40 min-w-0 w-full flex-col items-start justify-start gap-3 whitespace-normal p-4 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className="text-3xl leading-none"
                      style={{ fontFamily: option.family }}
                    >
                      Aa
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{option.label}</span>
                      {option.value === "manrope" && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </span>
                    <span
                      className="text-sm text-muted-foreground"
                      style={{ fontFamily: option.family }}
                    >
                      Plan your day with clarity.
                    </span>
                    {fontFamily === option.value && (
                      <Check className="absolute right-4 top-4" aria-hidden="true" />
                    )}
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
                ) : isSaved ? "Saved to your account." : null}
              </div>
            </Field>
          </FieldSet>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
