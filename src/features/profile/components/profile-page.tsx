"use client";

import { KeyRoundIcon, TriangleAlertIcon, UserRoundIcon } from "lucide-react";

import PageHeader from "@/components/shared/page-header";
import { useCurrentUserQuery } from "@/features/auth/queries/auth-query";
import { useProfileBusy } from "../queries/profile-query";
import type { CurrentUser } from "@/features/auth/type";
import { AccountDetailsCard } from "./account-details-card";
import { ProfileImageCard } from "./profile-image-card";
import { ProfileSection } from "./profile-section";
import { ChangePasswordCard } from "./change-password-card";
import { DeleteAccountCard } from "./delete-account-card";

function ProfileContent({ user }: { user: CurrentUser }) {
  const busy = useProfileBusy(user.id);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
      <PageHeader title="Profile" description="Manage your photo, account details, and security." />
      <ProfileImageCard user={user} busy={busy} />
      <ProfileSection id="account-details" icon={UserRoundIcon} title="Account details" description="The name and sign-in details on your account.">
        <AccountDetailsCard user={user} />
      </ProfileSection>
      <ProfileSection id="password" icon={KeyRoundIcon} title="Password" description="You will stay signed in here. Your other sessions will be signed out.">
        <ChangePasswordCard userId={user.id} busy={busy} />
      </ProfileSection>
      <ProfileSection id="danger-zone" icon={TriangleAlertIcon} tone="destructive" title="Danger zone" description="Permanent actions for your account.">
        <DeleteAccountCard userId={user.id} busy={busy} />
      </ProfileSection>
    </div>
  );
}

export function ProfilePage() {
  const { data } = useCurrentUserQuery();
  return data?.data ? <ProfileContent key={data.data.id} user={data.data} /> : null;
}
