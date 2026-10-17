"use client";

import { Tabs } from "@base-ui/react/tabs";
import { Bell, CalendarDays, Menu, PanelLeftClose, Search, Settings } from "lucide-react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useSyncExternalStore } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  appNavigationGroups,
  homeNavigationItem,
  type AppNavigationItem,
} from "@/features/app-shell/components/app-navigation";
import { cn } from "@/lib/utils";
import { useSlidingHighlight } from "./use-sliding-highlight";

/* Static copies of app-sidebar.tsx and app-header.tsx. The sidebar items that have a preview are tabs. */

const itemClass =
  "group/nav-item flex h-8 w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none";
const idleItemClass = "text-sidebar-foreground/70";
// The active background is one shared highlight that slides between items (see PreviewSidebar).
const activeItemClass = "data-active:font-medium data-active:text-sidebar-foreground";

function ItemContent({ item }: { item: AppNavigationItem }) {
  const Icon = item.icon;
  return (
    <>
      <Icon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground group-hover/nav-item:text-sidebar-foreground group-data-active/nav-item:text-sidebar-foreground"
      />
      <span className="truncate">{item.label}</span>
    </>
  );
}

function StaticItem({ item }: { item: AppNavigationItem }) {
  return (
    <span aria-hidden="true" className={cn(itemClass, idleItemClass)}>
      <ItemContent item={item} />
    </span>
  );
}

export function PreviewSidebar({ previewLabels, value }: { previewLabels: string[]; value: string }) {
  const { register, box } = useSlidingHighlight(value, "y");
  const navItem = (item: AppNavigationItem) =>
    previewLabels.includes(item.label) ? (
      <Tabs.Tab
        key={item.label}
        ref={register(item.label)}
        value={item.label}
        className={cn(
          itemClass,
          idleItemClass,
          activeItemClass,
          "relative hover:text-sidebar-foreground not-data-active:hover:bg-sidebar-accent/70",
        )}
      >
        <ItemContent item={item} />
      </Tabs.Tab>
    ) : (
      <StaticItem key={item.label} item={item} />
    );

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="flex h-9 min-w-0 flex-1 items-center gap-2 px-0.5">
          <Image src="/images/medasin-logo.svg" alt="" width={28} height={28} className="size-7 shrink-0" />
          <span className="truncate font-garamond text-lg font-semibold tracking-tight">Medasin</span>
        </div>
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center text-muted-foreground">
          <PanelLeftClose className="size-4" />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <Tabs.List aria-label="Preview a Medasin screen" className="relative flex min-h-0 flex-1 flex-col gap-5 px-3 py-3">
          {box && (
            <m.span
              aria-hidden="true"
              data-slot="preview-nav-highlight"
              className="absolute inset-x-3 top-0 rounded-md bg-sidebar-accent"
              initial={false}
              animate={{ y: box.offset, height: box.size }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}
          {navItem(homeNavigationItem)}
          {appNavigationGroups.map((group) => (
            <div key={group.label} className="flex w-full flex-col gap-1">
              <span aria-hidden="true" className="flex h-5 items-center px-2 text-xs font-medium text-muted-foreground">
                {group.label}
              </span>
              <div className="flex flex-col gap-0.5">
                {group.items.map(navItem)}
              </div>
            </div>
          ))}
        </Tabs.List>
        <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
          <StaticItem item={{ label: "Settings", href: "/settings", icon: Settings }} />
        </div>
      </div>
    </aside>
  );
}

/* The header date only exists in the browser, like HeaderDate in app-header.tsx. */
const subscribe = () => () => {};
const clientDate = () => {
  const today = new Date();
  const short = new Intl.DateTimeFormat("en-US", { month: "short" }).format(today);
  const long = new Intl.DateTimeFormat("en-US", { month: "long" }).format(today);
  return `${short === long ? short : `${short}.`} ${today.getDate()}, ${today.getFullYear()}`;
};
const serverDate = () => null;

export function PreviewHeader() {
  const date = useSyncExternalStore(subscribe, clientDate, serverDate);

  return (
    <header
      aria-hidden="true"
      className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-2 sm:px-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="grid size-11 place-items-center md:hidden">
          <Menu className="size-4" />
        </span>
        <span className="ml-1 flex min-w-0 items-center gap-1 md:hidden">
          <Image src="/images/medasin-logo.svg" alt="" width={28} height={28} className="size-7 shrink-0" />
          <span className="hidden truncate font-garamond text-lg font-semibold min-[400px]:inline">Medasin</span>
        </span>
        <div className="relative flex min-w-0 items-center md:w-full md:max-w-[440px]">
          <span className="grid size-10 place-items-center md:hidden">
            <Search className="size-4" />
          </span>
          <span className="hidden h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-muted/40 pr-1.5 pl-3 text-sm text-muted-foreground shadow-xs md:flex">
            <Search className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">Search everything…</span>
            <span className="flex shrink-0 items-center gap-0.5">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        {date && (
          <span className="hidden h-8 shrink-0 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-sm font-medium shadow-xs sm:inline-flex">
            <CalendarDays className="size-4 text-muted-foreground" />
            {date}
          </span>
        )}
        <Button size="icon-sm" variant="outline" tabIndex={-1}>
          <Bell />
        </Button>
        <Avatar className="size-8">
          <AvatarImage src="/images/preview-avatar.svg" alt="" />
          <AvatarFallback className="bg-neutral-950 font-semibold text-white ring-1 ring-white/10 ring-inset">SR</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
