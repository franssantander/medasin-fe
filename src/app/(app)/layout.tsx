"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { useRoleGate } from "@/features/auth/hooks/use-role-gate";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { AppLoadingSkeleton } from "@/features/app-shell/components/app-loading-skeleton";
import { AppSidebar } from "@/features/app-shell/components/app-sidebar";
import { isImmersiveRoute } from "@/features/app-shell/immersive-routes";
import { useSidebar } from "@/features/app-shell/hooks/use-sidebar";
import { useAppFont } from "@/features/settings/hooks/use-app-font";
import type { CurrentUser } from "@/features/auth/type";
import { FocusSessionBar } from "@/features/focus/components/focus-session-bar";
import { FocusSessionProvider, useFocusView } from "@/features/focus/providers/focus-session-provider";
import { cn } from "@/lib/utils";

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
  const immersive = isImmersiveRoute(pathname);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div id="app-shell" className="flex h-dvh overflow-hidden bg-background">
      {!quiet && !immersive && <AppSidebar
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
          hidden={immersive}
        />
        {!immersive && <FocusSessionBar pathname={pathname} />}
        <main
          className={cn(
            "workspace-list-scrollbar relative min-h-0 flex-1 bg-app-content",
            immersive ? "overflow-hidden bg-background" : "overflow-y-auto p-4 sm:p-6",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
