import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsNavigation } from "@/features/settings/components/settings-navigation";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid w-full items-start gap-6 md:grid-cols-[15rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside
        className="min-w-0 md:sticky"
        aria-label="Settings sidebar"
      >
        <Card className="gap-0 py-0">
          <CardHeader className="border-b p-5 sm:p-6">
            <CardDescription className="text-xs font-semibold uppercase tracking-widest">
              Workspace settings
            </CardDescription>
            <CardTitle className="text-xl font-bold tracking-tight">
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            <SettingsNavigation />
          </CardContent>
        </Card>
      </aside>
      <main className="grid min-w-0 content-start">{children}</main>
    </div>
  );
}
