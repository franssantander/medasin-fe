"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useRoleGate } from "@/features/auth/hooks/use-role-gate";
import { DashboardHeader } from "@/features/home/components/dashboard-header";
import { dashboardNavigationItems } from "@/features/home/components/dashboard-navigation";
import { DashboardSidebar } from "@/features/home/components/dashboard-sidebar";
import { useSidebar } from "@/features/home/hooks/use-sidebar";

function DashboardLoadingSkeleton() {
  return (
    <div id="dashboard-shell" className="flex h-dvh overflow-hidden">
      <div className="hidden h-full w-64 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Skeleton className="h-8 w-32" />
        <div className="flex flex-col gap-2 pt-2">
          {dashboardNavigationItems.map((item) => (
            <Skeleton key={item.href} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="mt-auto h-12 w-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4 sm:px-6">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { isReady, currentUser } = useRoleGate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { isCollapsed, toggleSidebar } = useSidebar();

  if (!isReady) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div id="dashboard-shell" className="flex h-dvh overflow-hidden bg-background">
      <DashboardSidebar
        pathname={pathname}
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        isMobileOpen={isMobileNavOpen}
        onMobileOpenChange={setIsMobileNavOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          currentUser={currentUser}
          isMobileNavOpen={isMobileNavOpen}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
