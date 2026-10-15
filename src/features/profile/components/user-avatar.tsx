"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CurrentUser } from "@/features/auth/type";
import { imageFetchSource } from "@/lib/image/crop-image";
import { cn } from "@/lib/utils";

export function getUserDisplayName(user: CurrentUser) {
  return user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
}

export function UserAvatar({ user, className, fallbackClassName }: { user?: CurrentUser; className?: string; fallbackClassName?: string }) {
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase()
    || user?.username?.[0]?.toUpperCase() || "U";
  return (
    <Avatar className={cn("shrink-0", className)}>
      {user?.profile_image_url ? <AvatarImage src={imageFetchSource(user.profile_image_url)} alt="Profile photo" /> : null}
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}
