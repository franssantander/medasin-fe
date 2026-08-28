"use client";

import Image from "next/image";
import Link from "next/link";
import { PanelLeft, PanelRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  dashboardHomeItem,
  dashboardNavigationGroups,
  dashboardNavigationItems,
  isActiveDashboardRoute,
} from "./dashboard-navigation";

type DashboardSidebarProps = {
  pathname: string;
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

function Brand() {
  return (
    <Link
      href="/home"
      aria-label="Medasin home"
      className="flex h-10 min-w-0 items-center gap-1 overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <Image
        src="/images/medasin-logo.svg"
        alt=""
        width={34}
        height={34}
        className="size-8 shrink-0"
        priority
      />
      <span className="truncate text-xl font-garamond font-semibold">
        Medasin
      </span>
    </Link>
  );
}

function DashboardNavigation({
  pathname,
  collapsed = false,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const renderNavigationItem = (
    item: (typeof dashboardNavigationItems)[number],
  ) => {
    const active = isActiveDashboardRoute(pathname, item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "group relative w-full justify-start gap-2.5 overflow-hidden rounded-lg px-2.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active &&
            "bg-background font-bold text-sidebar-accent-foreground border border-neutral hover:bg-background",
          collapsed && "justify-center self-center px-0",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />

        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <nav aria-label="Dashboard navigation" className="flex flex-col">
      {renderNavigationItem(dashboardHomeItem)}

      {dashboardNavigationGroups.map((group) => (
        <div key={group.label} className="mt-4 flex flex-col gap-1.5 pt-3">
          {!collapsed && (
            <p className="px-2.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.label}
            </p>
          )}
          {group.items.map(renderNavigationItem)}
        </div>
      ))}
    </nav>
  );
}

export function DashboardSidebar({
  pathname,
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileOpenChange,
}: DashboardSidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          isCollapsed ? "w-16" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center gap-2 px-3 border-b",
            isCollapsed && "justify-center",
          )}
        >
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <Brand />
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeft /> : <PanelRight />}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <DashboardNavigation pathname={pathname} collapsed={isCollapsed} />
        </div>
      </aside>

      <Sheet open={isMobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 gap-0 p-0" showCloseButton>
          <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate between dashboard sections.
          </SheetDescription>
          <div className="flex h-14 items-center border-b border-sidebar-border px-4">
            <Brand />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <DashboardNavigation
              pathname={pathname}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
