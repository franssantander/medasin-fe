import { Card, CardContent } from "@/components/ui/card";
import type { CurrentUser } from "@/features/auth/type";
import { getUserDisplayName } from "./user-avatar";

export function AccountDetailsCard({ user }: { user: CurrentUser }) {
  const rows = [
    { label: "Name", value: getUserDisplayName(user) },
    { label: "Username", value: `@${user.username}` },
    { label: "Email", value: user.email },
  ];

  return (
    <Card className="py-0">
      <CardContent className="px-0">
        <dl className="divide-y">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:gap-4">
              <dt className="text-sm text-muted-foreground sm:w-32 sm:shrink-0">{row.label}</dt>
              <dd className="min-w-0 break-all font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
