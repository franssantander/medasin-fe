"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useRoleGate } from "@/features/auth/hooks/use-role-gate";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { appNavigationItems } from "@/features/app-shell/components/app-navigation";
import { AppSidebar } from "@/features/app-shell/components/app-sidebar";
import { useSidebar } from "@/features/app-shell/hooks/use-sidebar";
import { useAppFont } from "@/features/settings/hooks/use-app-font";
import type { CurrentUser } from "@/features/auth/type";
import { FocusSessionBar } from "@/features/focus/components/focus-session-bar";
import { FocusSessionProvider, useFocusView } from "@/features/focus/providers/focus-session-provider";

function AppLoadingSkeleton() {
  return (
    <div id="app-shell" className="flex h-dvh overflow-hidden">
      <div className="hidden h-full w-64 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Skeleton className="h-8 w-32" />
        <div className="flex flex-col gap-2 pt-2">
          {appNavigationItems.map((item) => (
            <Skeleton key={item.href} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="mt-auto h-12 w-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4 sm:px-6">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="relative min-h-0 flex-1 space-y-3 overflow-y-auto bg-app-content p-4 sm:p-6">
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
  const { isReady, currentUser } = useRoleGate();
  useAppFont(currentUser?.id, currentUser?.font_family);

  if (!isReady || !currentUser) return <AppLoadingSkeleton />;

  return (
    <FocusSessionProvider key={currentUser.id}>
      <AppShell currentUser={currentUser}>{children}</AppShell>
    </FocusSessionProvider>
  );
}

function AppShell({ currentUser, children }: { currentUser: CurrentUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const { quiet } = useFocusView();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div id="app-shell" className="flex h-dvh overflow-hidden bg-background">
      {!quiet && <AppSidebar
        pathname={pathname}
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        isMobileOpen={isMobileNavOpen}
        onMobileOpenChange={setIsMobileNavOpen}
      />}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          currentUser={currentUser}
          isMobileNavOpen={isMobileNavOpen}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          quiet={quiet}
        />
        <FocusSessionBar pathname={pathname} />
        <main className="workspace-list-scrollbar relative min-h-0 flex-1 overflow-y-auto bg-app-content p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
