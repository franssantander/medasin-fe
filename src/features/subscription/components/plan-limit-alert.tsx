import { CircleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPlanLimitMeta, isPlanLimitError } from "../plan-limit-error";
import { coreFeatureLabels } from "../types";

export function PlanLimitAlert({
  error,
  children,
}: {
  error: unknown;
  children?: ReactNode;
}) {
  if (!isPlanLimitError(error)) return null;

  const meta = getPlanLimitMeta(error);

  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>Plan limit reached</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <div>
          {meta
            ? `${coreFeatureLabels[meta.feature]} usage is ${meta.usage.toLocaleString()} of ${meta.limit.toLocaleString()}. Your current plan does not have room for this new item.`
            : "Your current plan's Core limit has been reached. Review your usage before creating more items."}
        </div>
        {children}
        <div>
          Moving an item of this type to Trash frees a slot. Archived items still count.{" "}
          <Link href="/settings/plan">Plan &amp; usage</Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}
