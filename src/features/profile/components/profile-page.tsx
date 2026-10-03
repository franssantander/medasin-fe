"use client";

import PageHeader from "@/components/shared/page-header";
import { useCurrentUserQuery } from "@/features/auth/queries/auth-query";
import { useProfileBusy } from "../queries/profile-query";
import type { CurrentUser } from "@/features/auth/type";
import { ProfileImageCard } from "./profile-image-card";
import { ChangePasswordCard } from "./change-password-card";
import { DeleteAccountCard } from "./delete-account-card";

function ProfileContent({ user }: { user: CurrentUser }) {
  const busy = useProfileBusy(user.id);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 sm:gap-6">
      <PageHeader title="Profile" description="Manage your photo and account security." />
      <ProfileImageCard user={user} busy={busy} />
      <ChangePasswordCard userId={user.id} busy={busy} />
      <DeleteAccountCard userId={user.id} busy={busy} />
    </div>
  );
}

export function ProfilePage() {
  const { data } = useCurrentUserQuery();
  return data?.data ? <ProfileContent key={data.data.id} user={data.data} /> : null;
}
