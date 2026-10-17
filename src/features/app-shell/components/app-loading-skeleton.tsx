"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSidebar } from "../hooks/use-sidebar";
import { appNavigationGroups } from "./app-navigation";
import { isImmersiveRoute } from "../immersive-routes";
import { renderRouteSkeleton } from "./route-skeletons";

// Varied label widths read as text rather than a stack of identical bars.
const labelWidths = ["w-16", "w-20", "w-14", "w-24", "w-12", "w-[4.5rem]", "w-[3.75rem]"];

function SidebarRow({ collapsed, index }: { collapsed: boolean; index: number }) {
  return (
    <div className={cn("flex h-8 items-center gap-2.5 px-2", collapsed && "justify-center px-0")}>
      <Skeleton className="size-4 shrink-0 rounded" />
      {!collapsed && <Skeleton className={cn("h-3", labelWidths[index % labelWidths.length])} />}
    </div>
  );
}

function SidebarSkeleton({ collapsed }: { collapsed: boolean }) {
  let index = 0;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3", collapsed && "justify-center px-2")}>
        <Image src="/images/medasin-logo.svg" alt="" width={28} height={28} className="size-7 shrink-0" priority />
        {!collapsed && (
          <>
            <span className="flex-1 truncate font-garamond text-lg font-semibold tracking-tight">Medasin</span>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </>
        )}
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col gap-5 px-3 py-3", collapsed && "px-2")}>
        <SidebarRow collapsed={collapsed} index={index++} />
        {appNavigationGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
            ) : (
              <Skeleton className="mx-2 mb-1 h-2.5 w-12" />
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <SidebarRow key={item.href} collapsed={collapsed} index={index++} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={cn("shrink-0 border-t border-sidebar-border p-3", collapsed && "px-2")}>
        <SidebarRow collapsed={collapsed} index={2} />
      </div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-2 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Skeleton className="size-10 shrink-0 rounded-md md:hidden" />
        <Image src="/images/medasin-logo.svg" alt="" width={28} height={28} className="ml-1 size-7 shrink-0 md:hidden" priority />
        <Skeleton className="ml-auto size-10 shrink-0 rounded-md md:hidden" />
        <div className="hidden h-9 w-full max-w-[440px] items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 md:flex">
          <Skeleton className="size-4 shrink-0 rounded" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="ml-auto h-5 w-14 rounded" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="hidden h-8 w-32 rounded-lg sm:block" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-full" />
      </div>
    </div>
  );
}

function PageContentSkeleton() {
  return (
    <div className="grid w-full min-w-0 gap-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
      <div className="divide-y rounded-xl border bg-card">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Skeleton className={cn("h-3.5", ["w-48", "w-36", "w-56", "w-40", "w-44"][row])} />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="hidden h-3 w-16 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ImmersiveSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col" aria-hidden="true">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="mx-auto grid w-full max-w-2xl gap-4 px-6 py-12">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <div className="mt-6 grid gap-3">
          {["w-full", "w-11/12", "w-full", "w-4/5", "w-2/3"].map((width, line) => (
            <Skeleton key={line} className={cn("h-3.5", width)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mirrors the app shell and the requested page while the current user loads. */
export function AppLoadingSkeleton() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const immersive = isImmersiveRoute(pathname);

  return (
    <div
      id="app-shell"
      role="status"
      aria-label="Loading your workspace"
      aria-busy="true"
      className="flex h-dvh overflow-hidden bg-background [&_[data-slot=skeleton]]:bg-foreground/[0.07] [&_[data-slot=skeleton]]:motion-reduce:animate-none"
    >
      <span className="sr-only">Loading your workspace…</span>
      {immersive ? (
        <ImmersiveSkeleton />
      ) : (
        <>
          <SidebarSkeleton collapsed={isCollapsed} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-hidden="true">
            <HeaderSkeleton />
            <div className="relative min-h-0 flex-1 overflow-hidden bg-app-content p-4 sm:p-6">
              {renderRouteSkeleton(pathname) ?? <PageContentSkeleton />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
