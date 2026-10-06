"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, Settings, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
      className="flex h-11 min-w-0 items-center gap-2 overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <Image
        src="/images/medasin-logo.svg"
        alt=""
        width={34}
        height={34}
        className="size-8 shrink-0"
        loading="eager"
      />
      <span className="truncate font-garamond text-xl font-semibold">
        Medasin
      </span>
    </Link>
  );
}

function AppNavigationLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: AppNavigationItem;
  pathname: string;
  collapsed: boolean;
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
        buttonVariants({ variant: active ? "secondary" : "ghost" }),
        "h-11 w-full justify-start gap-2.5 rounded-md px-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:translate-y-0 motion-reduce:transition-none md:h-9",
        !active && "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon aria-hidden="true" />
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
  onNavigate,
}: {
  id: string;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav id={id} aria-label="Main navigation" className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "workspace-list-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-3 py-3",
          collapsed && "px-2",
        )}
      >
        <ul>
          <li>
            <AppNavigationLink
              item={homeNavigationItem}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </li>
        </ul>
        {appNavigationGroups.map((group) => {
          const headingId = id + "-" + group.label.toLowerCase();
          return (
            <section key={group.label} aria-labelledby={headingId} className="flex flex-col gap-2">
              {collapsed && <Separator className="mx-2 w-auto" />}
              <h2
                id={headingId}
                className={cn(
                  "px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase",
                  collapsed && "sr-only",
                )}
              >
                {group.label}
              </h2>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <AppNavigationLink
                      item={item}
                      pathname={pathname}
                      collapsed={collapsed}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
        <Separator />
        <div className={cn("p-3", collapsed && "px-2")}>
          <AppNavigationLink
            item={settingsNavigationItem}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </div>
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
          isCollapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-14 shrink-0 flex-col">
          <div className={cn("flex min-h-0 flex-1 items-center gap-2 px-3", isCollapsed && "justify-center px-2")}>
            {!isCollapsed && <div className="min-w-0 flex-1"><Brand /></div>}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    id="app-sidebar-toggle"
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 motion-reduce:transition-none"
                    onClick={onToggle}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded={!isCollapsed}
                    aria-controls="app-desktop-navigation"
                  >
                    {isCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
                  </Button>
                }
              />
              <TooltipContent side="right" sideOffset={12}>
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>
          <Separator />
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
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 px-4">
            <Brand onNavigate={closeMobileNavigation} />
            <SheetClose render={<Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Close navigation" />}>
              <X aria-hidden="true" />
            </SheetClose>
          </div>
          <Separator />
          <AppNavigation id="app-mobile-navigation" pathname={pathname} onNavigate={closeMobileNavigation} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
