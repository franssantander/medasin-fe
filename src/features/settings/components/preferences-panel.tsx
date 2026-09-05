"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose how Medasin looks on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {themes.map((option) => {
          const Icon = option.icon;
          const active = mounted && theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              className={cn(
                "relative grid min-h-36 gap-3 rounded-xl border bg-background p-4 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active && "border-foreground ring-1 ring-foreground",
              )}
              onClick={() => setTheme(option.value)}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
              {active && <Check className="absolute right-3 top-3 size-4" />}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
