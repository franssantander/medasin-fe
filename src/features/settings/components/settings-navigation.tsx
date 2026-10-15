"use client";

import { ChartNoAxesCombined, SlidersHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsItems = [
  {
    href: "/settings/preferences",
    label: "Preferences",
    description: "Theme and font",
    icon: SlidersHorizontal,
  },
  {
    href: "/settings/plan",
    label: "Plan & usage",
    description: "Your plan and limits",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/settings/trash",
    label: "Trash",
    description: "Restore deleted items",
    icon: Trash2,
  },
];

export function SettingsNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="grid w-full grid-cols-1 gap-1 min-[380px]:grid-cols-3 md:grid-cols-1"
      aria-label="Settings navigation"
    >
      {settingsItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        const descriptionId = `settings-nav-${item.href.split("/").pop()}-description`;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-describedby={descriptionId}
            className={cn(
              "group/nav flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:justify-start md:gap-3 md:py-2",
              active && "bg-muted text-foreground hover:bg-muted",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex shrink-0 items-center justify-center max-sm:min-[380px]:hidden md:size-8 md:rounded-md md:border md:border-transparent md:transition-colors",
                active && "md:border-border md:bg-background md:text-foreground md:shadow-xs",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className={cn("truncate", active && "font-semibold")}>{item.label}</span>
              <span
                id={descriptionId}
                className="hidden truncate text-xs font-normal text-muted-foreground md:block"
              >
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
