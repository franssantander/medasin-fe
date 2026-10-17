"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, Settings, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  homeNavigationItem,
  appNavigationGroups,
  isActiveAppRoute,
  type AppNavigationItem,
} from "./app-navigation";

const desktopMediaQuery = "(min-width: 768px)";
const settingsNavigationItem: AppNavigationItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};

type AppSidebarProps = {
  pathname: string;
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/home"
      onClick={onNavigate}
      aria-label="Medasin home"
      className="flex h-9 min-w-0 items-center gap-2 overflow-hidden rounded-md px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <Image
        src="/images/medasin-logo.svg"
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0"
        loading="eager"
      />
      <span className="truncate font-garamond text-lg font-semibold tracking-tight">
        Medasin
      </span>
    </Link>
  );
}

function AppNavigationLink({
  item,
  pathname,
  collapsed,
  touch,
  onNavigate,
}: {
  item: AppNavigationItem;
  pathname: string;
  collapsed: boolean;
  touch: boolean;
  onNavigate?: () => void;
}) {
  const active = isActiveAppRoute(pathname, item.href);
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group/nav-item flex w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none",
        touch ? "h-10" : "h-8",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
        collapsed && "w-8 justify-center px-0",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 transition-colors motion-reduce:transition-none",
          active ? "text-sidebar-foreground" : "text-muted-foreground group-hover/nav-item:text-sidebar-foreground",
        )}
      />
      <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" sideOffset={12}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function AppNavigation({
  id,
  pathname,
  collapsed = false,
  touch = false,
  onNavigate,
}: {
  id: string;
  pathname: string;
  collapsed?: boolean;
  touch?: boolean;
  onNavigate?: () => void;
}) {
  const linkProps = { pathname, collapsed, touch, onNavigate };
  return (
    <nav id={id} aria-label="Main navigation" className="flex min-h-0 flex-1 flex-col">
      <div className="workspace-list-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3">
        <ul className="w-full">
          <li>
            <AppNavigationLink item={homeNavigationItem} {...linkProps} />
          </li>
        </ul>
        {appNavigationGroups.map((group) => {
          const headingId = id + "-" + group.label.toLowerCase();
          return (
            <section key={group.label} aria-labelledby={headingId} className="flex w-full flex-col gap-1">
              <h2
                id={headingId}
                className={cn(
                  "flex h-5 items-center px-2 text-xs font-medium text-muted-foreground",
                  collapsed && "w-8 justify-center px-0",
                )}
              >
                <span className={collapsed ? "sr-only" : "truncate"}>{group.label}</span>
                {collapsed && <span aria-hidden="true" className="h-px w-5 bg-sidebar-border" />}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <AppNavigationLink item={item} {...linkProps} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <AppNavigationLink item={settingsNavigationItem} {...linkProps} />
      </div>
    </nav>
  );
}

export function AppSidebar({
  pathname,
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileOpenChange,
}: AppSidebarProps) {
  useEffect(() => {
    if (!isMobileOpen) return;
    const viewport = window.matchMedia(desktopMediaQuery);
    const closeOnDesktop = () => {
      if (viewport.matches) onMobileOpenChange(false);
    };
    closeOnDesktop();
    viewport.addEventListener("change", closeOnDesktop);
    return () => viewport.removeEventListener("change", closeOnDesktop);
  }, [isMobileOpen, onMobileOpenChange]);

  const closeMobileNavigation = () => onMobileOpenChange(false);

  return (
    <TooltipProvider delay={250}>
      <aside
        aria-label="App sidebar"
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 motion-reduce:transition-none md:flex",
          isCollapsed ? "w-14" : "w-60",
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
          {!isCollapsed && <div className="min-w-0 flex-1"><Brand /></div>}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  id="app-sidebar-toggle"
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="group/toggle size-8 shrink-0 text-muted-foreground hover:text-sidebar-foreground motion-reduce:transition-none"
                  onClick={onToggle}
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-expanded={!isCollapsed}
                  aria-controls="app-desktop-navigation"
                >
                  {isCollapsed ? (
                    <>
                      <Image
                        src="/images/medasin-logo.svg"
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 group-hover/toggle:hidden group-focus-visible/toggle:hidden"
                      />
                      <PanelLeftOpen
                        aria-hidden="true"
                        className="hidden group-hover/toggle:block group-focus-visible/toggle:block"
                      />
                    </>
                  ) : (
                    <PanelLeftClose aria-hidden="true" />
                  )}
                </Button>
              }
            />
            <TooltipContent side="right" sideOffset={12}>
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
        <AppNavigation id="app-desktop-navigation" pathname={pathname} collapsed={isCollapsed} />
      </aside>

      <Sheet open={isMobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="gap-0 overflow-hidden bg-sidebar p-0 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] text-sidebar-foreground data-[side=left]:h-dvh data-[side=left]:w-80 data-[side=left]:max-w-[calc(100vw-2rem)] motion-reduce:transition-none"
          finalFocus={() => document.getElementById(
            window.matchMedia(desktopMediaQuery).matches ? "app-sidebar-toggle" : "app-navigation-trigger",
          )}
        >
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <SheetDescription className="sr-only">Navigate between app sections.</SheetDescription>
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border px-3">
            <Brand onNavigate={closeMobileNavigation} />
            <SheetClose render={<Button type="button" variant="ghost" size="icon" className="size-10 shrink-0 text-muted-foreground" aria-label="Close navigation" />}>
              <X aria-hidden="true" />
            </SheetClose>
          </div>
          <AppNavigation id="app-mobile-navigation" pathname={pathname} touch onNavigate={closeMobileNavigation} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
