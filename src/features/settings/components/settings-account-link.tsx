"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCurrentUserQuery } from "@/features/auth/queries/auth-query";
import { getUserDisplayName, UserAvatar } from "@/features/profile/components/user-avatar";

export function SettingsAccountLink() {
  const { data } = useCurrentUserQuery();
  const user = data?.data;
  if (!user) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 text-xs font-medium text-muted-foreground">Account</p>
      <Link
        href="/profile"
        className="group/account flex min-w-0 items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserAvatar user={user} className="size-9" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{getUserDisplayName(user)}</span>
          <span className="truncate text-xs text-muted-foreground">Profile and security</span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/account:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
