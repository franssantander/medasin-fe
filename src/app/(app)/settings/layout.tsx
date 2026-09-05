import type { ReactNode } from "react";
import { SettingsNavigation } from "@/features/settings/components/settings-navigation";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <header>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Workspace settings
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>
      <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
        <SettingsNavigation />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
