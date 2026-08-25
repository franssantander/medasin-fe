"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/features/home/hooks/use-sidebar";
import { useRoleGate } from "@/features/auth/hooks/use-role-gate";

function HomeLoadingSkeleton() {
  return (
    <div id="dashboard-shell" className="flex h-screen overflow-hidden">
      <div className="hidden h-full w-64 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Skeleton className="h-7 w-32" />
        <div className="flex flex-col gap-2 pt-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="size-8 rounded-full" />
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isReady, currentUser } = useRoleGate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { isCollapsed, toggleSidebar } = useSidebar();

  if (!isReady) {
    return <HomeLoadingSkeleton />;
  }

  return (
    <div id="dashboard-shell" className="flex h-screen overflow-hidden">
      {/* <DashboardSidebar
        currentUser={currentUser}
        isCollapsed={isCollapsed}
        isMobileNavOpen={isMobileNavOpen}
        onMobileNavOpenChange={setIsMobileNavOpen}
      /> */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* <DashboardHeader
          userId={currentUser?.id}
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          onMobileMenuClick={() => setIsMobileNavOpen(true)}
        /> */}
        <main className="bg-[#f9f9f9] dark:bg-[#0a0a0a] min-h-0 flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
