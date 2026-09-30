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
    <div className="grid w-full items-start gap-4 md:h-full md:min-h-[28rem] md:grid-cols-[15rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:items-stretch lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside
        className="min-h-0 min-w-0 md:flex"
        aria-label="Settings sidebar"
      >
        <Card className="min-h-0 gap-0 py-0 md:flex-1">
          <CardHeader className="shrink-0 border-b p-5 sm:p-6">
            <CardTitle>
              <h1>Settings</h1>
            </CardTitle>
            <CardDescription>Manage your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 p-2 sm:p-3 md:flex-1 md:overflow-y-auto">
            <SettingsNavigation />
          </CardContent>
        </Card>
      </aside>
      <section
        className="min-h-0 min-w-0 md:flex"
        aria-label="Settings content"
      >
        {children}
      </section>
    </div>
  );
}
