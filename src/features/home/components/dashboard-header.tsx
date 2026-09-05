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
