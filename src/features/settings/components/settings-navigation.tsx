"use client";

import { SlidersHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsItems = [
  {
    href: "/settings/preferences",
    label: "Preferences",
    icon: SlidersHorizontal,
  },
  { href: "/settings/trash", label: "Trash", icon: Trash2 },
];

export function SettingsNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="grid w-full grid-cols-2 gap-1 md:grid-cols-1"
      aria-label="Settings navigation"
    >
      {settingsItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center justify-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:justify-start",
              active &&
                "bg-muted font-semibold text-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
