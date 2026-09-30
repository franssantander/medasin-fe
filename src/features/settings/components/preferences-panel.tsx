"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
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

const themes = [
  { value: "light", label: "Light", description: "Use a bright appearance.", icon: Sun },
  { value: "dark", label: "Dark", description: "Use a low-light appearance.", icon: Moon },
  { value: "system", label: "System", description: "Match your device setting.", icon: Laptop },
] as const;

export function PreferencesPanel() {
  const { theme, setTheme } = useTheme();
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
          Choose how Medasin looks on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="@container min-h-0 p-5 sm:p-6 md:flex-1 md:overflow-y-auto">
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
      </CardContent>
    </Card>
  );
}
