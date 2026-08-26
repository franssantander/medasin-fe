"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDashboardTitle } from "./dashboard-navigation";

type DashboardHeaderProps = {
  pathname: string;
  isMobileNavOpen: boolean;
  onOpenMobileNav: () => void;
};

export function DashboardHeader({
  pathname,
  isMobileNavOpen,
  onOpenMobileNav,
}: DashboardHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
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
      <h1 className="truncate text-base font-semibold sm:text-lg">
        {getDashboardTitle(pathname)}
      </h1>
    </header>
  );
}
