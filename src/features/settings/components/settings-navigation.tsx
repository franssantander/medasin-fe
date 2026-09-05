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
    <aside aria-label="Settings navigation">
      <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:block">
        Settings
      </p>
      <nav className="grid grid-cols-2 gap-1 rounded-xl border bg-card p-1 md:grid-cols-1 md:border-0 md:bg-transparent md:p-0">
        {settingsItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center justify-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:justify-start",
                active &&
                  "border bg-background font-semibold text-foreground shadow-xs hover:bg-background",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
