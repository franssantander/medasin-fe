"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  CalendarDays,
  ChartNoAxesCombined,
  LoaderCircle,
  LogOut,
  Menu,
  Settings,
  UserRound,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { useLogoutMutation } from "@/features/auth/queries/auth-query";
import { PlanNotifications } from "@/features/plans/notifications/plan-notifications";
import { dateFromKey, localDateKey } from "@/features/plans/plan-time";
import { GlobalSearch } from "@/features/search/global-search";
import type { CurrentUser } from "@/features/auth/type";
import { getUserDisplayName, UserAvatar } from "@/features/profile/components/user-avatar";
import { useProfileAccountPending } from "@/features/profile/queries/profile-query";
import { cn } from "@/lib/utils";

// Initials sit on a solid black disc in both themes; the ring keeps it visible on dark backgrounds.
const blackAvatarFallback = "bg-neutral-950 font-semibold text-white ring-1 ring-inset ring-white/10";
const menuItemClassName =
  "[&_svg]:text-muted-foreground data-highlighted:[&_svg]:text-foreground";

type AppHeaderProps = {
  currentUser?: CurrentUser;
  isMobileNavOpen: boolean;
  onOpenMobileNav: () => void;
  quiet: boolean;
  /** Hides the header for immersive routes while keeping reminder toasts. */
  hidden?: boolean;
};

// Re-check once a minute so the date rolls over at midnight without a reload.
const subscribeToMinute = (onChange: () => void) => {
  const interval = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(interval);
};
const todayKeySnapshot = () => localDateKey(new Date());
const serverSnapshot = () => null;

/** "Oct. 16, 2026"; months with no shorter form (May) skip the period. */
function formatHeaderDate(date: Date) {
  const short = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  const long = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
  return `${short === long ? short : `${short}.`} ${date.getDate()}, ${date.getFullYear()}`;
}

function HeaderDate() {
  const todayKey = useSyncExternalStore(subscribeToMinute, todayKeySnapshot, serverSnapshot);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>();
  if (!todayKey) return null;

  const today = dateFromKey(todayKey);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(today);
  const fullDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(today);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setMonth(today);
      }}
    >
      <PopoverTrigger
        aria-label={`${formatHeaderDate(today)}, open calendar`}
        title={`${weekday}, ${fullDate}`}
        className="hidden h-8 shrink-0 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-sm font-medium shadow-xs transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted motion-reduce:transition-none sm:inline-flex"
      >
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
        <time dateTime={todayKey}>{formatHeaderDate(today)}</time>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 max-w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-xl p-0">
        <div className="border-b px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">{weekday}</p>
          <PopoverTitle className="text-lg font-semibold">{fullDate}</PopoverTitle>
        </div>
        <Calendar
          month={month}
          onMonthChange={setMonth}
          className="w-full p-4 [--cell-size:--spacing(10)]"
          classNames={{
            root: "rdp-root w-full",
            weekday: "rdp-weekday flex-1 text-center text-xs font-medium text-muted-foreground select-none",
            week: "rdp-week mt-1 flex w-full",
            day: "rdp-day flex h-10 flex-1 items-center justify-center rounded-lg text-sm tabular-nums select-none",
            today: "rdp-today bg-primary font-semibold text-primary-foreground",
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={!month || localDateKey(month).slice(0, 7) === todayKey.slice(0, 7)}
            onClick={() => setMonth(today)}
          >
            Today
          </Button>
          <Link
            href="/plans"
            className={buttonVariants({ variant: "outline", size: "sm" })}
            onClick={() => setOpen(false)}
          >
            Open Plans
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProfileMenu({ user }: { user?: CurrentUser }) {
  const router = useRouter();
  const { mutate: logout, isPending } = useLogoutMutation();
  const isAccountPending = useProfileAccountPending(user?.id);
  const displayName = (user && getUserDisplayName(user)) || "User";

  const handleLogout = () => {
    if (isPending || isAccountPending) return;
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
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-foreground/15 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:ring-2 data-popup-open:ring-foreground/25 motion-reduce:transition-none"
      >
        <UserAvatar user={user} className="size-8" fallbackClassName={blackAvatarFallback} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-1.5">
        <div className="flex min-w-0 items-center gap-3 px-2 py-2">
          <UserAvatar user={user} className="size-10" fallbackClassName={cn(blackAvatarFallback, "text-sm")} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {user?.email && (
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuGroup>
          <DropdownMenuItem className={menuItemClassName} onClick={() => router.push("/profile")}>
            <UserRound />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className={menuItemClassName} onClick={() => router.push("/settings/preferences")}>
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem className={menuItemClassName} onClick={() => router.push("/settings/plan")}>
            <ChartNoAxesCombined />
            Plan &amp; usage
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          destructive
          disabled={isPending || isAccountPending}
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
  quiet,
  hidden = false,
}: AppHeaderProps) {
  const concealed = quiet || hidden;

  return (
    <header inert={concealed} aria-hidden={concealed || undefined} className={cn("relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-2 sm:px-6", concealed && "hidden")}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          id="app-navigation-trigger"
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 md:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          aria-expanded={isMobileNavOpen}
          aria-controls="app-mobile-navigation"
        >
          <Menu aria-hidden="true" />
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
            loading="eager"
          />
          <span className="hidden truncate font-garamond text-lg font-semibold min-[400px]:inline">
            Medasin
          </span>
        </Link>
        {!concealed && <GlobalSearch userId={currentUser?.id} />}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <HeaderDate />
        <PlanNotifications userId={currentUser?.id} toastsEnabled={!quiet} />
        <ProfileMenu user={currentUser} />
      </div>
    </header>
  );
}
