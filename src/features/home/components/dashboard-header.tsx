"use client";

import { Bell, Menu, Moon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDashboardTitle } from "./dashboard-navigation";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

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
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
      <div className="w-full">
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
        <div className="flex w-full max-w-xs flex-col gap-6">
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
      <div className="space-x-3">
        <Button size="icon-sm" variant="outline">
          <Bell />
        </Button>
      </div>
    </header>
  );
}
