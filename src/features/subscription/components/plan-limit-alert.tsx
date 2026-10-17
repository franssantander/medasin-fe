import { CircleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPlanLimitMeta, isPlanLimitError } from "../plan-limit-error";
import { coreFeatureLabels, type PlanLimitMeta } from "../types";
import { formatBytes, upgradeContactHref } from "../utils/plan-format";

function limitSummary(meta: PlanLimitMeta): string {
  if (meta.feature === "storage") {
    return `Storage usage is ${formatBytes(meta.usage)} of ${formatBytes(meta.limit)}. Your current plan does not have room for these files.`;
  }

  return `${coreFeatureLabels[meta.feature]} usage is ${meta.usage.toLocaleString()} of ${meta.limit.toLocaleString()}. Your current plan does not have room for this new item.`;
}

export function PlanLimitAlert({
  error,
  children,
}: {
  error: unknown;
  children?: ReactNode;
}) {
  if (!isPlanLimitError(error)) return null;

  const meta = getPlanLimitMeta(error);
  const contact = upgradeContactHref();

  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>Plan limit reached</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <div>
          {meta
            ? limitSummary(meta)
            : "Your current plan's limit has been reached. Review your usage before adding more."}
        </div>
        {children}
        <div>
          {meta?.feature === "storage"
            ? "Permanently deleting files from Trash frees space."
            : "Moving an item of this type to Trash frees a slot. Archived items still count."}{" "}
          <Link href="/settings/plan">Plan &amp; usage</Link>
          {" · "}
          <Link href="/settings/plan#compare">Compare plans</Link>
          {contact && (
            <>
              {" · "}
              <a href={contact}>Contact us to upgrade</a>
            </>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
