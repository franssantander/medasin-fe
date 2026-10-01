"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  LogOut,
  Menu,
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
import { toast } from "@/components/ui/toast";
import { useLogoutMutation } from "@/features/auth/queries/auth-query";
import { PlanNotifications } from "@/features/plans/notifications/plan-notifications";
import { GlobalSearch } from "@/features/search/global-search";
import type { CurrentUser } from "@/features/auth/type";

type AppHeaderProps = {
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
  const displayName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "User";

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
        <DropdownMenuItem onClick={() => router.push("/settings/preferences")}>
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

export function AppHeader({
  currentUser,
  isMobileNavOpen,
  onOpenMobileNav,
}: AppHeaderProps) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-2 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
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
        <Link
          href="/home"
          aria-label="Medasin home"
          className="ml-1 flex min-w-0 items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <Image
            src="/images/medasin-logo.svg"
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0"
          />
          <span className="hidden truncate font-garamond text-lg font-semibold min-[400px]:inline">
            Medasin
          </span>
        </Link>
        <GlobalSearch userId={currentUser?.id} />
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3">
        <PlanNotifications userId={currentUser?.id} />
        <ProfileMenu user={currentUser} />
      </div>
    </header>
  );
}
