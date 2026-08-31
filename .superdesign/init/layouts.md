# Shared Layouts

## `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { EB_Garamond, Spectral, Manrope } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/toast";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

const ebGaramond = EB_Garamond({
  variable: "--font-garamond-sans",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Medasin",
    template: "%s | Medasin",
  },
  description:
    "Medasin is a calm productivity app that helps you organize your tasks, build habits, focus deeply, and reflect daily.",
  openGraph: {
    title: "Medasin",
    description:
      "Medasin is a calm productivity app that helps you organize your tasks, build habits, focus deeply, and reflect daily.",
    type: "website",
    locale: "en_US",
    siteName: "Medasin",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable}  ${spectral.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## `src/app/(app)/layout.tsx`

```tsx
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
```

## `src/features/home/components/dashboard-header.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  LoaderCircle,
  LogOut,
  Menu,
  SearchIcon,
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { toast } from "@/components/ui/toast";
import { useLogoutMutation } from "@/features/auth/queries/auth-query";
import type { CurrentUser } from "@/features/auth/type";

type DashboardHeaderProps = {
  currentUser?: CurrentUser;
  isMobileNavOpen: boolean;
  onOpenMobileNav: () => void;
};

function getInitials(user?: CurrentUser) {
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`;
  return initials || user?.username?.[0]?.toUpperCase() || "U";
}

function ProfileMenu({ user }: { user?: CurrentUser }) {
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
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:opacity-90"
      >
        {getInitials(user)}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
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

export function DashboardHeader({
  currentUser,
  isMobileNavOpen,
  onOpenMobileNav,
}: DashboardHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-2 sm:px-6">
      <div className="w-full flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          aria-expanded={isMobileNavOpen}
        >
          <Menu />
        </Button>
        <div className="flex w-full md:max-w-xs flex-col gap-6">
          <InputGroup>
            <InputGroupInput placeholder="Search..." />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Button size="icon-sm" variant="outline" aria-label="Notifications">
          <Bell />
        </Button>
        <ProfileMenu user={currentUser} />
      </div>
    </header>
  );
}
```

## `src/features/home/components/dashboard-sidebar.tsx`

```tsx
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
```

## `src/features/home/components/dashboard-navigation.ts`

```tsx
import {
  Archive,
  BookHeart,
  BookOpen,
  CirclePile,
  Home,
  KanbanSquare,
  NotebookPen,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const dashboardHomeItem: DashboardNavigationItem = {
  label: "Home",
  href: "/home",
  icon: Home,
};

export const dashboardNavigationGroups: {
  label: string;
  items: DashboardNavigationItem[];
}[] = [
  {
    label: "Core",
    items: [
      { label: "Projects", href: "/projects", icon: Target },
      { label: "Areas", href: "/areas", icon: CirclePile },
      { label: "Resources", href: "/resources", icon: BookOpen },
      { label: "Archives", href: "/archives", icon: Archive },
    ],
  },
  {
    label: "Utilities",
    items: [
      { label: "Board", href: "/board", icon: KanbanSquare },
      { label: "Pomodoro Timer", href: "/pomodoro", icon: Timer },
      { label: "Notes", href: "/notes", icon: NotebookPen },
      { label: "Journal", href: "/journal", icon: BookHeart },
    ],
  },
];

export const dashboardNavigationItems: DashboardNavigationItem[] = [
  dashboardHomeItem,
  ...dashboardNavigationGroups.flatMap((group) => group.items),
];

export function isActiveDashboardRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getDashboardTitle(pathname: string) {
  return (
    dashboardNavigationItems.find((item) =>
      isActiveDashboardRoute(pathname, item.href),
    )?.label ?? "Home"
  );
}
```

## `src/components/shared/page-header.tsx`

```tsx
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  action?: ReactNode;
};

export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-4">
      <h1 className="text-lg font-bold">{title}</h1>
      {action && (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      )}
    </header>
  );
}
```
