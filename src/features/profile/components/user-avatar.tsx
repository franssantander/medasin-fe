"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CurrentUser } from "@/features/auth/type";
import { imageFetchSource } from "@/lib/image/crop-image";
import { cn } from "@/lib/utils";

export function UserAvatar({ user, className }: { user?: CurrentUser; className?: string }) {
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase()
    || user?.username?.[0]?.toUpperCase() || "U";
  return (
    <Avatar className={cn("shrink-0", className)}>
      {user?.profile_image_url ? <AvatarImage src={imageFetchSource(user.profile_image_url)} alt="Profile photo" /> : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
