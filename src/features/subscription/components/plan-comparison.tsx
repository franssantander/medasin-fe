"use client";

import { Check, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePlanCatalogQuery } from "../queries/plan-catalog-query";
import type { CatalogPlan } from "../types";
import { formatPlanPrice } from "../utils/plan-format";

export function PlanComparison({
  currentSlug,
  renderAction,
  className,
}: {
  /** Highlights the account's plan when shown inside the app. */
  currentSlug?: string;
  renderAction?: (plan: CatalogPlan) => ReactNode;
  className?: string;
}) {
  const query = usePlanCatalogQuery();
  const plans = query.data?.data;

  if (!plans) {
    return query.isError ? (
      <Alert variant="destructive" className={className}>
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Plans could not be loaded</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{query.error.message}</span>
          <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    ) : (
      <div className={cn("@container", className)} role="status" aria-label="Loading plans">
        <div className="grid gap-4 @min-[44rem]:grid-cols-3">
          {[0, 1, 2].map((index) => <Skeleton key={index} className="h-80 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("@container", className)}>
      <ul className="grid gap-4 @min-[44rem]:grid-cols-3" aria-label="Plans">
        {plans.map((plan) => {
          const current = plan.slug === currentSlug;

          return (
            <li
              key={plan.uuid}
              aria-label={plan.name}
              aria-current={current ? "true" : undefined}
              className={cn(
                "flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-5",
                current && "border-foreground/40 ring-1 ring-foreground/20",
              )}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {current && <Badge variant="secondary">Current plan</Badge>}
                </div>
                <p className="text-2xl font-semibold tabular-nums">{formatPlanPrice(plan)}</p>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {renderAction?.(plan)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
