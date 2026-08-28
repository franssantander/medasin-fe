"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  LoaderCircle,
  LogOut,
  PanelLeft,
  PanelRight,
  Settings,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { useLogoutMutation } from "@/features/auth/queries/auth-query";
import type { CurrentUser } from "@/features/auth/type";
import { cn } from "@/lib/utils";
import {
  dashboardNavigationItems,
  isActiveDashboardRoute,
} from "./dashboard-navigation";

type DashboardSidebarProps = {
  pathname: string;
  currentUser?: CurrentUser;
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

function getInitials(user?: CurrentUser) {
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`;
  return initials || user?.username?.[0]?.toUpperCase() || "U";
}

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
  return (
    <nav aria-label="Dashboard navigation" className="flex flex-col gap-1">
      {dashboardNavigationItems.map((item) => {
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
              "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-sidebar-foreground/50 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active &&
                "bg-white border text-sidebar-accent-foreground hover:text-sidebar-accent-foreground hover:bg-white font-semibold",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileMenu({
  user,
  collapsed = false,
}: {
  user?: CurrentUser;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const { mutate: logout, isPending } = useLogoutMutation();
  const displayName = user?.full_name || user?.username || "User";

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast.add({
          type: "success",
          description: "You have been logged out.",
        });
        router.replace("/login");
        router.refresh();
      },
      onError: (error) => {
        toast.add({
          type: "error",
          description: error.message || "Unable to log out. Please try again.",
        });
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Open account menu for ${displayName}`}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-popup-open:bg-sidebar-accent",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {getInitials(user)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {displayName}
              </span>
              {user?.email && (
                <span className="block truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              )}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <div className="min-w-0 px-2.5 py-2">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {user?.email && (
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserRound />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={isPending}
          closeOnClick={false}
          onClick={handleLogout}
        >
          {isPending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
          {isPending ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardSidebar({
  pathname,
  currentUser,
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
        <div className="border-t border-sidebar-border p-3">
          <ProfileMenu user={currentUser} collapsed={isCollapsed} />
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
          <div className="border-t border-sidebar-border p-3">
            <ProfileMenu user={currentUser} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
